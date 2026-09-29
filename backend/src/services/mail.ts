/**
 * Email sending via nodemailer (SMTP).
 *
 * SMTP settings come from env only: SMTP_HOST, SMTP_PORT, SMTP_USER,
 * SMTP_PASS, SMTP_FROM. Links point at FRONTEND_URL (defaults to CORS_ORIGIN).
 *
 * Fallback when SMTP is unconfigured:
 * - non-production: log the link to the server console (dev convenience);
 * - production: log an error server-side and throw a generic ApiError.
 *   The token is NEVER included in production logs or client responses.
 */
import nodemailer from "nodemailer";
import { config } from "../config.js";
import { ApiError } from "../middleware/errors.js";

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export function smtpSettings(): SmtpSettings | null {
  if (!config.smtpHost || !config.smtpFrom) return null;
  return {
    host: config.smtpHost,
    port: config.smtpPort,
    user: config.smtpUser,
    pass: config.smtpPass,
    from: config.smtpFrom,
  };
}

/** Test-only: inject a fake transport (bypasses SMTP config entirely). */
let transportOverride: { sendMail(opts: unknown): Promise<unknown> } | null = null;
export function __setMailTransport(
  t: { sendMail(opts: unknown): Promise<unknown> } | null,
): void {
  transportOverride = t;
}

function getTransport(settings: SmtpSettings): { sendMail(opts: unknown): Promise<unknown> } {
  if (transportOverride) return transportOverride;
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465, // implicit TLS on the standard SMTPS port
    auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

function verificationContent(link: string): EmailContent {
  return {
    subject: "Verify your email",
    text:
      "Welcome! Click the link below to verify your email address:\n\n" +
      `${link}\n\n` +
      "This link expires in 24 hours. If you didn't sign up, you can ignore this email.",
    html:
      "<p>Welcome!</p>" +
      "<p>Click the link below to verify your email address:</p>" +
      `<p><a href="${escapeHtml(link)}">Verify email</a></p>` +
      "<p>This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>",
  };
}

function resetContent(link: string): EmailContent {
  return {
    subject: "Reset your password",
    text:
      "You requested a password reset. Use the link below to choose a new password " +
      "(valid for 1 hour):\n\n" +
      `${link}\n\n` +
      "If you didn't request this, you can ignore this email.",
    html:
      "<p>You requested a password reset.</p>" +
      "<p>Use the link below to choose a new password (valid for 1 hour):</p>" +
      `<p><a href="${escapeHtml(link)}">Reset password</a></p>` +
      "<p>If you didn't request this, you can ignore this email.</p>",
  };
}

/**
 * Send one email. Dev convenience: without SMTP configured and outside
 * production, the link is logged to the console instead of sent.
 * Throws a generic 503 (never carrying the token) in production when
 * SMTP is unconfigured.
 */
async function sendMail(to: string, content: EmailContent, kind: string): Promise<void> {
  const settings = smtpSettings();
  if (transportOverride || settings) {
    const transport = transportOverride ?? getTransport(settings as SmtpSettings);
    await transport.sendMail({
      from: settings?.from ?? config.smtpFrom,
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    return;
  }
  if (config.nodeEnv === "production") {
    // eslint-disable-next-line no-console
    console.error(`[mail] SMTP not configured — cannot send ${kind} email to ${to}`);
    throw new ApiError(503, "EMAIL_UNAVAILABLE", "Email service is not available");
  }
  // eslint-disable-next-line no-console
  console.log(`[mail] SMTP not configured — ${kind} link for ${to}:\n${extractLink(content)}`);
}

/** The clickable link is the important part for dev console output. */
function extractLink(content: EmailContent): string {
  const match = /https?:\/\/\S+/.exec(content.text);
  return match ? match[0] : content.text;
}

export function verificationLink(token: string): string {
  return `${config.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

export function passwordResetLink(token: string): string {
  return `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(to: string, link: string): Promise<void> {
  await sendMail(to, verificationContent(link), "verification");
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  await sendMail(to, resetContent(link), "password-reset");
}
