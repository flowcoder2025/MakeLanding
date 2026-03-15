import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CtaConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, '../../templates/components/CtaButtons.tsx');

const DATA_START_MARKER = '// @template-data-start';
const DATA_END_MARKER = '// @template-data-end';

export function generateCta(config: CtaConfig): string {
  const template = readFileSync(TEMPLATE_PATH, 'utf-8');

  const startIdx = template.indexOf(DATA_START_MARKER);
  const endIdx = template.indexOf(DATA_END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('CtaButtons 템플릿에서 데이터 마커를 찾을 수 없습니다');
  }

  const dataSection = buildDataSection(config);

  return (
    template.slice(0, startIdx + DATA_START_MARKER.length) +
    '\n' +
    dataSection +
    template.slice(endIdx)
  );
}

function buildDataSection(config: CtaConfig): string {
  const lines = [
    'const CTA_DATA = {',
    `  primaryText: ${JSON.stringify(config.primaryText)},`,
    `  secondaryText: ${JSON.stringify(config.secondaryText)},`,
    `  brandColor: ${JSON.stringify(config.brandColor)},`,
    `  primaryHref: ${JSON.stringify(config.primaryHref)},`,
    `  secondaryHref: ${JSON.stringify(config.secondaryHref)},`,
    '};',
    '',
  ];
  return lines.join('\n');
}
