import { describe, it, expect } from 'vitest';
import { generateNavbar } from '../../src/codegen/navbar-generator.js';
import type { NavbarConfig } from '../../src/codegen/types.js';

const SAMPLE_CONFIG: NavbarConfig = {
  businessName: '테크스쿨',
  navItems: ['소개', '커리큘럼', '수강후기', '문의'],
  ctaText: '지금 시작하기',
  brandColor: '#E53E3E',
};

describe('generateNavbar', () => {
  it('비즈니스명을 로고 텍스트로 포함한다', () => {
    const result = generateNavbar(SAMPLE_CONFIG);

    expect(result).toContain('테크스쿨');
  });

  it('모든 네비게이션 메뉴 항목을 포함한다', () => {
    const result = generateNavbar(SAMPLE_CONFIG);

    for (const item of SAMPLE_CONFIG.navItems) {
      expect(result).toContain(item);
    }
  });

  it('CTA 버튼 텍스트를 포함한다', () => {
    const result = generateNavbar(SAMPLE_CONFIG);

    expect(result).toContain('지금 시작하기');
  });

  it('브랜드 컬러를 CSS에 적용한다', () => {
    const result = generateNavbar(SAMPLE_CONFIG);

    expect(result).toContain('#E53E3E');
  });

  it('고정 포지션(fixed) 스타일을 포함한다', () => {
    const result = generateNavbar(SAMPLE_CONFIG);

    expect(result).toContain('fixed');
  });

  it('스크롤 시 배경 전환 로직을 포함한다', () => {
    const result = generateNavbar(SAMPLE_CONFIG);

    expect(result).toContain('scroll');
  });

  it('모바일 햄버거 메뉴를 포함한다', () => {
    const result = generateNavbar(SAMPLE_CONFIG);

    expect(result).toMatch(/hamburger|mobile.*menu|menu.*open|isOpen/i);
  });

  it('유효한 React 컴포넌트 코드를 생성한다', () => {
    const result = generateNavbar(SAMPLE_CONFIG);

    expect(result).toContain('export default function Navbar');
    expect(result).toContain('useState');
  });

  it('다른 브랜드 정보로도 정상 생성한다', () => {
    const config: NavbarConfig = {
      businessName: 'NOURISH',
      navItems: ['About', 'Products', 'Contact'],
      ctaText: 'Shop Now',
      brandColor: '#D4A574',
    };

    const result = generateNavbar(config);

    expect(result).toContain('NOURISH');
    expect(result).toContain('Shop Now');
    expect(result).toContain('#D4A574');
    expect(result).toContain('Products');
  });

  it('navItems가 하나일 때도 정상 동작한다', () => {
    const config: NavbarConfig = {
      businessName: '심플',
      navItems: ['홈'],
      ctaText: '시작',
      brandColor: '#000000',
    };

    const result = generateNavbar(config);

    expect(result).toContain('홈');
    expect(result).toContain('심플');
  });
});
