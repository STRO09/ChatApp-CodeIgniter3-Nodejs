
export function createOllamaProvider({apiKey,  baseUrl = 'https://ollama.com'}) {
  return {
    async *stream({ systemPrompt, messages, modelId, maxOutputTokens }) {

      const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: ollamaMessages,
          stream: true,
          options: {
            num_predict: maxOutputTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');

        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;

          const json = JSON.parse(line);

          const text = json.message?.content;

          if (text) {
            yield text;
          }
        }
      }
    }
  };
}
