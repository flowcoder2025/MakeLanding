import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseCliArgs } from '../../src/input/cli-parser.js';

describe('parseCliArgs', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `makelanding-cli-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('--config 옵션으로 JSON 파일을 로드한다', () => {
    const configPath = join(tempDir, 'input.json');
    const config = {
      businessName: '테크스쿨',
      industry: '교육',
      coreMessage: '미래를 코딩하다',
      targetAudience: '개발자 지망생',
    };
    writeFileSync(configPath, JSON.stringify(config), 'utf-8');

    const result = parseCliArgs([
      'node',
      'makelanding',
      'generate',
      '--config',
      configPath,
    ]);

    expect(result).toEqual(config);
  });

  it('개별 CLI 옵션으로 입력을 받는다', () => {
    const result = parseCliArgs([
      'node',
      'makelanding',
      'generate',
      '--business-name',
      '헬스클럽',
      '--industry',
      '피트니스',
      '--core-message',
      '건강한 삶의 시작',
      '--target-audience',
      '30-40대 직장인',
    ]);

    expect(result).toEqual({
      businessName: '헬스클럽',
      industry: '피트니스',
      coreMessage: '건강한 삶의 시작',
      targetAudience: '30-40대 직장인',
    });
  });

  it('--config와 개별 옵션이 동시에 주어지면 개별 옵션이 우선한다', () => {
    const configPath = join(tempDir, 'input.json');
    const config = {
      businessName: '원래이름',
      industry: '원래업종',
      coreMessage: '원래메시지',
      targetAudience: '원래타겟',
    };
    writeFileSync(configPath, JSON.stringify(config), 'utf-8');

    const result = parseCliArgs([
      'node',
      'makelanding',
      'generate',
      '--config',
      configPath,
      '--business-name',
      '새이름',
    ]);

    expect(result.businessName).toBe('새이름');
    expect(result.industry).toBe('원래업종');
  });

  it('필수 필드가 누락되면 에러를 던진다', () => {
    expect(() =>
      parseCliArgs(['node', 'makelanding', 'generate']),
    ).toThrow();
  });
});
