import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { initDb } from "./db.js";
import { errorHandler } from "./middleware/errors.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { bootstrapRouter } from "./routes/bootstrap.js";
import { publicRouter } from "./routes/public.js";
import { userRouter } from "./routes/user.js";

/** Build the Express app (exported for tests; index.ts boots it). */
export async function buildApp(): Promise<express.Express> {
  await initDb();

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get("/api/v1/health", (_req, res) => {
    res.json({ data: { status: "ok", time: new Date().toISOString() } });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/auth", bootstrapRouter);
  app.use("/api/v1", publicRouter);
  app.use("/api/v1", userRouter);
  app.use("/api/v1/admin", adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } });
  });
  app.use(errorHandler);

  return app;
}
