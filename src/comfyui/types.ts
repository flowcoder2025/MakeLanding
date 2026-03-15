export interface ComfyUIConfig {
  baseUrl: string;
}

export interface QueuePromptResponse {
  prompt_id: string;
}

export interface PromptHistoryOutput {
  images?: Array<{ filename: string; subfolder: string; type: string }>;
  gifs?: Array<{ filename: string; subfolder: string; type: string }>;
}

export interface PromptHistoryEntry {
  status: { completed: boolean; status_str: string };
  outputs: Record<string, PromptHistoryOutput>;
}

export type PromptHistory = Record<string, PromptHistoryEntry>;

export interface ComfyUIClient {
  queuePrompt(workflow: Record<string, unknown>, clientId?: string): Promise<string>;
  getHistory(promptId: string): Promise<PromptHistoryEntry | null>;
  getImage(filename: string, subfolder: string, type: string): Promise<Buffer>;
  waitForCompletion(promptId: string, timeoutMs?: number, pollIntervalMs?: number): Promise<PromptHistoryEntry>;
}
