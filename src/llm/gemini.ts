import { GoogleGenAI } from "@google/genai";
import {
  findingSchema,
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
    let text: string;
    try {
      text = await withRetry(
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
    } catch (err) {
      throw enrichGeminiError(err, this.model);
    }

    return parseReviewResponse(text);
  }
}

/**
 * Parses model text into a ReviewResponse, tolerating code fences.
 *
 * Findings are validated individually: a single malformed finding is dropped
 * rather than discarding the entire (otherwise good) response. Only a top-level
 * shape that isn't even an object/JSON is treated as a hard failure.
 */
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

  if (typeof json !== "object" || json === null) {
    throw new Error(
      `LLM JSON was not an object. First 200 chars: ${cleaned.slice(0, 200)}`,
    );
  }

  const obj = json as { summary?: unknown; findings?: unknown };
  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const rawFindings = Array.isArray(obj.findings) ? obj.findings : [];

  const findings = rawFindings.flatMap((rf) => {
    const r = findingSchema.safeParse(rf);
    return r.success ? [r.data] : [];
  });

  return { summary, findings };
}

/** Strips a leading/trailing ```json … ``` fence if the model added one. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fence ? fence[1]!.trim() : trimmed;
}

/**
 * Turns raw Gemini SDK errors into actionable messages. Quota (429) errors in
 * particular are confusing — a "limit: 0" free-tier response means the project
 * has no free allowance for the model, not that the caller is going too fast.
 */
function enrichGeminiError(err: unknown, model: string): Error {
  const msg = err instanceof Error ? err.message : String(err);

  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    const zeroLimit = /limit:\s*0\b/.test(msg);
    const hint = zeroLimit
      ? `Your Gemini project has no free-tier quota for "${model}" (limit: 0). ` +
        `Enable billing on the key's Google Cloud project, use a different model ` +
        `(set "model:" in .pr-copilot.yml, e.g. gemini-1.5-flash), or create a new ` +
        `key from a project that has free-tier access.`
      : `Gemini rate limit / quota exceeded for "${model}". Wait for the quota ` +
        `window to reset, slow down request volume, or enable billing for higher limits.`;
    return new Error(`Gemini quota error (429): ${hint}\n\nOriginal: ${msg}`);
  }

  if (/\b(401|403)\b|API_KEY_INVALID|permission/i.test(msg)) {
    return new Error(
      `Gemini authentication failed. Check that gemini-api-key is a valid key ` +
        `from https://aistudio.google.com/apikey.\n\nOriginal: ${msg}`,
    );
  }

  return err instanceof Error ? err : new Error(msg);
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Retry on rate limits and transient server errors; not on 4xx auth/validation.
  return /\b(429|500|502|503|504)\b/.test(msg) || /rate.?limit|overloaded|timeout/i.test(msg);
}
