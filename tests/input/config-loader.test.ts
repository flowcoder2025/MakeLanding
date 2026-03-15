import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfigFile } from '../../src/input/config-loader.js';

describe('loadConfigFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `makelanding-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('JSON 설정 파일을 정상적으로 로드한다', () => {
    const configPath = join(tempDir, 'input.json');
    const config = {
      businessName: '스타트업카페',
      industry: '카페',
      coreMessage: '최고의 커피를 제공합니다',
      targetAudience: '20-30대 직장인',
    };
    writeFileSync(configPath, JSON.stringify(config), 'utf-8');

    const result = loadConfigFile(configPath);

    expect(result).toEqual(config);
  });

  it('존재하지 않는 파일이면 에러를 던진다', () => {
    expect(() => loadConfigFile('/nonexistent/path.json')).toThrow(
      '설정 파일을 찾을 수 없습니다',
    );
  });

  it('잘못된 JSON이면 에러를 던진다', () => {
    const configPath = join(tempDir, 'bad.json');
    writeFileSync(configPath, '{ invalid json }', 'utf-8');

    expect(() => loadConfigFile(configPath)).toThrow(
      '설정 파일 파싱에 실패했습니다',
    );
  });
});
