import { describe, it, expect } from 'vitest';
import { validateInput } from '../../src/input/validator.js';
import type { LandingPageInput } from '../../src/shared/types.js';

describe('validateInput', () => {
  const validInput: LandingPageInput = {
    businessName: '스타트업카페',
    industry: '카페',
    coreMessage: '최고의 커피를 제공합니다',
    targetAudience: '20-30대 직장인',
  };

  it('유효한 입력을 통과시킨다', () => {
    expect(() => validateInput(validInput)).not.toThrow();
  });

  it('businessName이 빈 문자열이면 에러를 던진다', () => {
    expect(() =>
      validateInput({ ...validInput, businessName: '' }),
    ).toThrow('businessName');
  });

  it('industry가 빈 문자열이면 에러를 던진다', () => {
    expect(() =>
      validateInput({ ...validInput, industry: '' }),
    ).toThrow('industry');
  });

  it('coreMessage가 빈 문자열이면 에러를 던진다', () => {
    expect(() =>
      validateInput({ ...validInput, coreMessage: '' }),
    ).toThrow('coreMessage');
  });

  it('targetAudience가 빈 문자열이면 에러를 던진다', () => {
    expect(() =>
      validateInput({ ...validInput, targetAudience: '' }),
    ).toThrow('targetAudience');
  });

  it('businessName이 누락되면 에러를 던진다', () => {
    const { businessName: _businessName, ...missing } = validInput;
    expect(() => validateInput(missing as LandingPageInput)).toThrow(
      'businessName',
    );
  });
});
