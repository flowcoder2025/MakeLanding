'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

// @template-data-start
const HERO_DATA = {
  headline: ['무한한 가능성을', '현실로'],
  subCopy: '당신의 비전이 시작되는 곳',
  ctaPrimary: '시작하기',
  ctaSecondary: '더 알아보기',
  brandColor: '#E53E3E',
  videoSrc: '/videos/hero-bg.mp4',
  videoWebmSrc: '/videos/hero-bg.webm',
  posterSrc: '/videos/hero-poster.jpg',
};
// @template-data-end

export default function VideoHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const headlineChars = headlineRef.current?.querySelectorAll('.hero-char');
      if (headlineChars) {
        gsap.fromTo(
          headlineChars,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.03,
            ease: 'power3.out',
          },
        );
      }

      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, x: 40 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            delay: 0.6,
            ease: 'power2.out',
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const renderHeadline = () =>
    HERO_DATA.headline.map((line, lineIdx) => (
      <h1
        key={lineIdx}
        className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
      >
        {line.split('').map((char, charIdx) => (
          <span key={charIdx} className="hero-char inline-block">
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </h1>
    ));

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster={HERO_DATA.posterSrc}
      >
        <source src={HERO_DATA.videoWebmSrc} type="video/webm" />
        <source src={HERO_DATA.videoSrc} type="video/mp4" />
      </video>

      {/* Dark Overlay with Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex h-full items-center px-6 md:px-16 lg:px-24">
        <div className="flex w-full flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-12">
          {/* Left: Headline */}
          <div ref={headlineRef} className="md:w-1/2">
            {renderHeadline()}
          </div>

          {/* Right: SubCopy + CTA */}
          <div ref={contentRef} className="md:w-1/2 md:text-right opacity-0">
            <p className="text-base md:text-lg text-white/80 mb-8 leading-relaxed">
              {HERO_DATA.subCopy}
            </p>
            <div className="flex gap-4 md:justify-end">
              <button
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:brightness-110 hover:scale-105"
                style={{ backgroundColor: HERO_DATA.brandColor }}
              >
                {HERO_DATA.ctaPrimary}
              </button>
              <button
                className="px-8 py-3 rounded-lg font-semibold text-white border border-white/30 transition-all duration-300 hover:bg-white/10"
              >
                {HERO_DATA.ctaSecondary} &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
