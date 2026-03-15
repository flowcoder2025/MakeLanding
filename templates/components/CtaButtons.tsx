'use client';

// @template-data-start
const CTA_DATA = {
  primaryText: '시작하기',
  secondaryText: '더 알아보기',
  brandColor: '#E53E3E',
  primaryHref: '#signup',
  secondaryHref: '#features',
};
// @template-data-end

export default function CtaButtons() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Primary: 브랜드 컬러 filled 버튼 */}
      <a
        href={CTA_DATA.primaryHref}
        className="inline-block px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:brightness-110 hover:scale-105 shadow-lg hover:shadow-xl"
        style={{ backgroundColor: CTA_DATA.brandColor }}
      >
        {CTA_DATA.primaryText}
      </a>

      {/* Secondary: ghost/outline 버튼 + 화살표 */}
      <a
        href={CTA_DATA.secondaryHref}
        className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-white border border-white/30 transition-all duration-300 hover:bg-white/10 hover:border-white/60"
      >
        {CTA_DATA.secondaryText}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </div>
  );
}
