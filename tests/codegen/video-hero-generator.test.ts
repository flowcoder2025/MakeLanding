import { describe, it, expect } from 'vitest';
import { generateVideoHero } from '../../src/codegen/video-hero-generator.js';
import type { VideoHeroConfig } from '../../src/codegen/types.js';

const SAMPLE_CONFIG: VideoHeroConfig = {
  headline: ['미래를', '코딩하다'],
  subCopy: '당신의 첫 번째 코드가 세상을 바꿉니다',
  ctaPrimary: '지금 시작하기',
  ctaSecondary: '커리큘럼 보기',
  brandColor: '#3B82F6',
  videoSrc: '/videos/hero-bg.mp4',
  videoWebmSrc: '/videos/hero-bg.webm',
  posterSrc: '/videos/hero-poster.jpg',
};

describe('generateVideoHero', () => {
  it('헤드라인 텍스트가 포함된 컴포넌트를 생성한다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain('미래를');
    expect(result).toContain('코딩하다');
  });

  it('서브카피와 CTA 텍스트가 포함된다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain('당신의 첫 번째 코드가 세상을 바꿉니다');
    expect(result).toContain('지금 시작하기');
    expect(result).toContain('커리큘럼 보기');
  });

  it('비디오 소스 경로가 포함된다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain('/videos/hero-bg.mp4');
    expect(result).toContain('/videos/hero-bg.webm');
    expect(result).toContain('/videos/hero-poster.jpg');
  });

  it('브랜드 컬러가 포함된다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain('#3B82F6');
  });

  it('use client 지시자가 포함된다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain("'use client'");
  });

  it('video 태그에 autoplay, muted, loop 속성이 포함된다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain('autoPlay');
    expect(result).toContain('muted');
    expect(result).toContain('loop');
  });

  it('GSAP 애니메이션 코드가 포함된다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain('gsap');
  });

  it('반응형 클래스가 포함된다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain('md:');
  });

  it('다크 오버레이가 포함된다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).toContain('bg-gradient');
  });

  it('3줄 헤드라인도 정상 처리한다', () => {
    const config: VideoHeroConfig = {
      ...SAMPLE_CONFIG,
      headline: ['무한한', '가능성을', '현실로'],
    };
    const result = generateVideoHero(config);

    expect(result).toContain('무한한');
    expect(result).toContain('가능성을');
    expect(result).toContain('현실로');
  });

  it('다른 브랜드 컬러로 생성할 수 있다', () => {
    const config: VideoHeroConfig = {
      ...SAMPLE_CONFIG,
      brandColor: '#E53E3E',
    };
    const result = generateVideoHero(config);

    expect(result).toContain('#E53E3E');
    expect(result).not.toContain('#3B82F6');
  });

  it('생성된 코드에 플레이스홀더가 남아있지 않다', () => {
    const result = generateVideoHero(SAMPLE_CONFIG);

    expect(result).not.toMatch(/__[A-Z_]+__/);
  });
});
