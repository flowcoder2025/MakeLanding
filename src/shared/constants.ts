export const COMFYUI_URL = process.env.COMFYUI_URL ?? 'http://127.0.0.1:8000';
export const COMFYUI_API_URL = `${COMFYUI_URL}/api`;

export const DEFAULT_VIDEO_WIDTH = 1920;
export const DEFAULT_VIDEO_HEIGHT = 1080;
export const DEFAULT_VIDEO_DURATION_SEC = 12;

export const DEFAULT_GEN_WIDTH = 832;
export const DEFAULT_GEN_HEIGHT = 480;
export const DEFAULT_GEN_FPS = 8;

export const DEFAULT_LANGUAGE = 'ko';

export const DEFAULT_LLM_PROVIDER = (process.env.LLM_PROVIDER ?? 'anthropic') as 'anthropic' | 'openai';
export const DEFAULT_LLM_MODEL_ANTHROPIC = 'claude-sonnet-4-20250514';
export const DEFAULT_LLM_MODEL_OPENAI = 'gpt-4o';
