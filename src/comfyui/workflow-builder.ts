import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VideoStyle, WorkflowInput, ComfyUIWorkflow } from './workflow-types.js';
import {
  DEFAULT_VIDEO_WIDTH,
  DEFAULT_VIDEO_HEIGHT,
  DEFAULT_VIDEO_DURATION_SEC,
} from '../shared/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../../prompts/comfyui');

export const SUPPORTED_STYLES: readonly VideoStyle[] = [
  'realistic',
  '3d-product',
  '3d-character',
] as const;

const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, distorted, watermark, text, logo, deformed, ugly, bad anatomy';

const STYLE_TEMPLATE_MAP: Record<VideoStyle, string> = {
  'realistic': 'realistic.json',
  '3d-product': '3d-product.json',
  '3d-character': '3d-character.json',
};

export function buildWorkflow(input: WorkflowInput): ComfyUIWorkflow {
  if (!SUPPORTED_STYLES.includes(input.style)) {
    throw new Error(`지원하지 않는 비디오 스타일입니다: ${input.style}`);
  }

  const template = loadTemplate(input.style);
  return applyParameters(template, input);
}

function loadTemplate(style: VideoStyle): string {
  const filename = STYLE_TEMPLATE_MAP[style];
  const filepath = join(TEMPLATES_DIR, filename);
  return readFileSync(filepath, 'utf-8');
}

function applyParameters(template: string, input: WorkflowInput): ComfyUIWorkflow {
  const width = input.width ?? DEFAULT_VIDEO_WIDTH;
  const height = input.height ?? DEFAULT_VIDEO_HEIGHT;
  const durationSec = input.durationSec ?? DEFAULT_VIDEO_DURATION_SEC;
  const seed = input.seed ?? Math.floor(Math.random() * 2_147_483_647);
  const negativePrompt = input.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT;
  const numFrames = durationSec * 24;

  let result = template;
  result = replaceAll(result, '{{prompt}}', input.prompt);
  result = replaceAll(result, '{{negative_prompt}}', negativePrompt);
  result = replaceAll(result, '"{{width}}"', String(width));
  result = replaceAll(result, '"{{height}}"', String(height));
  result = replaceAll(result, '"{{seed}}"', String(seed));
  result = replaceAll(result, '"{{duration_sec}}"', String(durationSec));
  result = replaceAll(result, '"{{num_frames}}"', String(numFrames));

  return JSON.parse(result) as ComfyUIWorkflow;
}

function replaceAll(str: string, search: string, replacement: string): string {
  return str.split(search).join(replacement);
}
