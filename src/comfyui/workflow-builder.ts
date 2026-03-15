import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  VideoStyle,
  ComfyUIWorkflow,
  WorkflowConfig,
} from './workflow-types.js';
import {
  DEFAULT_VIDEO_WIDTH,
  DEFAULT_VIDEO_HEIGHT,
  DEFAULT_VIDEO_DURATION_SEC,
} from '../shared/constants.js';

const DEFAULT_FPS = 8;
const DEFAULT_NEGATIVE_PROMPT =
  'low quality, blurry, distorted, deformed, disfigured, bad anatomy, watermark, text, logo, ugly, duplicate, error';

const STYLE_FILE_MAP: Record<VideoStyle, string> = {
  'realistic': 'realistic.json',
  '3d-product': '3d-product.json',
  '3d-character': '3d-character.json',
};

export function getAvailableStyles(): VideoStyle[] {
  return Object.keys(STYLE_FILE_MAP) as VideoStyle[];
}

export async function loadWorkflowTemplate(
  style: VideoStyle,
  promptsDir?: string,
): Promise<ComfyUIWorkflow> {
  const dir = promptsDir ?? join(process.cwd(), 'prompts', 'comfyui');
  const filePath = join(dir, STYLE_FILE_MAP[style]);
  const content = await readFile(filePath, { encoding: 'utf-8' });
  return JSON.parse(content) as ComfyUIWorkflow;
}

export function buildWorkflow(
  template: ComfyUIWorkflow,
  config: WorkflowConfig,
): ComfyUIWorkflow {
  const defaultFrameCount = DEFAULT_VIDEO_DURATION_SEC * DEFAULT_FPS;

  const vars: Record<string, string | number> = {
    '{{positive_prompt}}': config.positivePrompt,
    '{{negative_prompt}}': config.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT,
    '{{width}}': config.width ?? DEFAULT_VIDEO_WIDTH,
    '{{height}}': config.height ?? DEFAULT_VIDEO_HEIGHT,
    '{{frame_count}}': config.frameCount ?? defaultFrameCount,
    '{{fps}}': config.fps ?? DEFAULT_FPS,
    '{{seed}}': config.seed ?? randomSeed(),
  };

  const workflow = structuredClone(template);

  for (const node of Object.values(workflow)) {
    substituteInputs(node.inputs, vars);
  }

  return workflow;
}

function substituteInputs(
  inputs: Record<string, unknown>,
  vars: Record<string, string | number>,
): void {
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value !== 'string') continue;

    // Exact match: return the raw value, preserving numeric type
    if (value in vars) {
      inputs[key] = vars[value];
      continue;
    }

    // Partial match: string interpolation
    let result = value;
    for (const [placeholder, replacement] of Object.entries(vars)) {
      if (result.includes(placeholder)) {
        result = result.replaceAll(placeholder, String(replacement));
      }
    }
    if (result !== value) {
      inputs[key] = result;
    }
  }
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
