import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LandingPageInput, CopyResult } from '../shared/types.js';
import type { LlmClient } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, '../../prompts/copy/landing-copy.txt');

export async function generateCopy(
  input: LandingPageInput,
  llmClient: LlmClient,
): Promise<CopyResult> {
  const systemPrompt = loadPromptTemplate();
  const userMessage = buildUserMessage(input);

  const rawResponse = await llmClient(systemPrompt, userMessage);
  return parseCopyResponse(rawResponse);
}

function loadPromptTemplate(): string {
  return readFileSync(PROMPT_PATH, 'utf-8');
}

function buildUserMessage(input: LandingPageInput): string {
  return [
    '## 비즈니스 정보',
    `- 비즈니스명: ${input.businessName}`,
    `- 업종: ${input.industry}`,
    `- 핵심 메시지: ${input.coreMessage}`,
    `- 타겟 고객: ${input.targetAudience}`,
    '',
    '위 정보를 바탕으로 프리미엄 랜딩 페이지 카피를 생성해주세요.',
  ].join('\n');
}

function parseCopyResponse(raw: string): CopyResult {
  const jsonStr = extractJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`LLM 응답을 JSON으로 파싱할 수 없습니다: ${raw.slice(0, 200)}`);
  }

  return validateCopyResult(parsed);
}

function extractJson(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return text.trim();
}

function validateCopyResult(data: unknown): CopyResult {
  if (typeof data !== 'object' || data === null) {
    throw new Error('LLM 응답이 올바른 객체 형식이 아닙니다');
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.headline)) {
    throw new Error('headline은 문자열 배열이어야 합니다');
  }

  if (obj.headline.length < 1 || obj.headline.length > 4) {
    throw new Error('headline은 1~4줄이어야 합니다');
  }

  for (const field of ['subCopy', 'ctaPrimary', 'ctaSecondary'] as const) {
    if (typeof obj[field] !== 'string' || (obj[field] as string).trim() === '') {
      throw new Error(`필수 필드가 누락되었습니다: ${field}`);
    }
  }

  if (!Array.isArray(obj.navItems) || obj.navItems.length === 0) {
    throw new Error('navItems는 비어있지 않은 문자열 배열이어야 합니다');
  }

  return {
    headline: obj.headline as string[],
    subCopy: obj.subCopy as string,
    ctaPrimary: obj.ctaPrimary as string,
    ctaSecondary: obj.ctaSecondary as string,
    navItems: obj.navItems as string[],
  };
}
