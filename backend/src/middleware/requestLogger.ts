import type { NextFunction, Request, Response } from "express";

// Request logger: method + path + status + duration. Never logs bodies,
// headers, tokens or cookies (no sensitive data).
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[http] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
}
