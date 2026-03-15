import { describe, it, expect } from 'vitest';
import { resolveStyle } from '../../src/input/style-resolver.js';
import type { LandingPageInput } from '../../src/shared/types.js';

function makeInput(overrides: Partial<LandingPageInput> = {}): LandingPageInput {
  return {
    businessName: '테스트',
    industry: '기술',
    coreMessage: '혁신적인 솔루션',
    targetAudience: '개발자',
    ...overrides,
  };
}

describe('resolveStyle', () => {
  it('BrandStyle 객체를 반환한다', () => {
    const result = resolveStyle(makeInput());

    expect(result).toBeDefined();
    expect(result.colorPalette).toBeDefined();
    expect(result.colorPalette.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.colorPalette.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.colorPalette.background).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.colorPalette.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.fontStyle).toBeDefined();
    expect(result.videoType).toBeDefined();
  });

  it('교육 업종은 realistic 비디오 타입을 반환한다', () => {
    const result = resolveStyle(makeInput({ industry: '교육' }));

    expect(result.videoType).toBe('realistic');
  });

  it('화장품/뷰티 업종은 3d-product 비디오 타입을 반환한다', () => {
    const result = resolveStyle(makeInput({ industry: '화장품' }));
    expect(result.videoType).toBe('3d-product');

    const result2 = resolveStyle(makeInput({ industry: '뷰티' }));
    expect(result2.videoType).toBe('3d-product');
  });

  it('게임/엔터테인먼트 업종은 3d-character 비디오 타입을 반환한다', () => {
    const result = resolveStyle(makeInput({ industry: '게임' }));
    expect(result.videoType).toBe('3d-character');

    const result2 = resolveStyle(makeInput({ industry: '엔터테인먼트' }));
    expect(result2.videoType).toBe('3d-character');
  });

  it('식품/음료 업종은 3d-product 비디오 타입을 반환한다', () => {
    const result = resolveStyle(makeInput({ industry: '식품' }));
    expect(result.videoType).toBe('3d-product');

    const result2 = resolveStyle(makeInput({ industry: '음료' }));
    expect(result2.videoType).toBe('3d-product');
  });

  it('피트니스/헬스 업종은 realistic 비디오 타입을 반환한다', () => {
    const result = resolveStyle(makeInput({ industry: '피트니스' }));
    expect(result.videoType).toBe('realistic');

    const result2 = resolveStyle(makeInput({ industry: '헬스' }));
    expect(result2.videoType).toBe('realistic');
  });

  it('매핑되지 않은 업종은 기본 스타일을 반환한다', () => {
    const result = resolveStyle(makeInput({ industry: '알 수 없는 업종' }));

    expect(result.videoType).toBe('realistic');
    expect(result.fontStyle).toBe('modern');
  });

  it('업종별로 다른 컬러 팔레트를 반환한다', () => {
    const edu = resolveStyle(makeInput({ industry: '교육' }));
    const beauty = resolveStyle(makeInput({ industry: '화장품' }));

    expect(edu.colorPalette.primary).not.toBe(beauty.colorPalette.primary);
  });

  it('업종별로 적절한 폰트 스타일을 반환한다', () => {
    const luxury = resolveStyle(makeInput({ industry: '럭셔리' }));
    expect(luxury.fontStyle).toBe('elegant');

    const game = resolveStyle(makeInput({ industry: '게임' }));
    expect(game.fontStyle).toBe('playful');
  });

  it('금융 업종은 classic 폰트 스타일을 반환한다', () => {
    const result = resolveStyle(makeInput({ industry: '금융' }));
    expect(result.fontStyle).toBe('classic');
    expect(result.videoType).toBe('realistic');
  });

  it('technology/IT 업종은 modern 폰트를 반환한다', () => {
    const result = resolveStyle(makeInput({ industry: 'IT' }));
    expect(result.fontStyle).toBe('modern');

    const result2 = resolveStyle(makeInput({ industry: '기술' }));
    expect(result2.fontStyle).toBe('modern');
  });
});
