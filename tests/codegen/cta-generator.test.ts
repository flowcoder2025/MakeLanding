import { describe, it, expect } from 'vitest';
import { generateCta } from '../../src/codegen/cta-generator.js';
import type { CtaConfig } from '../../src/codegen/types.js';

const SAMPLE_CONFIG: CtaConfig = {
  primaryText: '지금 시작하기',
  secondaryText: '더 알아보기',
  brandColor: '#E53E3E',
  primaryHref: '#signup',
  secondaryHref: '#features',
};

describe('generateCta', () => {
  it('Primary 버튼 텍스트가 포함된다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toContain('지금 시작하기');
  });

  it('Secondary 버튼 텍스트가 포함된다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toContain('더 알아보기');
  });

  it('브랜드 컬러가 CSS에 적용된다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toContain('#E53E3E');
  });

  it('Primary 버튼에 hover 효과가 포함된다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toContain('hover:');
  });

  it('Secondary 버튼에 ghost/outline 스타일이 포함된다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toContain('border');
  });

  it('Secondary 버튼에 화살표 아이콘이 포함된다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toMatch(/→|rarr|arrow|Arrow/);
  });

  it('유효한 React 컴포넌트 코드를 생성한다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toContain('export default function CtaButtons');
  });

  it('링크 href가 올바르게 적용된다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toContain('#signup');
    expect(result).toContain('#features');
  });

  it('다른 브랜드 정보로도 정상 생성한다', () => {
    const config: CtaConfig = {
      primaryText: 'Get Started',
      secondaryText: 'Learn More',
      brandColor: '#3B82F6',
      primaryHref: '#start',
      secondaryHref: '#about',
    };

    const result = generateCta(config);

    expect(result).toContain('Get Started');
    expect(result).toContain('Learn More');
    expect(result).toContain('#3B82F6');
    expect(result).toContain('#start');
    expect(result).toContain('#about');
  });

  it('반응형 클래스가 포함된다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).toMatch(/flex|gap/);
  });

  it('생성된 코드에 플레이스홀더가 남아있지 않다', () => {
    const result = generateCta(SAMPLE_CONFIG);

    expect(result).not.toMatch(/__[A-Z_]+__/);
  });
});
