import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComfyUIClient } from '../../src/comfyui/client.js';
import type { ComfyUIClient } from '../../src/comfyui/types.js';

const BASE_URL = 'http://127.0.0.1:8188';

function mockFetchResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as unknown as Response;
}

describe('createComfyUIClient', () => {
  let client: ComfyUIClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = createComfyUIClient({ baseUrl: BASE_URL });
  });

  describe('queuePrompt', () => {
    it('워크플로우를 큐에 등록하고 prompt_id를 반환한다', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ prompt_id: 'abc-123' }),
      );

      const promptId = await client.queuePrompt({ '1': { class_type: 'KSampler' } });

      expect(promptId).toBe('abc-123');
      expect(fetchMock).toHaveBeenCalledOnce();

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/prompt`);
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body as string);
      expect(body.prompt).toEqual({ '1': { class_type: 'KSampler' } });
    });

    it('client_id를 지정하면 요청 body에 포함된다', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ prompt_id: 'def-456' }),
      );

      await client.queuePrompt({ '1': {} }, 'my-client');

      const body = JSON.parse(
        (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
      );
      expect(body.client_id).toBe('my-client');
    });

    it('API 에러 시 예외를 던진다', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'bad workflow' }, false, 400),
      );

      await expect(client.queuePrompt({})).rejects.toThrow('ComfyUI API 호출 실패 (400)');
    });
  });

  describe('getHistory', () => {
    it('prompt_id에 해당하는 히스토리를 반환한다', async () => {
      const entry = {
        status: { completed: true, status_str: 'success' },
        outputs: {
          '9': { images: [{ filename: 'out.png', subfolder: '', type: 'output' }] },
        },
      };
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ 'abc-123': entry }),
      );

      const result = await client.getHistory('abc-123');

      expect(result).toEqual(entry);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${BASE_URL}/history/abc-123`);
    });

    it('히스토리에 해당 prompt_id가 없으면 null을 반환한다', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({}));

      const result = await client.getHistory('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getImage', () => {
    it('이미지 파일을 Buffer로 다운로드한다', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse(null),
      );

      const buffer = await client.getImage('out.png', '', 'output');

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain(`${BASE_URL}/view`);
      expect(url).toContain('filename=out.png');
      expect(url).toContain('type=output');
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('API 에러 시 예외를 던진다', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse(null, false, 404),
      );

      await expect(client.getImage('missing.png', '', 'output')).rejects.toThrow(
        'ComfyUI 이미지 다운로드 실패 (404)',
      );
    });
  });

  describe('waitForCompletion', () => {
    it('완료될 때까지 폴링 후 결과를 반환한다', async () => {
      const pending = {
        status: { completed: false, status_str: 'running' },
        outputs: {},
      };
      const completed = {
        status: { completed: true, status_str: 'success' },
        outputs: {
          '9': { images: [{ filename: 'result.png', subfolder: '', type: 'output' }] },
        },
      };

      fetchMock
        .mockResolvedValueOnce(mockFetchResponse({ 'p-1': pending }))
        .mockResolvedValueOnce(mockFetchResponse({ 'p-1': completed }));

      const result = await client.waitForCompletion('p-1', 10_000, 10);

      expect(result.status.completed).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('타임아웃 시 에러를 던진다', async () => {
      fetchMock.mockResolvedValue(mockFetchResponse({}));

      await expect(
        client.waitForCompletion('p-timeout', 50, 10),
      ).rejects.toThrow('타임아웃');
    });
  });
});
