// config/ai.config.js
export default {
  // ─────────────────────────────────────────────
  // Global context & behavior (provider-agnostic)
  // ─────────────────────────────────────────────
  context: {
    maxContextMessages: 20,
    maxInputTokens: 8000,
  },
  rateLimit: {
    maxMessages: 10,
    windowSeconds: 60,
  },
  systemPrompt: `
You are a helpful AI assistant integrated into a chat application.
Be concise, friendly, and conversational.
If the user asks something you can't help with, say so politely and suggest what you can help with.
Keep responses under 200 words unless the user explicitly asks for a detailed explanation.
`.trim(),
  // ─────────────────────────────────────────────
  // Provider credentials
  // ─────────────────────────────────────────────
  providers: {
    // anthropic: {
    //   apiKey: process.env.ANTHROPIC_API_KEY
    // },
    ollama: {
      apiKey: process.env.OLLAMA_API_KEY,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
  },
  // ─────────────────────────────────────────────
  // Fallback chain (cheapest → best)
  // Order matters
  // ─────────────────────────────────────────────
  modelFallbackChain: [
    "ollama_llama3_local",
    "gemini_flash_free",
    "gemini_pro_free",
    "openai_gpt4o_mini_free",
  ],
  // ─────────────────────────────────────────────
  // Model registry
  // Each entry is a *billing + capability profile*
  // ─────────────────────────────────────────────
  models: {
    // ─────── Anthropic ───────
    // anthropic_haiku_free: {
    //   provider: 'anthropic',
    //   modelId: 'claude-3-5-haiku-20241022',
    //   cost: 'free',
    //   maxInputTokens: 8000,
    //   maxOutputTokens: 1024,
    //   streaming: true
    // },
    // anthropic_sonnet_paid: {
    //   provider: 'anthropic',
    //   modelId: 'claude-3-7-sonnet-20250215',
    //   cost: 'paid',
    //   maxInputTokens: 20000,
    //   maxOutputTokens: 2048,
    //   streaming: true
    // },
    // ─────── Ollama ───────
    ollama_llama3_local: {
      provider: "ollama",
      modelId: "gpt-oss:120b-cloud",
      cost: "free",
      maxInputTokens: 8192,
      maxOutputTokens: 1024,
      streaming: true,
    },
     // ─────── OpenAI ───────
    openai_gpt4o_mini_free: {
      provider: "openai",
      modelId: "gpt-4o-mini",
      cost: "free",
      maxInputTokens: 8000,
      maxOutputTokens: 1024,
      streaming: true,
    },
    // openai_gpt4o_paid: {
    //   provider: 'openai',
    //   modelId: 'gpt-4o',
    //   cost: 'paid',
    //   maxInputTokens: 128000,
    //   maxOutputTokens: 4096,
    //   streaming: true
    // },
    // ─────── Gemini ───────
    gemini_pro_free: {
      provider: "gemini",
      modelId: "models/gemini-pro",
      cost: "free",
      maxInputTokens: 8192,
      maxOutputTokens: 1024,
      streaming: true,
    },
    gemini_flash_free: {
      provider: "gemini",
      modelId: "models/gemini-1.5-flash",
      cost: "free",
      maxInputTokens: 10000,
      maxOutputTokens: 1024,
      streaming: true,
    },
    // gemini_pro_paid: {
    //   provider: 'gemini',
    //   modelId: 'gemini-1.5-pro',
    //   cost: 'paid',
    //   maxInputTokens: 32000,
    //   maxOutputTokens: 2048,
    //   streaming: true
    // }
  },
};
