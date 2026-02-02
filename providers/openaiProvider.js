import OpenAI from 'openai';

export function createOpenAIProvider(apiKey) {
  const client = new OpenAI({ apiKey });

  return {
    async *stream({ systemPrompt, messages, modelId, maxOutputTokens }) {
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const response = await client.chat.completions.create({
        model:      modelId,
        messages:   openaiMessages,
        max_tokens: maxOutputTokens,
        stream:     true
      });

      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
      }
    }
  };
}