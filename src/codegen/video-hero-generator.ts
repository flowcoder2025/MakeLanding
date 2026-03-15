import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VideoHeroConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, '../../templates/components/VideoHero.tsx');

const DATA_START_MARKER = '// @template-data-start';
const DATA_END_MARKER = '// @template-data-end';

export function generateVideoHero(config: VideoHeroConfig): string {
  const template = readFileSync(TEMPLATE_PATH, 'utf-8');

  const startIdx = template.indexOf(DATA_START_MARKER);
  const endIdx = template.indexOf(DATA_END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('VideoHero 템플릿에서 데이터 마커를 찾을 수 없습니다');
  }

  const dataSection = buildDataSection(config);

  return (
    template.slice(0, startIdx + DATA_START_MARKER.length) +
    '\n' +
    dataSection +
    template.slice(endIdx)
  );
}

function buildDataSection(config: VideoHeroConfig): string {
  const lines = [
    'const HERO_DATA = {',
    `  headline: ${JSON.stringify(config.headline)},`,
    `  subCopy: ${JSON.stringify(config.subCopy)},`,
    `  ctaPrimary: ${JSON.stringify(config.ctaPrimary)},`,
    `  ctaSecondary: ${JSON.stringify(config.ctaSecondary)},`,
    `  brandColor: ${JSON.stringify(config.brandColor)},`,
    `  videoSrc: ${JSON.stringify(config.videoSrc)},`,
    `  videoWebmSrc: ${JSON.stringify(config.videoWebmSrc)},`,
    `  posterSrc: ${JSON.stringify(config.posterSrc)},`,
    '};',
    '',
  ];
  return lines.join('\n');
}
