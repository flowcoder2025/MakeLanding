import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generatePageCode,
  generateTailwindConfig,
  generateLayoutCode,
  generateGlobalsCss,
  generateNextConfig,
  generatePackageJson,
  assembleProject,
} from '../../src/codegen/page-assembler.js';
import type { CopyResult } from '../../src/shared/types.js';
import type { PageAssemblerInput, StyleConfig, VideoAssets } from '../../src/codegen/types.js';

const SAMPLE_COPY: CopyResult = {
  headline: ['미래를', '코딩하다'],
  subCopy: '당신의 첫 번째 코드가 세상을 바꿉니다',
  ctaPrimary: '지금 시작하기',
  ctaSecondary: '커리큘럼 보기',
  navItems: ['소개', '커리큘럼', '수강후기', '문의'],
};

const SAMPLE_STYLE: StyleConfig = {
  primaryColor: '#FF3B30',
  accentColor: '#FF9500',
  backgroundColor: '#0A0A0A',
  fontFamily: 'Pretendard',
  videoStyle: 'realistic',
};

let videoTmpDir: string;
const getSampleVideo = (): VideoAssets => ({
  mp4Path: join(videoTmpDir, 'hero-bg.mp4'),
  webmPath: join(videoTmpDir, 'hero-bg.webm'),
  posterPath: join(videoTmpDir, 'hero-poster.jpg'),
});

let SAMPLE_VIDEO: VideoAssets;
let SAMPLE_INPUT: PageAssemblerInput;

beforeEach(() => {
  videoTmpDir = mkdtempSync(join(tmpdir(), 'makelanding-video-'));
  SAMPLE_VIDEO = getSampleVideo();
  SAMPLE_INPUT = {
    projectName: 'test-landing',
    copy: SAMPLE_COPY,
    style: SAMPLE_STYLE,
    video: SAMPLE_VIDEO,
  };
});

afterEach(() => {
  try { rmSync(videoTmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('generatePageCode', () => {
  it('헤드라인과 서브카피가 포함된 페이지 코드를 생성한다', () => {
    const code = generatePageCode(SAMPLE_COPY, SAMPLE_STYLE, SAMPLE_VIDEO);

    expect(code).toContain('미래를');
    expect(code).toContain('코딩하다');
    expect(code).toContain('당신의 첫 번째 코드가 세상을 바꿉니다');
  });

  it('CTA 버튼 텍스트가 포함된다', () => {
    const code = generatePageCode(SAMPLE_COPY, SAMPLE_STYLE, SAMPLE_VIDEO);

    expect(code).toContain('지금 시작하기');
    expect(code).toContain('커리큘럼 보기');
  });

  it('네비게이션 항목이 포함된다', () => {
    const code = generatePageCode(SAMPLE_COPY, SAMPLE_STYLE, SAMPLE_VIDEO);

    for (const item of SAMPLE_COPY.navItems) {
      expect(code).toContain(item);
    }
  });

  it('비디오 파일 경로가 포함된다', () => {
    const code = generatePageCode(SAMPLE_COPY, SAMPLE_STYLE, SAMPLE_VIDEO);

    expect(code).toContain('hero-bg.mp4');
    expect(code).toContain('hero-bg.webm');
    expect(code).toContain('hero-poster.jpg');
  });

  it('유효한 TSX 구조를 갖는다', () => {
    const code = generatePageCode(SAMPLE_COPY, SAMPLE_STYLE, SAMPLE_VIDEO);

    expect(code).toContain('export default');
    expect(code).toMatch(/<Navbar/);
    expect(code).toMatch(/<VideoHero/);
  });

  it('3줄 이상의 헤드라인도 처리한다', () => {
    const multiCopy: CopyResult = {
      ...SAMPLE_COPY,
      headline: ['무한한', '가능성을', '현실로'],
    };
    const code = generatePageCode(multiCopy, SAMPLE_STYLE, SAMPLE_VIDEO);

    expect(code).toContain('무한한');
    expect(code).toContain('가능성을');
    expect(code).toContain('현실로');
  });
});

describe('generateTailwindConfig', () => {
  it('브랜드 컬러가 포함된 Tailwind 설정을 생성한다', () => {
    const config = generateTailwindConfig(SAMPLE_STYLE);

    expect(config).toContain('#FF3B30');
    expect(config).toContain('#FF9500');
    expect(config).toContain('#0A0A0A');
  });

  it('폰트 패밀리가 포함된다', () => {
    const config = generateTailwindConfig(SAMPLE_STYLE);

    expect(config).toContain('Pretendard');
  });

  it('content 경로가 올바르다', () => {
    const config = generateTailwindConfig(SAMPLE_STYLE);

    expect(config).toContain('./src/**/*.{ts,tsx}');
  });
});

describe('generateLayoutCode', () => {
  it('프로젝트명이 타이틀에 포함된다', () => {
    const layout = generateLayoutCode('my-landing');

    expect(layout).toContain('my-landing');
  });

  it('글로벌 CSS import가 포함된다', () => {
    const layout = generateLayoutCode('my-landing');

    expect(layout).toContain("'./globals.css'");
  });

  it('UTF-8 메타 태그가 포함된다', () => {
    const layout = generateLayoutCode('my-landing');

    expect(layout).toContain('utf-8');
  });
});

describe('generateGlobalsCss', () => {
  it('Tailwind 디렉티브가 포함된다', () => {
    const css = generateGlobalsCss();

    expect(css).toContain('@tailwind base');
    expect(css).toContain('@tailwind components');
    expect(css).toContain('@tailwind utilities');
  });
});

describe('generateNextConfig', () => {
  it('유효한 Next.js 설정을 생성한다', () => {
    const config = generateNextConfig();

    expect(config).toContain('nextConfig');
  });
});

describe('generatePackageJson', () => {
  it('프로젝트명이 포함된다', () => {
    const pkg = generatePackageJson('my-landing');
    const parsed = JSON.parse(pkg);

    expect(parsed.name).toBe('my-landing');
  });

  it('Next.js와 React 의존성이 포함된다', () => {
    const pkg = generatePackageJson('my-landing');
    const parsed = JSON.parse(pkg);

    expect(parsed.dependencies).toHaveProperty('next');
    expect(parsed.dependencies).toHaveProperty('react');
    expect(parsed.dependencies).toHaveProperty('react-dom');
  });

  it('Tailwind CSS 의존성이 포함된다', () => {
    const pkg = generatePackageJson('my-landing');
    const parsed = JSON.parse(pkg);

    expect(parsed.devDependencies).toHaveProperty('tailwindcss');
  });

  it('dev와 build 스크립트가 포함된다', () => {
    const pkg = generatePackageJson('my-landing');
    const parsed = JSON.parse(pkg);

    expect(parsed.scripts).toHaveProperty('dev');
    expect(parsed.scripts).toHaveProperty('build');
  });
});

describe('assembleProject', () => {
  let outputDir: string;
  let templatesDir: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'makelanding-test-'));
    templatesDir = mkdtempSync(join(tmpdir(), 'makelanding-tpl-'));

    const componentsDir = join(templatesDir, 'components');
    mkdirSync(componentsDir, { recursive: true });
    writeFileSync(
      join(componentsDir, 'VideoHero.tsx'),
      'export default function VideoHero() { return <div>hero</div>; }',
      'utf-8',
    );
    writeFileSync(
      join(componentsDir, 'Navbar.tsx'),
      'export default function Navbar() { return <nav>nav</nav>; }',
      'utf-8',
    );
    writeFileSync(
      join(componentsDir, 'CtaButtons.tsx'),
      'export default function CtaButtons() { return <div>cta</div>; }',
      'utf-8',
    );

    writeFileSync(SAMPLE_VIDEO.mp4Path, 'fake-mp4', 'utf-8');
    writeFileSync(SAMPLE_VIDEO.webmPath, 'fake-webm', 'utf-8');
    writeFileSync(SAMPLE_VIDEO.posterPath, 'fake-poster', 'utf-8');
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(templatesDir, { recursive: true, force: true });
  });

  it('출력 디렉토리에 Next.js 프로젝트를 생성한다', async () => {
    const projectDir = join(outputDir, SAMPLE_INPUT.projectName);
    await assembleProject(SAMPLE_INPUT, outputDir, templatesDir);

    expect(existsSync(join(projectDir, 'package.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'next.config.js'))).toBe(true);
    expect(existsSync(join(projectDir, 'tailwind.config.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src', 'app', 'page.tsx'))).toBe(true);
    expect(existsSync(join(projectDir, 'src', 'app', 'layout.tsx'))).toBe(true);
    expect(existsSync(join(projectDir, 'src', 'app', 'globals.css'))).toBe(true);
  });

  it('템플릿 컴포넌트가 복사된다', async () => {
    const projectDir = join(outputDir, SAMPLE_INPUT.projectName);
    await assembleProject(SAMPLE_INPUT, outputDir, templatesDir);

    expect(existsSync(join(projectDir, 'src', 'components', 'VideoHero.tsx'))).toBe(true);
    expect(existsSync(join(projectDir, 'src', 'components', 'Navbar.tsx'))).toBe(true);
    expect(existsSync(join(projectDir, 'src', 'components', 'CtaButtons.tsx'))).toBe(true);
  });

  it('비디오 에셋이 public 디렉토리에 복사된다', async () => {
    const projectDir = join(outputDir, SAMPLE_INPUT.projectName);
    await assembleProject(SAMPLE_INPUT, outputDir, templatesDir);

    expect(existsSync(join(projectDir, 'public', 'videos', 'hero-bg.mp4'))).toBe(true);
    expect(existsSync(join(projectDir, 'public', 'videos', 'hero-bg.webm'))).toBe(true);
    expect(existsSync(join(projectDir, 'public', 'videos', 'hero-poster.jpg'))).toBe(true);
  });

  it('page.tsx에 카피 데이터가 포함된다', async () => {
    const projectDir = join(outputDir, SAMPLE_INPUT.projectName);
    await assembleProject(SAMPLE_INPUT, outputDir, templatesDir);

    const pageContent = readFileSync(join(projectDir, 'src', 'app', 'page.tsx'), 'utf-8');
    expect(pageContent).toContain('미래를');
    expect(pageContent).toContain('지금 시작하기');
  });

  it('tailwind.config.ts에 브랜드 컬러가 포함된다', async () => {
    const projectDir = join(outputDir, SAMPLE_INPUT.projectName);
    await assembleProject(SAMPLE_INPUT, outputDir, templatesDir);

    const twConfig = readFileSync(join(projectDir, 'tailwind.config.ts'), 'utf-8');
    expect(twConfig).toContain('#FF3B30');
  });

  it('템플릿 디렉토리에 컴포넌트가 없어도 에러 없이 동작한다', async () => {
    const emptyTemplatesDir = mkdtempSync(join(tmpdir(), 'makelanding-empty-'));
    const projectDir = join(outputDir, 'empty-test');

    const input: PageAssemblerInput = { ...SAMPLE_INPUT, projectName: 'empty-test' };
    await assembleProject(input, outputDir, emptyTemplatesDir);

    expect(existsSync(join(projectDir, 'src', 'app', 'page.tsx'))).toBe(true);
    rmSync(emptyTemplatesDir, { recursive: true, force: true });
  });
});
