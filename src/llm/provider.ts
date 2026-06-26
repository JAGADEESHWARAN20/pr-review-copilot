import type { ReviewResponse } from "../schemas/index.js";

/**
 * Provider-agnostic contract for a review LLM. Each concrete provider (Gemini
 * today; Claude / OpenAI later) implements `review()` by sending the system +
 * user prompt to its API and returning a parsed, validated ReviewResponse.
 *
 * Keeping this interface narrow is what lets the rest of the pipeline stay
 * provider-independent — swapping models is a one-line factory change.
 */
export interface ReviewProvider {
  /** Human-readable provider id, e.g. "gemini". */
  readonly name: string;

  /**
   * Sends the prompts to the model and returns a validated ReviewResponse.
   * Implementations must:
   *   - request JSON output,
   *   - retry transient failures with backoff,
   *   - validate the result against `reviewResponseSchema` before returning.
   */
  review(input: ReviewRequest): Promise<ReviewResponse>;
}

export interface ReviewRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface ProviderOptions {
  apiKey: string;
  model: string;
  /** Max retry attempts on transient (5xx / rate-limit) errors. */
  maxRetries?: number;
}
