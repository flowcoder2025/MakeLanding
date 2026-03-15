import type {
  ComfyUIConfig,
  ComfyUIClient,
  QueuePromptResponse,
  PromptHistory,
  PromptHistoryEntry,
} from './types.js';

const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createComfyUIClient(config: ComfyUIConfig): ComfyUIClient {
  const { baseUrl } = config;

  async function queuePrompt(
    workflow: Record<string, unknown>,
    clientId?: string,
  ): Promise<string> {
    const body: Record<string, unknown> = { prompt: workflow };
    if (clientId) {
      body.client_id = clientId;
    }

    const response = await fetch(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ComfyUI API 호출 실패 (${response.status}): ${text}`);
    }

    const data = (await response.json()) as QueuePromptResponse;
    return data.prompt_id;
  }

  async function getHistory(promptId: string): Promise<PromptHistoryEntry | null> {
    const response = await fetch(`${baseUrl}/history/${promptId}`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ComfyUI 히스토리 조회 실패 (${response.status}): ${text}`);
    }

    const data = (await response.json()) as PromptHistory;
    return data[promptId] ?? null;
  }

  async function getImage(
    filename: string,
    subfolder: string,
    type: string,
  ): Promise<Buffer> {
    const params = new URLSearchParams({ filename, subfolder, type });
    const response = await fetch(`${baseUrl}/view?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`ComfyUI 이미지 다운로드 실패 (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async function waitForCompletion(
    promptId: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
  ): Promise<PromptHistoryEntry> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const entry = await getHistory(promptId);
      if (entry?.status.completed) {
        return entry;
      }
      if (Date.now() + pollIntervalMs > deadline) {
        break;
      }
      await delay(pollIntervalMs);
    }

    throw new Error(
      `ComfyUI 작업 타임아웃: prompt_id=${promptId} (${timeoutMs}ms 초과)`,
    );
  }

  return { queuePrompt, getHistory, getImage, waitForCompletion };
}
