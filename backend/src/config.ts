/** Centralised environment configuration. All secrets come from env only. */
import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  dbAdapter: process.env.DB_ADAPTER ?? "pg",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  aiProvider: process.env.AI_PROVIDER ?? "rule-based",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  /** Generic OpenAI-compatible LLM endpoint (server-side only). */
  aiLlmBaseUrl: process.env.AI_LLM_BASE_URL ?? "",
  aiLlmApiKey: process.env.AI_LLM_API_KEY ?? "",
  aiLlmModel: process.env.AI_LLM_MODEL ?? "",
  /** Base URL used to build email links (email verify / password reset). */
  get frontendUrl(): string {
    return process.env.FRONTEND_URL ?? this.corsOrigin;
  },
  /** SMTP settings for outgoing mail. Lazy getters so tests can toggle
   *  env vars without re-importing the module. */
  get smtpHost(): string {
    return process.env.SMTP_HOST ?? "";
  },
  get smtpPort(): number {
    return Number(process.env.SMTP_PORT ?? 587);
  },
  get smtpUser(): string {
    return process.env.SMTP_USER ?? "";
  },
  get smtpPass(): string {
    return process.env.SMTP_PASS ?? "";
  },
  get smtpFrom(): string {
    return process.env.SMTP_FROM ?? "";
  },
};

export function assertProdSecrets(): void {
  if (config.nodeEnv === "production") {
    required("DATABASE_URL");
    required("JWT_ACCESS_SECRET");
    required("JWT_REFRESH_SECRET");
  }
}
