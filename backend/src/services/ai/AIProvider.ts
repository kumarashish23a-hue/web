/**
 * AI provider abstraction. All provider keys stay server-side.
 *
 * - RuleBasedProvider: real, deterministic implementation backed by the
 *   rule-based recommender. Default.
 * - OpenAIProvider: stub — constructor throws unless OPENAI_API_KEY is set;
 *   methods throw until a real implementation lands (TODO).
 */
import type {
  ParsedGoal,
  RecommendConstraints,
  RecommendRequest,
  RecommendResponse,
} from "ai-discover-shared";
import { config } from "../../config.js";
import { parseGoal, recommend } from "../recommender.js";

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
    return recommend(req);
  }
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? config.openaiApiKey;
    if (!key) {
      throw new Error("OpenAIProvider not configured — set OPENAI_API_KEY");
    }
    this.apiKey = key;
  }

  async analyzeGoal(_goal: string): Promise<ParsedGoal> {
    throw new Error("TODO: OpenAIProvider.analyzeGoal is not implemented yet");
  }

  async classifyTask(_goal: string): Promise<string[]> {
    throw new Error("TODO: OpenAIProvider.classifyTask is not implemented yet");
  }

  async extractRequirements(
    _goal: string,
    _constraints?: RecommendConstraints,
  ): Promise<RecommendConstraints> {
    throw new Error("TODO: OpenAIProvider.extractRequirements is not implemented yet");
  }

  async generateRecommendations(_req: RecommendRequest): Promise<RecommendResponse> {
    throw new Error("TODO: OpenAIProvider.generateRecommendations is not implemented yet");
  }
}

/** Provider factory: env AI_PROVIDER selects the implementation (default rule-based). */
export function createAIProvider(): AIProvider {
  const which = (config.aiProvider || "rule-based").toLowerCase();
  if (which === "openai") {
    return new OpenAIProvider();
  }
  return new RuleBasedProvider();
}
