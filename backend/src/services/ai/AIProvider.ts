/**
 * AI provider abstraction. All provider keys stay server-side.
 *
 * - RuleBasedProvider: real, deterministic implementation backed by the
 *   rule-based recommender. Default.
 * - OpenAICompatibleProvider: real implementation against any
 *   OpenAI-compatible /chat/completions endpoint, configured via
 *   AI_LLM_BASE_URL / AI_LLM_API_KEY / AI_LLM_MODEL. The LLM parses the
 *   goal and re-ranks DB-backed candidates; it can never invent websites,
 *   models, prices, limits, or verification statuses. Any LLM failure
 *   falls back to the rule-based engine.
 * - OpenAIProvider: backwards-compatible alias for OpenAICompatibleProvider.
 */
import type {
  ParsedGoal,
  RecommendConstraints,
  RecommendRequest,
  RecommendResponse,
} from "ai-discover-shared";
import { config } from "../../config.js";
import { parseGoal, recommend } from "../recommender.js";
import { OpenAICompatibleProvider } from "./openaiCompatible.js";

export interface AIProvider {
  readonly name: string;
  analyzeGoal(goal: string): Promise<ParsedGoal>;
  classifyTask(goal: string): Promise<string[]>;
  extractRequirements(
    goal: string,
    constraints?: RecommendConstraints,
  ): Promise<RecommendConstraints>;
  generateRecommendations(req: RecommendRequest): Promise<RecommendResponse>;
}

export class RuleBasedProvider implements AIProvider {
  readonly name = "rule-based";

  async analyzeGoal(goal: string): Promise<ParsedGoal> {
    return parseGoal(goal);
  }

  async classifyTask(goal: string): Promise<string[]> {
    return parseGoal(goal).tasks;
  }

  async extractRequirements(
    _goal: string,
    constraints?: RecommendConstraints,
  ): Promise<RecommendConstraints> {
    // Rule-based provider has no LLM to infer new constraints; echo the
    // caller-supplied ones through unchanged.
    return { ...(constraints ?? {}) };
  }

  async generateRecommendations(req: RecommendRequest): Promise<RecommendResponse> {
    const res = await recommend(req);
    return { ...res, engine: "rule-based" as const };
  }
}

/** Backwards-compatible alias; prefer OpenAICompatibleProvider for new code. */
export class OpenAIProvider extends OpenAICompatibleProvider {
  override readonly name = "openai-compatible";
}

export { OpenAICompatibleProvider };

/**
 * Provider factory. The LLM is used only when explicitly requested:
 * per-request via `useLlm: true`, or by default when AI_PROVIDER is
 * "llm" / "openai". If the LLM is requested but not configured, we fall
 * back to the rule-based engine rather than failing.
 */
export function createAIProvider(opts: { useLlm?: boolean } = {}): AIProvider {
  const which = (config.aiProvider || "rule-based").toLowerCase();
  const wantLlm = opts.useLlm === true || which === "openai" || which === "llm";
  if (wantLlm) {
    try {
      return new OpenAICompatibleProvider();
    } catch {
      return new RuleBasedProvider();
    }
  }
  return new RuleBasedProvider();
}
