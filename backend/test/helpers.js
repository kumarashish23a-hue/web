import { fileURLToPath } from "node:url";
import path from "node:path";
import { applySqlFile, closeDb, initDb, query } from "../src/db.js";
import { buildApp } from "../src/app.js";
export async function testApp() {
    const applied = await initDb();
    if (applied === 0) {
        // Real migrations not present yet -> apply the contract-derived test schema.
        const sqlPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "test-schema.sql");
        await applySqlFile(sqlPath);
    }
    return buildApp();
}
export async function startServer(app) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, "127.0.0.1", () => {
            const addr = server.address();
            const port = typeof addr === "object" && addr ? addr.port : 0;
            resolve({
                base: `http://127.0.0.1:${port}`,
                close: async () => {
                    await new Promise((r) => server.close(() => r()));
                    await closeDb();
                },
            });
        });
        server.on("error", reject);
    });
}
export { query, closeDb };
/** Minimal fetch wrapper returning { status, json, headers, cookies }. */
export async function api(base, method, path, opts = {}) {
    const headers = { "content-type": "application/json" };
    if (opts.token)
        headers.authorization = `Bearer ${opts.token}`;
    if (opts.cookie)
        headers.cookie = opts.cookie;
    const res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const setCookie = res.headers.get("set-cookie");
    let json = null;
    try {
        json = await res.json();
    }
    catch {
        json = null;
    }
    return { status: res.status, json, cookie: setCookie };
}
export const data = (r) => r.json?.data ?? null;
/** Create a user via the API; returns { user, accessToken, cookie }. */
export async function signupHelper(base, email, password = "password123") {
    const r = await api(base, "POST", "/api/v1/auth/signup", {
        body: { email, password, displayName: "Tester" },
    });
    if (r.status !== 201)
        throw new Error(`signup failed: ${r.status} ${JSON.stringify(r.json)}`);
    const d = data(r);
    return { userId: d.user.id, token: d.accessToken, cookie: r.cookie };
}
/** Grant an admin role directly in the DB (tests only). */
export async function makeAdmin(userId, role = "super_admin") {
    const { rows } = await query("INSERT INTO admin_users (user_id, role) VALUES ($1, $2) RETURNING id", [userId, role]);
    return String(rows[0].id);
}
//# sourceMappingURL=helpers.js.map