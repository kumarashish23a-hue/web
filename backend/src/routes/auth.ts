import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "ai-discover-shared";
import { config } from "../config.js";
import { asyncHandler, unauthorized } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  getUserById,
  loginUser,
  refreshCookieOptions,
  resetPasswordWithToken,
  signAccessToken,
  signRefreshToken,
  signupUser,
  verifyEmailToken,
  verifyRefreshToken,
} from "../services/auth.js";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
});

function issueTokens(res: import("express").Response, userId: string): string {
  const accessToken = signAccessToken(userId);
  res.cookie("refresh_token", signRefreshToken(userId), refreshCookieOptions());
  return accessToken;
}

authRouter.post(
  "/signup",
  authLimiter,
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const { email, password, displayName } = req.body;
    const user = await signupUser(email, password, displayName);
    // TODO: deliver this token by email. Returned in non-production only so
    // the flow is testable without an email provider.
    const verificationToken =
      config.nodeEnv === "production" ? undefined : await createEmailVerificationToken(user.id);
    const accessToken = issueTokens(res, user.id);
    res.status(201).json({ data: { user, accessToken, verificationToken } });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await loginUser(email, password);
    const accessToken = issueTokens(res, user.id);
    res.json({ data: { user, accessToken } });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie("refresh_token", { ...refreshCookieOptions(), maxAge: 0 });
    res.json({ data: { ok: true } });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.refresh_token as string | undefined;
    if (!raw) throw unauthorized("No refresh token", "NO_REFRESH_TOKEN");
    let userId: string;
    try {
      userId = verifyRefreshToken(raw);
    } catch {
      throw unauthorized("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    const user = await getUserById(userId);
    const accessToken = issueTokens(res, user.id);
    res.json({ data: { user, accessToken } });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.user!.id);
    res.json({ data: { user, adminRole: req.user!.adminRole } });
  }),
);

authRouter.post(
  "/verify-email",
  authLimiter,
  validate(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const user = await verifyEmailToken(req.body.token);
    res.json({ data: { user } });
  }),
);

authRouter.post(
  "/request-password-reset",
  authLimiter,
  validate(requestPasswordResetSchema),
  asyncHandler(async (req, res) => {
    // Always 200 — never reveal whether the email exists.
    // TODO: deliver this token by email; returned in non-production only.
    const token = await createPasswordResetToken(req.body.email);
    res.json({
      data: { ok: true, resetToken: config.nodeEnv === "production" ? undefined : token },
    });
  }),
);

authRouter.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await resetPasswordWithToken(req.body.token, req.body.password);
    res.json({ data: { ok: true } });
  }),
);
