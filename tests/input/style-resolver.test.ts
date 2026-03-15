import { describe, it, expect } from 'vitest';
import { resolveBrandStyle } from '../../src/input/style-resolver.js';
import type { LandingPageInput } from '../../src/shared/types.js';

const baseInput: LandingPageInput = {
  businessName: '테스트',
  industry: '기술',
  coreMessage: '혁신적인 솔루션',
  targetAudience: '기업 고객',
};

function isValidHex(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

describe('resolveBrandStyle', () => {
  it('유효한 BrandStyle 객체를 반환한다', () => {
    const style = resolveBrandStyle(baseInput);

    expect(style).toBeDefined();
    expect(style.colors).toBeDefined();
    expect(style.fontStyle).toBeDefined();
    expect(style.videoStyle).toBeDefined();
  });

  it('모든 컬러가 유효한 HEX 형식이다', () => {
    const style = resolveBrandStyle(baseInput);

    expect(isValidHex(style.colors.primary)).toBe(true);
    expect(isValidHex(style.colors.secondary)).toBe(true);
    expect(isValidHex(style.colors.accent)).toBe(true);
    expect(isValidHex(style.colors.background)).toBe(true);
    expect(isValidHex(style.colors.text)).toBe(true);
  });

  it('fontStyle이 허용된 값 중 하나이다', () => {
    const style = resolveBrandStyle(baseInput);
    const allowed = ['modern', 'classic', 'bold', 'elegant'];
    expect(allowed).toContain(style.fontStyle);
  });

  it('videoStyle이 허용된 값 중 하나이다', () => {
    const style = resolveBrandStyle(baseInput);
    const allowed = ['realistic', '3d-product', '3d-character'];
    expect(allowed).toContain(style.videoStyle);
  });

  describe('업종별 비디오 스타일 결정', () => {
    it('교육 업종은 realistic 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '교육' });
      expect(style.videoStyle).toBe('realistic');
    });

    it('학원 업종은 realistic 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '학원' });
      expect(style.videoStyle).toBe('realistic');
    });

    it('카페 업종은 3d-product 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '카페' });
      expect(style.videoStyle).toBe('3d-product');
    });

    it('음식 업종은 3d-product 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '음식' });
      expect(style.videoStyle).toBe('3d-product');
    });

    it('화장품 업종은 3d-product 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '화장품' });
      expect(style.videoStyle).toBe('3d-product');
    });

    it('게임 업종은 3d-character 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '게임' });
      expect(style.videoStyle).toBe('3d-character');
    });

    it('애니메이션 업종은 3d-character 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '애니메이션' });
      expect(style.videoStyle).toBe('3d-character');
    });

    it('부동산 업종은 realistic 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '부동산' });
      expect(style.videoStyle).toBe('realistic');
    });

    it('금융 업종은 realistic 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '금융' });
      expect(style.videoStyle).toBe('realistic');
    });

    it('제조 업종은 3d-product 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '제조' });
      expect(style.videoStyle).toBe('3d-product');
    });
  });

  describe('업종별 폰트 스타일 결정', () => {
    it('기술 업종은 modern 폰트를 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '기술' });
      expect(style.fontStyle).toBe('modern');
    });

    it('카페 업종은 elegant 폰트를 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '카페' });
      expect(style.fontStyle).toBe('elegant');
    });

    it('교육 업종은 bold 폰트를 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '교육' });
      expect(style.fontStyle).toBe('bold');
    });

    it('금융 업종은 classic 폰트를 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '금융' });
      expect(style.fontStyle).toBe('classic');
    });
  });

  describe('업종별 컬러 팔레트 결정', () => {
    it('같은 업종은 항상 같은 컬러를 반환한다 (결정론적)', () => {
      const style1 = resolveBrandStyle({ ...baseInput, industry: '카페' });
      const style2 = resolveBrandStyle({ ...baseInput, industry: '카페' });
      expect(style1.colors).toEqual(style2.colors);
    });

    it('다른 업종은 다른 primary 컬러를 반환한다', () => {
      const cafe = resolveBrandStyle({ ...baseInput, industry: '카페' });
      const tech = resolveBrandStyle({ ...baseInput, industry: '기술' });
      expect(cafe.colors.primary).not.toBe(tech.colors.primary);
    });
  });

  describe('알 수 없는 업종 처리', () => {
    it('알 수 없는 업종에도 기본 스타일을 반환한다', () => {
      const style = resolveBrandStyle({ ...baseInput, industry: '우주탐사' });
      expect(style.videoStyle).toBe('realistic');
      expect(style.fontStyle).toBe('modern');
      expect(isValidHex(style.colors.primary)).toBe(true);
    });
  });

  describe('복합 키워드 매칭', () => {
    it('업종에 키워드가 포함되면 매칭한다', () => {
      const style = resolveBrandStyle({
        ...baseInput,
        industry: '온라인 교육 플랫폼',
      });
      expect(style.videoStyle).toBe('realistic');
      expect(style.fontStyle).toBe('bold');
    });
  });
});
