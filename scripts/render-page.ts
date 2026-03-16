/**
 * 레시피 기반 동적 렌더러
 * recipe.sections 배열 순서대로 섹션을 렌더링합니다.
 *
 * Usage: npx tsx scripts/render-page.ts <spec> <copy> <recipe> <output> [heroImage] [heroVideo]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// --- Types ---
interface LandingSpec {
  archetype: string;
  channel: string;
  offer: { name: string; core_promise: string; primary_cta_goal: string };
  visual_direction: { tone: string[]; theme: string; motion: string; density: string };
  constraints: { locale: string; device_priority: string };
}

interface LandingCopy {
  recipe_id: string;
  hero: { eyebrow?: string; headline: string; subheadline: string; primary_cta: string; secondary_cta?: string };
  proof_bar?: string[];
  benefits: Array<{ title: string; body: string }>;
  how_it_works?: Array<{ step?: string; title: string; body: string }>;
  testimonial?: { quote: string; name?: string; role?: string };
  faq: Array<{ q: string; a: string }>;
  seo: { title: string; description: string };
  visual_brief: { hero_scene: string; supporting_scene_1?: string; supporting_scene_2?: string };
}

interface RecipeResult {
  recipe_id: string;
  sections: string[];
  nav_items: string[];
  style_profile: string;
  style_tokens: string[];
}

// --- Theme tokens ---
function buildTheme(spec: LandingSpec) {
  const dark = spec.visual_direction.theme === 'dark';
  return {
    dark,
    bg: dark ? 'bg-gray-950 text-white' : 'bg-white text-gray-900',
    cardBg: dark ? 'bg-gray-900' : 'bg-gray-50',
    muted: dark ? 'text-gray-400' : 'text-gray-600',
    border: dark ? 'border-gray-800' : 'border-gray-200',
    ctaBg: dark ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800',
    ctaSec: dark ? 'border-gray-600 text-gray-300 hover:border-white hover:text-white' : 'border-gray-400 text-gray-700 hover:border-gray-900 hover:text-gray-900',
    navBg: dark ? 'bg-gray-950/80' : 'bg-white/80',
    navLink: dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900',
    stepCircle: dark ? 'bg-white text-gray-900' : 'bg-gray-900 text-white',
  };
}

// --- Section renderers (각각 독립적, 레시피 순서대로 호출됨) ---
const sectionRenderers: Record<string, (ctx: RenderContext) => string> = {
  hero: renderHero,
  proof_bar: renderProofBar,
  benefits: renderBenefits,
  how_it_works: renderHowItWorks,
  testimonial: renderTestimonial,
  faq: renderFaq,
  cta: renderFinalCta,
};

interface RenderContext {
  spec: LandingSpec;
  copy: LandingCopy;
  recipe: RecipeResult;
  theme: ReturnType<typeof buildTheme>;
  heroImagePath?: string;
  heroVideoPath?: string;
}

function renderHero(ctx: RenderContext): string {
  const { spec, copy, theme, heroImagePath, heroVideoPath } = ctx;
  const hasVisual = heroVideoPath || heroImagePath;

  let bgHtml = '';
  if (hasVisual) {
    const src = heroVideoPath ?? heroImagePath!;
    const overlay = theme.dark
      ? 'bg-gradient-to-r from-gray-950/90 via-gray-950/70 to-gray-950/30'
      : 'bg-gradient-to-r from-white/95 via-white/80 to-white/30';
    bgHtml = `
      <div class="absolute inset-0 z-0">
        <img src="${src}" alt="" class="w-full h-full object-cover" />
        <div class="absolute inset-0 ${overlay}"></div>
      </div>`;
  }

  const textColor = hasVisual && theme.dark ? 'text-white' : '';
  const muted = hasVisual && theme.dark ? 'text-gray-300' : theme.muted;
  const ctaBg = hasVisual && theme.dark ? 'bg-white text-gray-900 hover:bg-gray-100' : theme.ctaBg;
  const ctaSec = hasVisual && theme.dark
    ? 'border-white/60 text-white hover:border-white hover:bg-white/10'
    : theme.ctaSec;

  return `
    <section id="hero" class="min-h-screen flex items-center px-6 md:px-16 lg:px-24 pt-28 pb-20 relative overflow-hidden ${textColor}">
      ${bgHtml}
      <div class="relative z-10 max-w-3xl">
        ${copy.hero.eyebrow ? `<p class="text-sm font-medium ${muted} uppercase tracking-widest mb-4">${copy.hero.eyebrow}</p>` : ''}
        <h1 class="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight mb-6">
          ${copy.hero.headline}
        </h1>
        <p class="text-lg md:text-xl ${muted} max-w-2xl mb-10 leading-relaxed">
          ${copy.hero.subheadline}
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="#buy" class="inline-block px-8 py-4 rounded-lg font-semibold text-center transition-all ${ctaBg}">
            ${copy.hero.primary_cta}
          </a>
          ${copy.hero.secondary_cta ? `
          <a href="#details" class="inline-block px-8 py-4 rounded-lg font-semibold text-center border transition-all ${ctaSec}">
            ${copy.hero.secondary_cta}
          </a>` : ''}
        </div>
      </div>
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <svg class="w-6 h-6 ${muted}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
        </svg>
      </div>
    </section>`;
}

function renderProofBar(ctx: RenderContext): string {
  const { copy, theme } = ctx;
  if (!copy.proof_bar || copy.proof_bar.length === 0) return '';
  return `
    <section class="px-6 md:px-16 lg:px-24 py-8 border-y ${theme.border}">
      <div class="max-w-6xl mx-auto flex flex-wrap justify-center gap-8 md:gap-16">
        ${copy.proof_bar.map(item => `<span class="text-sm font-medium ${theme.muted}">${item}</span>`).join('\n        ')}
      </div>
    </section>`;
}

function renderBenefits(ctx: RenderContext): string {
  const { copy, theme } = ctx;
  const icons = [
    '<svg class="w-8 h-8 mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    '<svg class="w-8 h-8 mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    '<svg class="w-8 h-8 mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>',
    '<svg class="w-8 h-8 mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>',
  ];
  return `
    <section id="benefits" class="px-6 md:px-16 lg:px-24 py-20">
      <div class="max-w-6xl mx-auto">
        <div class="grid md:grid-cols-${Math.min(copy.benefits.length, 3)} gap-8">
          ${copy.benefits.map((b, i) => `
          <div class="${theme.cardBg} rounded-2xl p-8">
            ${icons[i] || ''}
            <h3 class="text-lg font-bold mb-3">${b.title}</h3>
            <p class="${theme.muted} leading-relaxed">${b.body}</p>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

function renderHowItWorks(ctx: RenderContext): string {
  const { copy, theme } = ctx;
  if (!copy.how_it_works || copy.how_it_works.length === 0) return '';
  return `
    <section id="how-it-works" class="px-6 md:px-16 lg:px-24 py-20 border-t ${theme.border}">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-center mb-16">이용 방법</h2>
        <div class="space-y-12">
          ${copy.how_it_works.map((step, i) => `
          <div class="flex gap-6">
            <div class="flex-shrink-0 w-10 h-10 rounded-full ${theme.stepCircle} flex items-center justify-center font-bold text-sm">
              ${step.step ?? i + 1}
            </div>
            <div>
              <h3 class="text-lg font-bold mb-2">${step.title}</h3>
              <p class="${theme.muted} leading-relaxed">${step.body}</p>
            </div>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

function renderTestimonial(ctx: RenderContext): string {
  const { copy, theme } = ctx;
  if (!copy.testimonial) return '';
  return `
    <section class="px-6 md:px-16 lg:px-24 py-20 border-t ${theme.border}">
      <div class="max-w-3xl mx-auto text-center">
        <blockquote class="text-xl md:text-2xl font-medium leading-relaxed mb-6">
          "${copy.testimonial.quote}"
        </blockquote>
        ${copy.testimonial.name ? `<p class="font-semibold">${copy.testimonial.name}</p>` : ''}
        ${copy.testimonial.role ? `<p class="${theme.muted} text-sm">${copy.testimonial.role}</p>` : ''}
      </div>
    </section>`;
}

function renderFaq(ctx: RenderContext): string {
  const { copy, theme } = ctx;
  return `
    <section id="faq" class="px-6 md:px-16 lg:px-24 py-20 border-t ${theme.border}">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-center mb-12">자주 묻는 질문</h2>
        <div class="space-y-6">
          ${copy.faq.map(item => `
          <details class="group border-b ${theme.border} pb-4">
            <summary class="flex justify-between items-center cursor-pointer font-semibold py-2">
              ${item.q}
              <span class="transition-transform group-open:rotate-45 text-xl">+</span>
            </summary>
            <p class="${theme.muted} mt-3 leading-relaxed">${item.a}</p>
          </details>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

function renderFinalCta(ctx: RenderContext): string {
  const { copy, theme } = ctx;
  return `
    <section id="buy" class="px-6 md:px-16 lg:px-24 py-20 border-t ${theme.border}">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-2xl md:text-3xl font-bold mb-4">${copy.hero.headline}</h2>
        <p class="${theme.muted} mb-8">${copy.hero.subheadline}</p>
        <a href="#" class="inline-block px-10 py-4 rounded-lg font-semibold text-lg transition-all ${theme.ctaBg}">
          ${copy.hero.primary_cta}
        </a>
      </div>
    </section>`;
}

// --- Navbar (레시피의 nav_items 사용) ---
function renderNavbar(ctx: RenderContext): string {
  const { spec, copy, recipe, theme } = ctx;
  const sectionIds: Record<string, string> = {
    '주요 기능': '#benefits', '제품 특징': '#benefits', '핵심 기능': '#benefits',
    '서비스': '#benefits', '소개': '#benefits', '특징': '#benefits',
    '이용 방법': '#how-it-works', '사용 흐름': '#how-it-works',
    '프로세스': '#how-it-works', '참여 방법': '#how-it-works',
    'FAQ': '#faq',
  };

  return `
    <nav class="fixed top-0 left-0 right-0 z-50 ${theme.navBg} backdrop-blur-md border-b ${theme.border}">
      <div class="max-w-7xl mx-auto px-6 md:px-16 lg:px-24 h-16 flex items-center justify-between">
        <span class="text-lg font-bold tracking-tight">${spec.offer.name}</span>
        <div class="hidden md:flex items-center gap-8">
          ${recipe.nav_items.map(label => `<a href="${sectionIds[label] || '#'}" class="text-sm font-medium transition-colors ${theme.navLink}">${label}</a>`).join('\n          ')}
          <a href="#buy" class="inline-block px-5 py-2 rounded-lg text-sm font-semibold transition-all ${theme.ctaBg}">
            ${copy.hero.primary_cta}
          </a>
        </div>
        <a href="#buy" class="md:hidden inline-block px-5 py-2 rounded-lg text-sm font-semibold transition-all ${theme.ctaBg}">
          ${copy.hero.primary_cta}
        </a>
      </div>
    </nav>`;
}

// --- Footer ---
function renderFooter(ctx: RenderContext): string {
  const { spec, theme } = ctx;
  return `
    <footer class="px-6 md:px-16 lg:px-24 py-8 border-t ${theme.border}">
      <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="font-bold text-lg">${spec.offer.name}</p>
        <p class="text-sm ${theme.muted}">&copy; 2026 ${spec.offer.name}. All rights reserved.</p>
      </div>
    </footer>`;
}

// --- Main renderer: 레시피 sections 순서대로 조합 ---
function renderHtml(ctx: RenderContext): string {
  const { spec, copy, recipe, theme } = ctx;

  const parts: string[] = [];

  // Navbar (항상 최상단)
  parts.push(renderNavbar(ctx));

  // 레시피 sections 순서대로 렌더링
  for (const section of recipe.sections) {
    const renderer = sectionRenderers[section];
    if (renderer) {
      const html = renderer(ctx);
      if (html) parts.push(html);
    }
  }

  // Footer (항상 최하단)
  parts.push(renderFooter(ctx));

  return `<!DOCTYPE html>
<html lang="${spec.constraints.locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${copy.seo.title}</title>
  <meta name="description" content="${copy.seo.description}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Pretendard', system-ui, sans-serif; }
    details summary::-webkit-details-marker { display: none; }
  </style>
</head>
<body class="${theme.bg}">
  ${parts.join('\n')}
</body>
</html>`;
}

// --- CLI ---
const specPath = process.argv[2] ?? 'outputs/spec.json';
const copyPath = process.argv[3] ?? 'outputs/copy.json';
const recipePath = process.argv[4] ?? 'outputs/recipe.json';
const outputPath = process.argv[5] ?? 'outputs/page.html';
const heroImagePath = process.argv[6] ?? undefined;
const heroVideoPath = process.argv[7] ?? undefined;

const spec: LandingSpec = JSON.parse(readFileSync(specPath, 'utf-8'));
const copy: LandingCopy = JSON.parse(readFileSync(copyPath, 'utf-8'));
const recipe: RecipeResult = JSON.parse(readFileSync(recipePath, 'utf-8'));
const theme = buildTheme(spec);

const ctx: RenderContext = { spec, copy, recipe, theme, heroImagePath, heroVideoPath };
const html = renderHtml(ctx);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, 'utf-8');
console.log(`✅ page → ${outputPath}`);
