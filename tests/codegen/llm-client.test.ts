import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLlmClient } from '../../src/codegen/llm-client.js';

describe('createLlmClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('API 키가 없으면 에러를 던진다', () => {
    expect(() =>
      createLlmClient({ provider: 'anthropic', apiKey: '', model: 'claude-sonnet-4-20250514' }),
    ).toThrow('LLM API 키가 설정되지 않았습니다');
  });

  it('Anthropic API를 올바르게 호출한다', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '응답 텍스트' }],
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const client = createLlmClient({
      provider: 'anthropic',
      apiKey: 'test-key',
      model: 'claude-sonnet-4-20250514',
    });

    const result = await client('시스템 프롬프트', '사용자 메시지');

    expect(result).toBe('응답 텍스트');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01',
        }),
      }),
    );
  });

  it('OpenAI API를 올바르게 호출한다', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'GPT 응답' } }],
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const client = createLlmClient({
      provider: 'openai',
      apiKey: 'test-openai-key',
      model: 'gpt-4o',
    });

    const result = await client('시스템', '메시지');

    expect(result).toBe('GPT 응답');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openai-key',
        }),
      }),
    );
  });

  it('API 호출 실패 시 에러를 던진다', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: vi.fn().mockResolvedValue('Invalid API key'),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const client = createLlmClient({
      provider: 'anthropic',
      apiKey: 'bad-key',
      model: 'claude-sonnet-4-20250514',
    });

    await expect(client('시스템', '메시지')).rejects.toThrow('LLM API 호출 실패');
  });
});
