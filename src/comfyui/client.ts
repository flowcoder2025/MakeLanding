import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import WebSocket from 'ws';
import { COMFYUI_URL } from '../shared/constants.js';
import type {
  Workflow,
  QueuePromptResponse,
  HistoryEntry,
  OutputFile,
  ProgressEvent,
  WaitOptions,
} from './types.js';

const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_MAX_POLL_ATTEMPTS = 600;

export class ComfyUIClient {
  private readonly baseUrl: string;
  private readonly clientId: string;

  constructor(baseUrl: string = COMFYUI_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.clientId = randomUUID();
  }

  async queuePrompt(workflow: Workflow): Promise<QueuePromptResponse> {
    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: this.clientId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ComfyUI 워크플로우 큐잉 실패: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<QueuePromptResponse>;
  }

  async getHistory(promptId: string): Promise<HistoryEntry | null> {
    const response = await fetch(`${this.baseUrl}/history/${promptId}`);

    if (!response.ok) {
      throw new Error(`ComfyUI 히스토리 조회 실패: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, HistoryEntry>;
    return data[promptId] ?? null;
  }

  async getOutputFile(
    filename: string,
    subfolder: string,
    type: string,
  ): Promise<Buffer> {
    const params = new URLSearchParams({ filename, subfolder, type });
    const response = await fetch(`${this.baseUrl}/view?${params}`);

    if (!response.ok) {
      throw new Error(`ComfyUI 파일 다운로드 실패: ${filename}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async waitForCompletion(
    promptId: string,
    options: WaitOptions = {},
  ): Promise<HistoryEntry> {
    return this.waitWithWebSocket(promptId, options);
  }

  private waitWithWebSocket(
    promptId: string,
    options: WaitOptions,
  ): Promise<HistoryEntry> {
    const { onProgress } = options;

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.baseUrl.replace(/^http/, 'ws')}/ws?clientId=${this.clientId}`;
      let ws: WebSocket;

      try {
        ws = new WebSocket(wsUrl);
      } catch {
        this.waitWithPolling(promptId, options).then(resolve).catch(reject);
        return;
      }

      let settled = false;

      const cleanup = () => {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      };

      const fallbackToPolling = () => {
        if (!settled) {
          settled = true;
          cleanup();
          this.waitWithPolling(promptId, options).then(resolve).catch(reject);
        }
      };

      ws.on('message', (raw: WebSocket.RawData) => {
        if (settled) return;

        try {
          const event = JSON.parse(raw.toString()) as ProgressEvent;
          onProgress?.(event);

          if (
            event.type === 'executed' &&
            event.data.prompt_id === promptId
          ) {
            settled = true;
            cleanup();
            this.getHistory(promptId).then((history) => {
              if (history) {
                resolve(history);
              } else {
                reject(
                  new Error(
                    '실행 완료 후 히스토리를 가져올 수 없습니다',
                  ),
                );
              }
            }).catch(reject);
          }

          if (
            event.type === 'execution_error' &&
            event.data.prompt_id === promptId
          ) {
            settled = true;
            cleanup();
            reject(
              new Error(
                `ComfyUI 실행 에러: ${JSON.stringify(event.data)}`,
              ),
            );
          }
        } catch {
          // Ignore non-JSON messages
        }
      });

      ws.on('error', fallbackToPolling);
      ws.on('close', fallbackToPolling);
    });
  }

  private async waitWithPolling(
    promptId: string,
    options: WaitOptions,
  ): Promise<HistoryEntry> {
    const pollIntervalMs =
      options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const maxPollAttempts =
      options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
    const { onProgress } = options;

    for (let i = 0; i < maxPollAttempts; i++) {
      const history = await this.getHistory(promptId);

      if (history?.status?.completed) {
        return history;
      }

      onProgress?.({
        type: 'status',
        data: { polling: true, attempt: i + 1 },
      });

      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new Error(
      `ComfyUI 실행 시간 초과 (${(maxPollAttempts * pollIntervalMs) / 1000}초)`,
    );
  }

  async downloadOutputs(
    promptId: string,
    outputDir: string,
  ): Promise<string[]> {
    const history = await this.getHistory(promptId);

    if (!history) {
      throw new Error(`히스토리를 찾을 수 없습니다: ${promptId}`);
    }

    await mkdir(outputDir, { recursive: true });

    const downloadedFiles: string[] = [];

    for (const nodeOutput of Object.values(history.outputs)) {
      const files: OutputFile[] = [
        ...(nodeOutput.images ?? []),
        ...(nodeOutput.videos ?? []),
        ...(nodeOutput.gifs ?? []),
      ];

      for (const file of files) {
        const data = await this.getOutputFile(
          file.filename,
          file.subfolder,
          file.type,
        );
        const filePath = join(outputDir, file.filename);
        await writeFile(filePath, data);
        downloadedFiles.push(filePath);
      }
    }

    return downloadedFiles;
  }
}
