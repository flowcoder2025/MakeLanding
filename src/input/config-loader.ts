import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BusinessInput } from '../shared/types.js';

const REQUIRED_FIELDS: (keyof BusinessInput)[] = [
  'businessName',
  'industry',
  'coreMessage',
  'targetCustomer',
];

export async function loadConfigFile(filePath: string): Promise<BusinessInput> {
  const absolutePath = resolve(filePath);
  const content = await readFile(absolutePath, { encoding: 'utf-8' });
  const parsed: unknown = JSON.parse(content);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('설정 파일은 JSON 객체여야 합니다.');
  }

  const record = parsed as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (typeof record[field] !== 'string' || record[field].trim() === '') {
      throw new Error(`필수 필드 "${field}"가 비어 있거나 누락되었습니다.`);
    }
  }

  return {
    businessName: (record.businessName as string).trim(),
    industry: (record.industry as string).trim(),
    coreMessage: (record.coreMessage as string).trim(),
    targetCustomer: (record.targetCustomer as string).trim(),
  };
}
