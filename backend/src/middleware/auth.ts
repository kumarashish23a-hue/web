import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AdminRole } from "ai-discover-shared";
import { config } from "../config.js";
import { query } from "../db.js";
import { forbidden, unauthorized } from "./errors.js";

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  adminRole: AdminRole | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      adminUserId?: string; // admin_users.id, set when the user has an admin role
    }
  }
}

const ROLE_RANK: Record<AdminRole, number> = {
  verifier: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

export function roleAtLeast(role: AdminRole | null, minimum: AdminRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Bearer access-JWT -> req.user (includes current admin role from DB). */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw unauthorized();
    }
    const token = header.slice("Bearer ".length).trim();
    let payload: { sub?: string; typ?: string };
    try {
      payload = jwt.verify(token, config.jwtAccessSecret) as { sub?: string; typ?: string };
    } catch {
      throw unauthorized("Invalid or expired token");
    }
    if (!payload.sub || payload.typ !== "access") throw unauthorized("Invalid token");
    const { rows } = await query(
      `SELECT u.id, u.email, u.email_verified, au.id AS admin_user_id, au.role AS admin_role
         FROM users u LEFT JOIN admin_users au ON au.user_id = u.id
        WHERE u.id = $1`,
      [payload.sub],
    );
    if (rows.length === 0) throw unauthorized("User not found");
    const row = rows[0] as Record<string, unknown>;
    req.user = {
      id: String(row.id),
      email: String(row.email),
      emailVerified: Boolean(row.email_verified),
      adminRole: (row.admin_role as AdminRole | null) ?? null,
    };
    if (row.admin_user_id) req.adminUserId = String(row.admin_user_id);
    next();
  } catch (err) {
    next(err);
  }
}

/** Role gate. Pass explicit roles, e.g. requireRole("admin","super_admin"). */
export function requireRole(...roles: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!req.user.adminRole || !roles.includes(req.user.adminRole)) {
      next(forbidden("Insufficient permissions"));
      return;
    }
    next();
  };
}

/** Optional auth: populates req.user when a valid bearer token is present. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    await requireAuth(req, _res as Response, (err?: unknown) => {
      // Invalid tokens on optional routes are ignored, not fatal.
      if (err) {
        req.user = undefined;
        req.adminUserId = undefined;
      }
      next();
    });
    return;
  }
  next();
}
