export type VideoStyle = 'realistic' | '3d-product' | '3d-character';

export interface WorkflowConfig {
  positivePrompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  frameCount?: number;
  fps?: number;
  style: VideoStyle;
  seed?: number;
}

export interface ComfyUINode {
  class_type: string;
  inputs: Record<string, unknown>;
}

export type ComfyUIWorkflow = Record<string, ComfyUINode>;

export const VIDEO_STYLE_LABELS: Record<VideoStyle, string> = {
  'realistic': 'Cinematic Realistic',
  '3d-product': '3D Product Visualization',
  '3d-character': '3D Character Animation',
};
