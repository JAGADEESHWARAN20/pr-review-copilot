import { GeminiProvider } from "./gemini.js";
import type { ProviderOptions, ReviewProvider } from "./provider.js";

export type ProviderName = "gemini" | "openai" | "anthropic";

/**
 * Single place that maps a provider name -> concrete implementation.
 * Adding Claude/OpenAI later means implementing the ReviewProvider interface
 * and adding one `case` here — no pipeline changes required.
 */
export function createProvider(
  provider: ProviderName,
  opts: ProviderOptions,
): ReviewProvider {
  switch (provider) {
    case "gemini":
      return new GeminiProvider(opts);
    case "openai":
    case "anthropic":
      throw new Error(
        `Provider "${provider}" is not implemented yet. V1 supports "gemini".`,
      );
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}
