'use client';

import { useState, useEffect } from 'react';

interface NavbarProps {
  businessName: string;
  navItems: string[];
  ctaText: string;
  brandColor: string;
}

export default function Navbar({ businessName, navItems, ctaText, brandColor }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/90 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* 로고 (좌) */}
        <a href="#" className="text-white text-xl font-bold tracking-tight">
          {businessName}
        </a>

        {/* 메뉴 (중앙) - 데스크톱 */}
        <ul className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <li key={item}>
              <a
                href={`#${item}`}
                className="text-white/80 hover:text-white text-sm font-medium tracking-wide transition-colors"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA 버튼 (우) - 데스크톱 */}
        <a
          href="#cta"
          className="hidden md:inline-block px-5 py-2.5 text-sm font-semibold text-white rounded-full transition-all hover:opacity-90"
          style={{ backgroundColor: brandColor }}
        >
          {ctaText}
        </a>

        {/* 햄버거 버튼 - 모바일 */}
        <button
          type="button"
          className="md:hidden text-white p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="메뉴 열기"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* 모바일 메뉴 */}
      {isOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md">
          <ul className="px-6 py-4 space-y-4">
            {navItems.map((item) => (
              <li key={item}>
                <a
                  href={`#${item}`}
                  className="block text-white/80 hover:text-white text-base font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#cta"
                className="inline-block mt-2 px-5 py-2.5 text-sm font-semibold text-white rounded-full transition-all"
                style={{ backgroundColor: brandColor }}
                onClick={() => setIsOpen(false)}
              >
                {ctaText}
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
