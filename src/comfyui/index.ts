export { createComfyUIClient } from './client.js';
export type {
  ComfyUIConfig,
  ComfyUIClient,
  QueuePromptResponse,
  PromptHistoryEntry,
  PromptHistoryOutput,
} from './types.js';
export { postProcessVideo, getVideoDuration, calculateTargetBitrate } from './video-postprocess.js';
export type { PostProcessOptions, PostProcessResult } from './video-postprocess.js';
export { buildWorkflow, SUPPORTED_STYLES } from './workflow-builder.js';
export type {
  VideoStyle,
  WorkflowInput,
  ComfyUIWorkflow,
  ComfyUINode,
  WorkflowTemplate,
} from './workflow-types.js';
