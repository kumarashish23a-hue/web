import type { NextFunction, Request, Response } from "express";

/** Operational error carrying an HTTP status + SNAKE_CASE code for the envelope. */
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") => new ApiError(400, code, message);
export const unauthorized = (message = "Authentication required", code = "UNAUTHORIZED") =>
  new ApiError(401, code, message);
export const forbidden = (message = "Forbidden", code = "FORBIDDEN") => new ApiError(403, code, message);
export const notFound = (message = "Not found", code = "NOT_FOUND") => new ApiError(404, code, message);
export const conflict = (message: string, code = "CONFLICT") => new ApiError(409, code, message);

/** Final error handler. Never leaks stack traces to the client. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[backend] unhandled error:", err instanceof Error ? err.message : err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
}

/** Wrap async route handlers so rejections reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
