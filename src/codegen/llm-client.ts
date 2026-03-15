import type { LlmConfig, LlmClient } from './types.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 1024;

export function createLlmClient(config: LlmConfig): LlmClient {
  if (!config.apiKey) {
    throw new Error('LLM API 키가 설정되지 않았습니다. LLM_API_KEY 환경변수를 확인하세요.');
  }

  if (config.provider === 'openai') {
    return createOpenAiClient(config);
  }
  return createAnthropicClient(config);
}

function createAnthropicClient(config: LlmConfig): LlmClient {
  return async (systemPrompt: string, userMessage: string): Promise<string> => {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM API 호출 실패 (${response.status}): ${body}`);
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    return data.content[0].text;
  };
}

function createOpenAiClient(config: LlmConfig): LlmClient {
  return async (systemPrompt: string, userMessage: string): Promise<string> => {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: MAX_TOKENS,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM API 호출 실패 (${response.status}): ${body}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  };
}
