import { buildApp } from "./app.js";
import { config, assertProdSecrets } from "./config.js";
import { closeDb } from "./db.js";

async function main(): Promise<void> {
  assertProdSecrets();
  const app = await buildApp();
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on :${config.port} (db: ${config.dbAdapter})`);
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[backend] failed to start:", err);
  process.exit(1);
});
