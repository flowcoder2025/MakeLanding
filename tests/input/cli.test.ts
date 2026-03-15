import { describe, it, expect } from 'vitest';
import { resolveInput } from '../../src/input/cli.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, afterEach } from 'vitest';

const TMP_DIR = join(import.meta.dirname, '__tmp__');

beforeEach(async () => {
  await mkdir(TMP_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('resolveInput', () => {
  it('CLI 옵션으로 BusinessInput을 생성한다', async () => {
    const result = await resolveInput({
      name: '필승 에듀',
      industry: '교육',
      message: '합격을 책임집니다',
      target: '수험생',
    });

    expect(result).toEqual({
      businessName: '필승 에듀',
      industry: '교육',
      coreMessage: '합격을 책임집니다',
      targetCustomer: '수험생',
    });
  });

  it('필수 옵션이 누락되면 에러를 던진다', async () => {
    await expect(
      resolveInput({ name: '테스트' }),
    ).rejects.toThrow('다음 옵션이 필요합니다');
  });

  it('--config 옵션으로 JSON 파일을 로드한다', async () => {
    const config = {
      businessName: '테스트 비즈',
      industry: 'IT',
      coreMessage: '혁신',
      targetCustomer: '개발자',
    };
    const filePath = join(TMP_DIR, 'config.json');
    await writeFile(filePath, JSON.stringify(config), { encoding: 'utf-8' });

    const result = await resolveInput({ config: filePath });

    expect(result).toEqual(config);
  });

  it('--config가 있으면 CLI 옵션은 무시된다', async () => {
    const config = {
      businessName: '파일 비즈',
      industry: '파일 업종',
      coreMessage: '파일 메시지',
      targetCustomer: '파일 고객',
    };
    const filePath = join(TMP_DIR, 'priority.json');
    await writeFile(filePath, JSON.stringify(config), { encoding: 'utf-8' });

    const result = await resolveInput({
      config: filePath,
      name: 'CLI 비즈',
      industry: 'CLI 업종',
      message: 'CLI 메시지',
      target: 'CLI 고객',
    });

    expect(result.businessName).toBe('파일 비즈');
  });
});
