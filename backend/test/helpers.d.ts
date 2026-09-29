/** Test helpers: boot the app against PGlite with schema, serve on ephemeral port. */
import type { Express } from "express";
import { closeDb, query } from "../src/db.js";
export declare function testApp(): Promise<Express>;
export declare function startServer(app: Express): Promise<{
    base: string;
    close: () => Promise<void>;
}>;
export { query, closeDb };
/** Minimal fetch wrapper returning { status, json, headers, cookies }. */
export declare function api(base: string, method: string, path: string, opts?: {
    body?: unknown;
    token?: string;
    cookie?: string;
}): Promise<{
    status: number;
    json: unknown;
    cookie: string | null;
}>;
export declare const data: (r: {
    json: unknown;
}) => unknown;
/** Create a user via the API; returns { user, accessToken, cookie }. */
export declare function signupHelper(base: string, email: string, password?: string): Promise<{
    userId: string;
    token: string;
    cookie: string | null;
}>;
/** Grant an admin role directly in the DB (tests only). */
export declare function makeAdmin(userId: string, role?: string): Promise<string>;
