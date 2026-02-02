import { GoogleGenerativeAI } from "@google/generative-ai";

function enforceAlternatingTurns(messages) {
  const merged = [];

  for (const msg of messages) {
    const role = msg.role === "assistant" ? "model" : "user";
    const prev = merged[merged.length - 1];

    if (prev && prev.role === role) {
      prev.parts.push({ text: msg.content });
    } else {
      merged.push({ role, parts: [{ text: msg.content }] });
    }
  }

  if (merged.length > 0 && merged[0].role !== "user") {
    merged.unshift({ role: "user", parts: [{ text: "." }] });
  }

  return merged;
}

export function createGeminiProvider(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    async *stream({ systemPrompt, messages, modelId, maxOutputTokens }) {
      const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContentStream({
        contents: enforceAlternatingTurns(messages),
        generationConfig: { maxOutputTokens },
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text?.trim()) yield text;
      }
    },
  };
}
