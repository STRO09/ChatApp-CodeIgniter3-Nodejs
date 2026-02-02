// import { createAnthropicProvider } from "./anthropicProvider.js";
import { createOpenAIProvider } from "./openaiProvider.js";
import { createGeminiProvider } from "./geminiProvider.js";
import aiConfig from "../config/ai.config.js";

const CREATORS = {
  // anthropic: createAnthropicProvider,
  openai: createOpenAIProvider,
  gemini: createGeminiProvider,
};

const cache = new Map();

function getProvider(name) {
  if (cache.has(name)) return cache.get(name);

  const creator = CREATORS[name];
  if (!creator) throw new Error(`[AI] Unknown provider: "${name}"`);

  const apiKey = aiConfig.providers[name]?.apiKey;
  if (!apiKey) throw new Error(`[AI] No API key for "${name}"`);

  const instance = creator(apiKey);
  cache.set(name, instance);
  return instance;
}

export async function* getStreamWithFallback({
  systemPrompt,
  messages,
  maxOutputTokens,
}) {
  const tried = [];

  for (const modelKey of aiConfig.modelFallbackChain) {
    const def = aiConfig.models[modelKey];

    if (!def) {
      console.warn(`[AI] "${modelKey}" not in models registry. Skipping.`);
      continue;
    }

    if (!aiConfig.providers[def.provider]?.apiKey) {
      console.warn(`[AI] No key for "${def.provider}" — skipping ${modelKey}.`);
      continue;
    }

    const provider = getProvider(def.provider);
    const outputTokens = Math.min(maxOutputTokens, def.maxOutputTokens);
    let chunkCount = 0;

    try {
      console.log(
        `[AI] Trying ${modelKey} (${def.provider} / ${def.modelId})...`,
      );

      const stream = provider.stream({
        systemPrompt,
        messages,
        modelId: def.modelId,
        maxOutputTokens: outputTokens,
      });

      for await (const chunk of stream) {
        chunkCount++;
        yield chunk;
      }

      console.log(`[AI] ${modelKey} done — ${chunkCount} chunks.`);
      return;
    } catch (err) {
      tried.push(modelKey);

      console.warn(`[AI] ${modelKey} failed: ${err.message}`);

      if (err.message.includes("credit balance is too low")) {
        console.warn(`[AI] ${modelKey} skipped — no credits.`);
        continue;
      }

      if (chunkCount > 0) throw err;
      continue;
    }
  }

  throw new Error(
    `[AI] All providers failed. Tried: [${tried.join(", ") || "none"}]`,
  );
}
