import { GoogleGenAI } from "@google/genai";
import {
  reviewResponseSchema,
  type ReviewResponse,
} from "../schemas/index.js";
import { withRetry } from "./retry.js";
import type {
  ProviderOptions,
  ReviewProvider,
  ReviewRequest,
} from "./provider.js";

/**
 * Gemini-backed review provider (V1 default).
 *
 * Asks the model for JSON, parses + validates it against `reviewResponseSchema`,
 * and retries transient API failures (rate limits / 5xx) with backoff.
 */
export class GeminiProvider implements ReviewProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly maxRetries: number;

  constructor(opts: ProviderOptions) {
    if (!opts.apiKey) {
      throw new Error(
        "Gemini API key is missing. Set the `gemini-api-key` action input (from a repository secret).",
      );
    }
    this.client = new GoogleGenAI({ apiKey: opts.apiKey });
    this.model = opts.model;
    this.maxRetries = opts.maxRetries ?? 3;
  }

  async review(input: ReviewRequest): Promise<ReviewResponse> {
    const text = await withRetry(
      async () => {
        const res = await this.client.models.generateContent({
          model: this.model,
          contents: input.userPrompt,
          config: {
            systemInstruction: input.systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });
        const out = res.text;
        if (!out) {
          throw new Error("Gemini returned an empty response.");
        }
        return out;
      },
      {
        maxRetries: this.maxRetries,
        isRetryable: isRetryableGeminiError,
        onRetry: (attempt, delay) => {
          // eslint-disable-next-line no-console
          console.warn(
            `Gemini call failed (attempt ${attempt}); retrying in ${delay}ms…`,
          );
        },
      },
    );

    return parseReviewResponse(text);
  }
}

/** Parses model text into a validated ReviewResponse, tolerating code fences. */
export function parseReviewResponse(text: string): ReviewResponse {
  const cleaned = stripCodeFence(text);
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `LLM did not return valid JSON. First 200 chars: ${cleaned.slice(0, 200)}`,
    );
  }

  const result = reviewResponseSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `LLM JSON did not match the expected schema: ${result.error.message}`,
    );
  }
  return result.data;
}

/** Strips a leading/trailing ```json … ``` fence if the model added one. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fence ? fence[1]!.trim() : trimmed;
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Retry on rate limits and transient server errors; not on 4xx auth/validation.
  return /\b(429|500|502|503|504)\b/.test(msg) || /rate.?limit|overloaded|timeout/i.test(msg);
}
