import type { LandingPageInput } from '../shared/types.js';

const REQUIRED_FIELDS: (keyof LandingPageInput)[] = [
  'businessName',
  'industry',
  'coreMessage',
  'targetAudience',
];

export function validateInput(input: LandingPageInput): void {
  for (const field of REQUIRED_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null || value.trim() === '') {
      throw new Error(`필수 입력 항목이 누락되었습니다: ${field}`);
    }
  }
}
