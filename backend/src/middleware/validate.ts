import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { badRequest } from "./errors.js";

type Source = "body" | "query" | "params";

/**
 * Store parsed data on the request. Express 5 exposes req.query (and
 * req.params) as getter-only accessors that re-parse on every access, so a
 * plain assignment throws — shadow them with an own data property instead.
 */
function setParsed(req: Request, source: Source, data: unknown): void {
  try {
    (req as unknown as Record<string, unknown>)[source] = data;
  } catch {
    Object.defineProperty(req, source, {
      value: data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
}

/** Validate req[source] against a zod schema; replaces it with the parsed value. */
export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const where = first ? ` (${first.path.join(".") || source})` : "";
      next(badRequest(`Invalid request${where}: ${first?.message ?? "validation failed"}`, "VALIDATION_ERROR"));
      return;
    }
    setParsed(req, source, parsed.data);
    next();
  };
}
