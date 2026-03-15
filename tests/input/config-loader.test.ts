import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfigFile } from '../../src/input/config-loader.js';

const TMP_DIR = join(import.meta.dirname, '__tmp__');

beforeEach(async () => {
  await mkdir(TMP_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('loadConfigFile', () => {
  it('올바른 JSON 설정 파일을 파싱한다', async () => {
    const config = {
      businessName: '필승 에듀',
      industry: '교육',
      coreMessage: '당신의 합격을 책임집니다',
      targetCustomer: '수험생',
    };
    const filePath = join(TMP_DIR, 'valid.json');
    await writeFile(filePath, JSON.stringify(config), { encoding: 'utf-8' });

    const result = await loadConfigFile(filePath);

    expect(result).toEqual(config);
  });

  it('필드 앞뒤 공백을 제거한다', async () => {
    const config = {
      businessName: '  필승 에듀  ',
      industry: ' 교육 ',
      coreMessage: ' 메시지 ',
      targetCustomer: ' 수험생 ',
    };
    const filePath = join(TMP_DIR, 'whitespace.json');
    await writeFile(filePath, JSON.stringify(config), { encoding: 'utf-8' });

    const result = await loadConfigFile(filePath);

    expect(result.businessName).toBe('필승 에듀');
    expect(result.industry).toBe('교육');
  });

  it('필수 필드가 누락되면 에러를 던진다', async () => {
    const config = { businessName: '테스트' };
    const filePath = join(TMP_DIR, 'missing.json');
    await writeFile(filePath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(loadConfigFile(filePath)).rejects.toThrow('필수 필드');
  });

  it('빈 문자열 필드는 에러를 던진다', async () => {
    const config = {
      businessName: '',
      industry: '교육',
      coreMessage: '메시지',
      targetCustomer: '고객',
    };
    const filePath = join(TMP_DIR, 'empty.json');
    await writeFile(filePath, JSON.stringify(config), { encoding: 'utf-8' });

    await expect(loadConfigFile(filePath)).rejects.toThrow('필수 필드');
  });

  it('존재하지 않는 파일은 에러를 던진다', async () => {
    await expect(loadConfigFile('/nonexistent/path.json')).rejects.toThrow();
  });

  it('유효하지 않은 JSON은 에러를 던진다', async () => {
    const filePath = join(TMP_DIR, 'invalid.json');
    await writeFile(filePath, 'not json', { encoding: 'utf-8' });

    await expect(loadConfigFile(filePath)).rejects.toThrow();
  });
});
