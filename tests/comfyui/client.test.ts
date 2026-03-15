import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock ws — factory runs at hoist time, so inline the EventEmitter import
vi.mock('ws', async () => {
  const { EventEmitter } = await import('node:events');

  class MockWebSocket extends EventEmitter {
    static OPEN = 1;
    static CONNECTING = 0;
    readyState = 1;

    constructor(_url: string) {
      super();
      // Emit close immediately to trigger polling fallback in tests
      queueMicrotask(() => this.emit('close'));
    }

    close() {
      this.readyState = 3;
    }
  }

  return { default: MockWebSocket, WebSocket: MockWebSocket };
});

import { ComfyUIClient } from '../../src/comfyui/client.js';

function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    arrayBuffer: () =>
      Promise.resolve(
        body instanceof ArrayBuffer
          ? body
          : new TextEncoder().encode(JSON.stringify(body)).buffer,
      ),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => mockFetchResponse(body, status),
    body: null,
    bodyUsed: false,
    text: () => Promise.resolve(JSON.stringify(body)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  };
}

describe('ComfyUIClient', () => {
  let client: ComfyUIClient;
  let fetchSpy: ReturnType<typeof vi.fn>;
  let tempDir: string;

  beforeEach(() => {
    client = new ComfyUIClient('http://127.0.0.1:8188');
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    tempDir = join(tmpdir(), `makelanding-comfyui-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('queuePrompt', () => {
    it('워크플로우를 ComfyUI 큐에 등록한다', async () => {
      const workflow = { '1': { class_type: 'KSampler', inputs: {} } };
      const serverResponse = {
        prompt_id: 'abc-123',
        number: 1,
        node_errors: {},
      };

      fetchSpy.mockResolvedValueOnce(mockFetchResponse(serverResponse));

      const result = await client.queuePrompt(workflow);

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://127.0.0.1:8188/prompt',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result.prompt_id).toBe('abc-123');
      expect(result.number).toBe(1);

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.prompt).toEqual(workflow);
      expect(body.client_id).toBeDefined();
    });

    it('서버 에러 시 에러를 던진다', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}, 500));

      await expect(
        client.queuePrompt({ '1': { class_type: 'Test', inputs: {} } }),
      ).rejects.toThrow('ComfyUI 워크플로우 큐잉 실패');
    });
  });

  describe('getHistory', () => {
    it('prompt_id로 실행 히스토리를 조회한다', async () => {
      const historyEntry = {
        outputs: {
          '9': {
            images: [
              { filename: 'output.png', subfolder: '', type: 'output' },
            ],
          },
        },
        status: { status_str: 'success', completed: true },
      };

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({ 'abc-123': historyEntry }),
      );

      const result = await client.getHistory('abc-123');

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://127.0.0.1:8188/history/abc-123',
      );
      expect(result).toEqual(historyEntry);
      expect(result?.status.completed).toBe(true);
    });

    it('존재하지 않는 prompt_id는 null을 반환한다', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}));

      const result = await client.getHistory('nonexistent');

      expect(result).toBeNull();
    });

    it('서버 에러 시 에러를 던진다', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}, 500));

      await expect(client.getHistory('abc-123')).rejects.toThrow(
        'ComfyUI 히스토리 조회 실패',
      );
    });
  });

  describe('getOutputFile', () => {
    it('출력 파일을 Buffer로 다운로드한다', async () => {
      const fileContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      fetchSpy.mockResolvedValueOnce({
        ...mockFetchResponse(null),
        ok: true,
        arrayBuffer: () => Promise.resolve(fileContent.buffer),
      });

      const result = await client.getOutputFile('output.png', '', 'output');

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://127.0.0.1:8188/view?filename=output.png&subfolder=&type=output',
      );
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result[0]).toBe(0x89);
    });

    it('파일 다운로드 실패 시 에러를 던진다', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}, 404));

      await expect(
        client.getOutputFile('missing.png', '', 'output'),
      ).rejects.toThrow('ComfyUI 파일 다운로드 실패');
    });
  });

  describe('downloadOutputs', () => {
    it('완료된 프롬프트의 모든 출력 파일을 디렉토리에 다운로드한다', async () => {
      const historyEntry = {
        outputs: {
          '9': {
            images: [
              { filename: 'result.png', subfolder: '', type: 'output' },
            ],
          },
          '12': {
            videos: [
              { filename: 'video.mp4', subfolder: '', type: 'output' },
            ],
          },
        },
        status: { status_str: 'success', completed: true },
      };

      const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const mp4Data = new Uint8Array([0x00, 0x00, 0x00, 0x18]);

      fetchSpy
        .mockResolvedValueOnce(
          mockFetchResponse({ 'prompt-1': historyEntry }),
        )
        .mockResolvedValueOnce({
          ...mockFetchResponse(null),
          ok: true,
          arrayBuffer: () => Promise.resolve(pngData.slice().buffer),
        })
        .mockResolvedValueOnce({
          ...mockFetchResponse(null),
          ok: true,
          arrayBuffer: () => Promise.resolve(mp4Data.slice().buffer),
        });

      const outputDir = join(tempDir, 'outputs');
      const files = await client.downloadOutputs('prompt-1', outputDir);

      expect(files).toHaveLength(2);
      expect(files).toContain(join(outputDir, 'result.png'));
      expect(files).toContain(join(outputDir, 'video.mp4'));

      const pngContent = readFileSync(join(outputDir, 'result.png'));
      expect(pngContent[0]).toBe(0x89);

      const mp4Content = readFileSync(join(outputDir, 'video.mp4'));
      expect(mp4Content[0]).toBe(0x00);
    });

    it('히스토리가 없으면 에러를 던진다', async () => {
      fetchSpy.mockResolvedValueOnce(mockFetchResponse({}));

      await expect(
        client.downloadOutputs('nonexistent', tempDir),
      ).rejects.toThrow('히스토리를 찾을 수 없습니다');
    });
  });

  describe('waitForCompletion', () => {
    it('폴링 폴백으로 실행 완료를 대기한다', async () => {
      const incompleteHistory = {
        outputs: {},
        status: { status_str: 'running', completed: false },
      };
      const completedHistory = {
        outputs: {
          '9': {
            images: [
              { filename: 'result.png', subfolder: '', type: 'output' },
            ],
          },
        },
        status: { status_str: 'success', completed: true },
      };

      // MockWebSocket emits 'close' immediately → triggers polling fallback
      // First poll: incomplete, second poll: completed
      fetchSpy
        .mockResolvedValueOnce(
          mockFetchResponse({ 'prompt-1': incompleteHistory }),
        )
        .mockResolvedValueOnce(
          mockFetchResponse({ 'prompt-1': completedHistory }),
        );

      const result = await client.waitForCompletion('prompt-1', {
        pollIntervalMs: 10,
      });

      expect(result.status.completed).toBe(true);
      expect(result.outputs['9'].images).toHaveLength(1);
    });

    it('최대 폴링 횟수 초과 시 에러를 던진다', async () => {
      const incompleteHistory = {
        outputs: {},
        status: { status_str: 'running', completed: false },
      };

      fetchSpy.mockResolvedValue(
        mockFetchResponse({ 'prompt-1': incompleteHistory }),
      );

      await expect(
        client.waitForCompletion('prompt-1', {
          pollIntervalMs: 1,
          maxPollAttempts: 2,
        }),
      ).rejects.toThrow('ComfyUI 실행 시간 초과');
    });
  });
});
