export type VideoStyle = 'realistic' | '3d-product' | '3d-character';

export interface WorkflowInput {
  prompt: string;
  negativePrompt?: string;
  style: VideoStyle;
  width?: number;
  height?: number;
  durationSec?: number;
  seed?: number;
}

export interface ComfyUINode {
  class_type: string;
  inputs: Record<string, unknown>;
}

export type ComfyUIWorkflow = Record<string, ComfyUINode>;

export interface WorkflowTemplate {
  nodes: ComfyUIWorkflow;
  placeholders: string[];
}
