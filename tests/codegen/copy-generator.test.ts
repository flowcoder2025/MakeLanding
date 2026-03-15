import { describe, it, expect, vi } from 'vitest';
import { generateCopy } from '../../src/codegen/copy-generator.js';
import type { LandingPageInput } from '../../src/shared/types.js';
import type { LlmClient } from '../../src/codegen/types.js';

const SAMPLE_INPUT: LandingPageInput = {
  businessName: '테크스쿨',
  industry: '교육',
  coreMessage: '미래를 코딩하다',
  targetAudience: '개발자 지망생',
};

const VALID_COPY_JSON = JSON.stringify({
  headline: ['미래를', '코딩하다'],
  subCopy: '당신의 첫 번째 코드가 세상을 바꿉니다',
  ctaPrimary: '지금 시작하기',
  ctaSecondary: '커리큘럼 보기',
  navItems: ['소개', '커리큘럼', '수강후기', '문의'],
});

function createMockLlmClient(response: string): LlmClient {
  return vi.fn().mockResolvedValue(response);
}

describe('generateCopy', () => {
  it('LLM 응답을 파싱하여 CopyResult를 반환한다', async () => {
    const mockClient = createMockLlmClient(VALID_COPY_JSON);

    const result = await generateCopy(SAMPLE_INPUT, mockClient);

    expect(result.headline).toEqual(['미래를', '코딩하다']);
    expect(result.subCopy).toBe('당신의 첫 번째 코드가 세상을 바꿉니다');
    expect(result.ctaPrimary).toBe('지금 시작하기');
    expect(result.ctaSecondary).toBe('커리큘럼 보기');
    expect(result.navItems).toEqual(['소개', '커리큘럼', '수강후기', '문의']);
  });

  it('마크다운 코드블록으로 감싼 JSON 응답을 처리한다', async () => {
    const wrapped = '```json\n' + VALID_COPY_JSON + '\n```';
    const mockClient = createMockLlmClient(wrapped);

    const result = await generateCopy(SAMPLE_INPUT, mockClient);

    expect(result.headline).toEqual(['미래를', '코딩하다']);
    expect(result.ctaPrimary).toBe('지금 시작하기');
  });

  it('프롬프트에 비즈니스 정보가 포함된다', async () => {
    const mockClient = createMockLlmClient(VALID_COPY_JSON);

    await generateCopy(SAMPLE_INPUT, mockClient);

    expect(mockClient).toHaveBeenCalledOnce();
    const [systemPrompt, userMessage] = (mockClient as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(userMessage).toContain('테크스쿨');
    expect(userMessage).toContain('교육');
    expect(userMessage).toContain('미래를 코딩하다');
    expect(userMessage).toContain('개발자 지망생');
    expect(systemPrompt).toBeTruthy();
  });

  it('headline이 배열이 아니면 에러를 던진다', async () => {
    const invalid = JSON.stringify({
      headline: '한 줄짜리',
      subCopy: '서브',
      ctaPrimary: 'CTA',
      ctaSecondary: '보조',
      navItems: ['메뉴'],
    });
    const mockClient = createMockLlmClient(invalid);

    await expect(generateCopy(SAMPLE_INPUT, mockClient)).rejects.toThrow();
  });

  it('필수 필드가 누락되면 에러를 던진다', async () => {
    const missing = JSON.stringify({
      headline: ['제목'],
      subCopy: '서브',
    });
    const mockClient = createMockLlmClient(missing);

    await expect(generateCopy(SAMPLE_INPUT, mockClient)).rejects.toThrow();
  });

  it('JSON 파싱 실패 시 에러를 던진다', async () => {
    const mockClient = createMockLlmClient('이것은 JSON이 아닙니다');

    await expect(generateCopy(SAMPLE_INPUT, mockClient)).rejects.toThrow();
  });

  it('headline이 2~3줄인 결과를 정상 처리한다', async () => {
    const threeLines = JSON.stringify({
      headline: ['무한한', '가능성을', '현실로'],
      subCopy: 'AI가 만드는 새로운 세계',
      ctaPrimary: '시작하기',
      ctaSecondary: '더 알아보기',
      navItems: ['소개', '기능', '가격', '문의'],
    });
    const mockClient = createMockLlmClient(threeLines);

    const result = await generateCopy(SAMPLE_INPUT, mockClient);

    expect(result.headline).toHaveLength(3);
    expect(result.headline[2]).toBe('현실로');
  });
});
