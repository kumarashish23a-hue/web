import { Router } from "express";
import rateLimit from "express-rate-limit";
import { signupSchema } from "ai-discover-shared";
import { query } from "../db.js";
import { asyncHandler, notFound } from "../middleware/errors.js";
import { validate } from "../middleware/validate.js";
import { signupUser } from "../services/auth.js";

/**
 * First-admin bootstrap.
 *
 * POST /api/v1/auth/bootstrap-superadmin
 *
 * Works ONLY when zero admin_users exist (fresh install). Creates a user via
 * the normal signup path and grants super_admin. Once any admin exists the
 * route behaves as 404 so it can never be used to escalate later.
 */
export const bootstrapRouter = Router();

const bootstrapLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
});

bootstrapRouter.post(
  "/bootstrap-superadmin",
  bootstrapLimiter,
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT COUNT(*)::int AS n FROM admin_users`);
    if (Number(rows[0]?.n ?? 0) > 0) throw notFound("Not found");

    const { email, password, displayName } = req.body;
    const user = await signupUser(email, password, displayName);
    await query(`INSERT INTO admin_users (user_id, role) VALUES ($1, 'super_admin')`, [user.id]);
    res.status(201).json({ data: { user, role: "super_admin" } });
  }),
);
