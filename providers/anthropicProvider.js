import Anthropic from '@anthropic-ai/sdk';

export function createAnthropicProvider(apiKey) {
  const client = new Anthropic({ apiKey });

  return {
    async *stream({ systemPrompt, messages, modelId, maxOutputTokens }) {
      const response = await client.messages.stream({
        model:      modelId,
        max_tokens: maxOutputTokens,
        system:     systemPrompt,
        messages
      });

      for await (const event of response) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    }
  };
}