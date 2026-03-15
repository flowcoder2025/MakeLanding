import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exportProject } from '../../src/preview/project-exporter.js';
import type { ExportConfig } from '../../src/preview/types.js';

const TEST_PAGE = `export default function Page() { return <div>Test</div>; }`;
const TEST_LAYOUT = `export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }`;
const TEST_CSS = `@tailwind base;\n@tailwind components;\n@tailwind utilities;`;

function createTestConfig(outputDir: string, overrides?: Partial<ExportConfig>): ExportConfig {
  return {
    outputDir,
    projectName: 'test-landing',
    pageContent: TEST_PAGE,
    layoutContent: TEST_LAYOUT,
    globalCss: TEST_CSS,
    tailwindConfig: {
      brandColor: '#FF5733',
      fontFamily: 'Pretendard',
    },
    ...overrides,
  };
}

describe('exportProject', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `makelanding-test-${Date.now()}`);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('출력 디렉토리에 Next.js 프로젝트 구조를 생성한다', async () => {
    const config = createTestConfig(testDir);

    const result = await exportProject(config);

    expect(result.outputDir).toBe(testDir);
    expect(existsSync(join(testDir, 'package.json'))).toBe(true);
    expect(existsSync(join(testDir, 'next.config.mjs'))).toBe(true);
    expect(existsSync(join(testDir, 'tailwind.config.ts'))).toBe(true);
    expect(existsSync(join(testDir, 'tsconfig.json'))).toBe(true);
    expect(existsSync(join(testDir, 'postcss.config.mjs'))).toBe(true);
  });

  it('app 디렉토리에 page.tsx와 layout.tsx를 생성한다', async () => {
    const config = createTestConfig(testDir);

    await exportProject(config);

    const pagePath = join(testDir, 'app', 'page.tsx');
    const layoutPath = join(testDir, 'app', 'layout.tsx');
    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(layoutPath)).toBe(true);
    expect(readFileSync(pagePath, 'utf-8')).toBe(TEST_PAGE);
    expect(readFileSync(layoutPath, 'utf-8')).toBe(TEST_LAYOUT);
  });

  it('글로벌 CSS를 app/globals.css에 생성한다', async () => {
    const config = createTestConfig(testDir);

    await exportProject(config);

    const cssPath = join(testDir, 'app', 'globals.css');
    expect(existsSync(cssPath)).toBe(true);
    expect(readFileSync(cssPath, 'utf-8')).toBe(TEST_CSS);
  });

  it('package.json에 Next.js, React, Tailwind 의존성이 포함된다', async () => {
    const config = createTestConfig(testDir);

    await exportProject(config);

    const pkg = JSON.parse(readFileSync(join(testDir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('test-landing');
    expect(pkg.dependencies).toHaveProperty('next');
    expect(pkg.dependencies).toHaveProperty('react');
    expect(pkg.dependencies).toHaveProperty('react-dom');
    expect(pkg.devDependencies).toHaveProperty('tailwindcss');
    expect(pkg.devDependencies).toHaveProperty('typescript');
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
  });

  it('tailwind.config.ts에 브랜드 컬러와 폰트가 포함된다', async () => {
    const config = createTestConfig(testDir);

    await exportProject(config);

    const tailwindContent = readFileSync(join(testDir, 'tailwind.config.ts'), 'utf-8');
    expect(tailwindContent).toContain('#FF5733');
    expect(tailwindContent).toContain('Pretendard');
  });

  it('비디오 에셋을 public/videos에 복사한다', async () => {
    const videoSourceDir = join(testDir, '_source_videos');
    mkdirSync(videoSourceDir, { recursive: true });
    const videoSource = join(videoSourceDir, 'hero-bg.mp4');
    writeFileSync(videoSource, 'fake-video-data');

    const config = createTestConfig(testDir, {
      videoAssets: [{ sourcePath: videoSource, fileName: 'hero-bg.mp4' }],
    });

    await exportProject(config);

    const videoDest = join(testDir, 'public', 'videos', 'hero-bg.mp4');
    expect(existsSync(videoDest)).toBe(true);
    expect(readFileSync(videoDest, 'utf-8')).toBe('fake-video-data');
  });

  it('비디오 에셋이 없으면 public/videos를 생성하지 않는다', async () => {
    const config = createTestConfig(testDir, { videoAssets: [] });

    await exportProject(config);

    expect(existsSync(join(testDir, 'public', 'videos'))).toBe(false);
  });

  it('출력 디렉토리가 없으면 자동 생성한다', async () => {
    const nestedDir = join(testDir, 'deep', 'nested', 'output');
    const config = createTestConfig(nestedDir);

    const result = await exportProject(config);

    expect(result.outputDir).toBe(nestedDir);
    expect(existsSync(join(nestedDir, 'package.json'))).toBe(true);
  });

  it('filesWritten에 생성된 파일 목록이 포함된다', async () => {
    const config = createTestConfig(testDir);

    const result = await exportProject(config);

    expect(result.filesWritten.length).toBeGreaterThan(0);
    expect(result.filesWritten).toContain('package.json');
    expect(result.filesWritten).toContain('app/page.tsx');
    expect(result.filesWritten).toContain('app/layout.tsx');
  });

  it('next.config.mjs에 비디오 관련 설정이 포함된다', async () => {
    const config = createTestConfig(testDir);

    await exportProject(config);

    const nextConfig = readFileSync(join(testDir, 'next.config.mjs'), 'utf-8');
    expect(nextConfig).toContain('export default');
  });

  it('소스 비디오 파일이 존재하지 않으면 에러를 던진다', async () => {
    const config = createTestConfig(testDir, {
      videoAssets: [{ sourcePath: '/nonexistent/video.mp4', fileName: 'hero.mp4' }],
    });

    await expect(exportProject(config)).rejects.toThrow();
  });
});
