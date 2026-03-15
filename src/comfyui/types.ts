export type WorkflowNode = Record<string, unknown>;
export type Workflow = Record<string, WorkflowNode>;

export interface QueuePromptResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
}

export interface OutputFile {
  filename: string;
  subfolder: string;
  type: string;
}

export interface HistoryOutput {
  images?: OutputFile[];
  videos?: OutputFile[];
  gifs?: OutputFile[];
}

export interface HistoryEntry {
  outputs: Record<string, HistoryOutput>;
  status: {
    status_str: string;
    completed: boolean;
  };
}

export interface ProgressEvent {
  type: 'progress' | 'executing' | 'executed' | 'execution_error' | 'status';
  data: Record<string, unknown>;
}

export type ProgressCallback = (event: ProgressEvent) => void;

export interface WaitOptions {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  onProgress?: ProgressCallback;
}
