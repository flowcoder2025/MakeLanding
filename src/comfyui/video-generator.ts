import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createComfyUIClient } from './client.js';
import { buildWorkflow } from './workflow-builder.js';
import { buildVideoPrompt } from './prompt-builder.js';
import { COMFYUI_URL } from '../shared/constants.js';
import type { LandingPageInput } from '../shared/types.js';
import type { StyleConfig } from '../codegen/types.js';
import type { PromptHistoryEntry, PromptHistoryOutput } from './types.js';

const VIDEO_TIMEOUT_MS = 600_000;

export async function generateVideo(
  input: LandingPageInput,
  style: StyleConfig,
): Promise<string> {
  const client = createComfyUIClient({ baseUrl: COMFYUI_URL });

  const prompt = buildVideoPrompt(input, style.videoStyle);
  const workflow = buildWorkflow({ prompt, style: style.videoStyle });

  const promptId = await client.queuePrompt(workflow);
  const result = await client.waitForCompletion(promptId, VIDEO_TIMEOUT_MS);

  const outputFile = extractOutputFile(result);
  const buffer = await client.getImage(
    outputFile.filename,
    outputFile.subfolder,
    outputFile.type,
  );

  const tempDir = join(tmpdir(), 'makelanding-video');
  mkdirSync(tempDir, { recursive: true });
  const tempPath = join(tempDir, `${randomUUID()}.mp4`);
  writeFileSync(tempPath, buffer);

  return tempPath;
}

function extractOutputFile(
  entry: PromptHistoryEntry,
): { filename: string; subfolder: string; type: string } {
  for (const output of Object.values(entry.outputs)) {
    const file = findFile(output);
    if (file) return file;
  }
  throw new Error('ComfyUI 출력 결과에서 비디오 파일을 찾을 수 없습니다');
}

function findFile(
  output: PromptHistoryOutput,
): { filename: string; subfolder: string; type: string } | null {
  if (output.gifs && output.gifs.length > 0) return output.gifs[0];
  if (output.images && output.images.length > 0) return output.images[0];
  return null;
}
