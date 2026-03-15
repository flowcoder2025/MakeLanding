import { readFileSync, existsSync } from 'node:fs';
import type { LandingPageInput } from '../shared/types.js';

export function loadConfigFile(filePath: string): LandingPageInput {
  if (!existsSync(filePath)) {
    throw new Error(`설정 파일을 찾을 수 없습니다: ${filePath}`);
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`설정 파일을 읽을 수 없습니다: ${filePath}`);
  }

  try {
    return JSON.parse(raw) as LandingPageInput;
  } catch {
    throw new Error(`설정 파일 파싱에 실패했습니다: ${filePath}`);
  }
}
