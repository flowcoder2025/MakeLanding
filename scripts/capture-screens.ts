/**
 * Puppeteer로 desktop/mobile 스크린샷 캡처
 * Usage: npx tsx scripts/capture-screens.ts <page.html> [output-dir]
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = process.argv[2] ?? 'outputs/page.html';
const outDir = process.argv[3] ?? 'outputs/screenshots';

mkdirSync(outDir, { recursive: true });

const fileUrl = `file:///${resolve(pagePath).replace(/\\/g, '/')}`;

async function capture() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Desktop
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `${outDir}/desktop.png`, fullPage: true });
  console.log('✅ desktop.png');

  // Mobile
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `${outDir}/mobile.png`, fullPage: true });
  console.log('✅ mobile.png');

  await browser.close();
}

capture().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
