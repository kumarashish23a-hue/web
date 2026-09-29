import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { config } from "../config.js";
import { query } from "../db.js";
import { badRequest, conflict, notFound, unauthorized } from "../middleware/errors.js";
import { camelRow } from "../utils/case.js";
import type { User } from "ai-discover-shared";

const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** 32 random bytes as hex (64 chars) — used for email/reset tokens. */
export function randomToken(): string {
  return randomBytes(32).toString("hex");
}

export function sha256Hex(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ typ: "access" }, config.jwtAccessSecret, {
    subject: userId,
    expiresIn: "1h",
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ typ: "refresh" }, config.jwtRefreshSecret, {
    subject: userId,
    expiresIn: "30d",
  });
}

export function verifyRefreshToken(token: string): string {
  const payload = jwt.verify(token, config.jwtRefreshSecret) as { sub?: string; typ?: string };
  if (!payload.sub || payload.typ !== "refresh") throw unauthorized("Invalid refresh token");
  return payload.sub;
}

export function refreshCookieOptions(): { httpOnly: boolean; sameSite: "lax"; secure: boolean; path: string; maxAge: number } {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    path: "/api/v1/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

function toUser(row: Record<string, unknown>): User {
  return camelRow<User>(row);
}

export async function signupUser(email: string, password: string, displayName?: string): Promise<User> {
  const lower = email.toLowerCase();
  const existing = await query("SELECT id FROM users WHERE email = $1", [lower]);
  if (existing.rows.length > 0) throw conflict("An account with this email already exists", "EMAIL_TAKEN");

  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, email_verified, created_at, updated_at",
    [lower, passwordHash],
  );
  const user = toUser(rows[0]);
  await query("INSERT INTO profiles (id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [
    user.id,
    displayName ?? null,
  ]);
  await query(
    "INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
    [user.id],
  );
  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const lower = email.toLowerCase();
  const { rows } = await query(
    "SELECT id, email, email_verified, password_hash, created_at, updated_at FROM users WHERE email = $1",
    [lower],
  );
  if (rows.length === 0) throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  const ok = await verifyPassword(password, String(rows[0].password_hash));
  if (!ok) throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  return toUser(rows[0]);
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await query(
    "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, sha256Hex(token), expiresAt.toISOString()],
  );
  return token;
}

export async function verifyEmailToken(token: string): Promise<User> {
  const { rows } = await query(
    `SELECT id, user_id, expires_at, used_at FROM email_verification_tokens
      WHERE token_hash = $1`,
    [sha256Hex(token)],
  );
  if (rows.length === 0) throw badRequest("Invalid verification token", "INVALID_TOKEN");
  const row = rows[0];
  if (row.used_at) throw badRequest("Verification link already used", "TOKEN_USED");
  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    throw badRequest("Verification link expired", "TOKEN_EXPIRED");
  }
  await query("UPDATE email_verification_tokens SET used_at = now() WHERE id = $1", [row.id]);
  const updated = await query(
    "UPDATE users SET email_verified = true, updated_at = now() WHERE id = $1 RETURNING id, email, email_verified, created_at, updated_at",
    [row.user_id],
  );
  return toUser(updated.rows[0]);
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const { rows } = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (rows.length === 0) return null; // do not reveal whether the email exists
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [rows[0].id, sha256Hex(token), expiresAt.toISOString()],
  );
  return token;
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  const { rows } = await query(
    "SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1",
    [sha256Hex(token)],
  );
  if (rows.length === 0) throw badRequest("Invalid reset token", "INVALID_TOKEN");
  const row = rows[0];
  if (row.used_at) throw badRequest("Reset link already used", "TOKEN_USED");
  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    throw badRequest("Reset link expired", "TOKEN_EXPIRED");
  }
  const passwordHash = await hashPassword(password);
  await query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [
    passwordHash,
    row.user_id,
  ]);
  await query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [row.id]);
}

export async function getUserById(userId: string): Promise<User> {
  const { rows } = await query(
    "SELECT id, email, email_verified, created_at, updated_at FROM users WHERE id = $1",
    [userId],
  );
  if (rows.length === 0) throw notFound("User not found");
  return toUser(rows[0]);
}
