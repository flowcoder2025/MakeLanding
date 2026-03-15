import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../../src/pipeline/orchestrator.js';
import type { PipelineDeps, PipelineOptions, PipelineProgress, StyleConfig, VideoAssets, PageOutput } from '../../src/pipeline/types.js';
import type { LandingPageInput, CopyResult } from '../../src/shared/types.js';

const SAMPLE_INPUT: LandingPageInput = {
  businessName: '테크스쿨',
  industry: '교육',
  coreMessage: '미래를 코딩하다',
  targetAudience: '개발자 지망생',
};

const SAMPLE_COPY: CopyResult = {
  headline: ['미래를', '코딩하다'],
  subCopy: '당신의 첫 번째 코드가 세상을 바꿉니다',
  ctaPrimary: '지금 시작하기',
  ctaSecondary: '커리큘럼 보기',
  navItems: ['소개', '커리큘럼', '수강후기', '문의'],
};

const SAMPLE_STYLE: StyleConfig = {
  primaryColor: '#FF6B35',
  secondaryColor: '#004E98',
  backgroundColor: '#0A0A0A',
  fontFamily: 'Pretendard',
  videoStyle: 'realistic',
};

const SAMPLE_VIDEO: VideoAssets = {
  mp4Path: '/out/test-project/public/videos/hero-bg.mp4',
  webmPath: '/out/test-project/public/videos/hero-bg.webm',
  posterPath: '/out/test-project/public/videos/hero-poster.jpg',
};

const SAMPLE_PAGE: PageOutput = {
  outputDir: '/out/test-project',
  files: ['app/page.tsx', 'app/layout.tsx', 'tailwind.config.ts'],
};

function createMockDeps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    validateInput: vi.fn(),
    generateCopy: vi.fn<(input: LandingPageInput) => Promise<CopyResult>>().mockResolvedValue(SAMPLE_COPY),
    resolveStyle: vi.fn<(input: LandingPageInput) => Promise<StyleConfig>>().mockResolvedValue(SAMPLE_STYLE),
    generateVideo: vi.fn<(input: LandingPageInput, style: StyleConfig) => Promise<string>>().mockResolvedValue('/tmp/raw-video.mp4'),
    postprocessVideo: vi.fn<(rawVideoPath: string, outputDir: string) => Promise<VideoAssets>>().mockResolvedValue(SAMPLE_VIDEO),
    assemblePage: vi.fn<(copy: CopyResult, style: StyleConfig, video: VideoAssets | null, outputDir: string) => Promise<PageOutput>>().mockResolvedValue(SAMPLE_PAGE),
    exportProject: vi.fn<(pageOutput: PageOutput) => Promise<void>>().mockResolvedValue(),
    startPreview: vi.fn<(outputDir: string) => Promise<string>>().mockResolvedValue('http://localhost:3000'),
    ...overrides,
  };
}

function createOptions(overrides: Partial<PipelineOptions> = {}): PipelineOptions {
  return {
    input: SAMPLE_INPUT,
    outputDir: '/out/test-project',
    ...overrides,
  };
}

describe('runPipeline', () => {
  it('전체 파이프라인을 순서대로 실행한다', async () => {
    const deps = createMockDeps();
    const options = createOptions();

    const result = await runPipeline(options, deps);

    expect(deps.validateInput).toHaveBeenCalledWith(SAMPLE_INPUT);
    expect(deps.generateCopy).toHaveBeenCalledWith(SAMPLE_INPUT);
    expect(deps.resolveStyle).toHaveBeenCalledWith(SAMPLE_INPUT);
    expect(deps.generateVideo).toHaveBeenCalledWith(SAMPLE_INPUT, SAMPLE_STYLE);
    expect(deps.postprocessVideo).toHaveBeenCalledWith('/tmp/raw-video.mp4', '/out/test-project');
    expect(deps.assemblePage).toHaveBeenCalledWith(SAMPLE_COPY, SAMPLE_STYLE, SAMPLE_VIDEO, '/out/test-project');
    expect(deps.exportProject).toHaveBeenCalledWith(SAMPLE_PAGE);
    expect(deps.startPreview).toHaveBeenCalledWith('/out/test-project');

    expect(result.input).toEqual(SAMPLE_INPUT);
    expect(result.copy).toEqual(SAMPLE_COPY);
    expect(result.style).toEqual(SAMPLE_STYLE);
    expect(result.video).toEqual(SAMPLE_VIDEO);
    expect(result.page).toEqual(SAMPLE_PAGE);
    expect(result.previewUrl).toBe('http://localhost:3000');
  });

  it('skipVideo 옵션 시 비디오 단계를 건너뛴다', async () => {
    const deps = createMockDeps();
    const options = createOptions({ skipVideo: true });

    const result = await runPipeline(options, deps);

    expect(deps.generateVideo).not.toHaveBeenCalled();
    expect(deps.postprocessVideo).not.toHaveBeenCalled();
    expect(deps.assemblePage).toHaveBeenCalledWith(SAMPLE_COPY, SAMPLE_STYLE, null, '/out/test-project');
    expect(result.video).toBeNull();
  });

  it('skipPreview 옵션 시 프리뷰 단계를 건너뛴다', async () => {
    const deps = createMockDeps();
    const options = createOptions({ skipPreview: true });

    const result = await runPipeline(options, deps);

    expect(deps.startPreview).not.toHaveBeenCalled();
    expect(result.previewUrl).toBeNull();
  });

  it('입력 검증 실패 시 에러를 전파한다', async () => {
    const deps = createMockDeps({
      validateInput: vi.fn(() => { throw new Error('필수 입력 항목이 누락되었습니다: businessName'); }),
    });
    const options = createOptions();

    await expect(runPipeline(options, deps)).rejects.toThrow('필수 입력 항목이 누락되었습니다');
    expect(deps.generateCopy).not.toHaveBeenCalled();
  });

  it('카피 생성 실패 시 에러를 전파한다', async () => {
    const deps = createMockDeps({
      generateCopy: vi.fn().mockRejectedValue(new Error('LLM API 호출 실패')),
    });
    const options = createOptions();

    await expect(runPipeline(options, deps)).rejects.toThrow('LLM API 호출 실패');
  });

  it('비디오 생성 실패 시 에러를 전파한다', async () => {
    const deps = createMockDeps({
      generateVideo: vi.fn().mockRejectedValue(new Error('ComfyUI 서버에 연결할 수 없습니다')),
    });
    const options = createOptions();

    await expect(runPipeline(options, deps)).rejects.toThrow('ComfyUI 서버에 연결할 수 없습니다');
  });

  it('진행률 콜백이 각 단계마다 호출된다', async () => {
    const progressEvents: PipelineProgress[] = [];
    const deps = createMockDeps({
      onProgress: (p) => progressEvents.push({ ...p }),
    });
    const options = createOptions();

    await runPipeline(options, deps);

    const stages = progressEvents.map(p => p.stage);
    expect(stages).toContain('input-validation');
    expect(stages).toContain('copy-generation');
    expect(stages).toContain('style-resolution');
    expect(stages).toContain('video-generation');
    expect(stages).toContain('video-postprocess');
    expect(stages).toContain('code-generation');
    expect(stages).toContain('project-export');
    expect(stages).toContain('preview');

    const doneEvents = progressEvents.filter(p => p.status === 'done');
    expect(doneEvents.length).toBeGreaterThanOrEqual(8);
  });

  it('skipVideo 시 비디오 단계가 skipped로 보고된다', async () => {
    const progressEvents: PipelineProgress[] = [];
    const deps = createMockDeps({
      onProgress: (p) => progressEvents.push({ ...p }),
    });
    const options = createOptions({ skipVideo: true });

    await runPipeline(options, deps);

    const videoEvent = progressEvents.find(p => p.stage === 'video-generation' && p.status === 'skipped');
    expect(videoEvent).toBeDefined();

    const postprocessEvent = progressEvents.find(p => p.stage === 'video-postprocess' && p.status === 'skipped');
    expect(postprocessEvent).toBeDefined();
  });

  it('각 단계의 실행 순서가 보장된다', async () => {
    const callOrder: string[] = [];
    const deps = createMockDeps({
      validateInput: vi.fn(() => { callOrder.push('validate'); }),
      generateCopy: vi.fn(async () => { callOrder.push('copy'); return SAMPLE_COPY; }),
      resolveStyle: vi.fn(async () => { callOrder.push('style'); return SAMPLE_STYLE; }),
      generateVideo: vi.fn(async () => { callOrder.push('video'); return '/tmp/raw.mp4'; }),
      postprocessVideo: vi.fn(async () => { callOrder.push('postprocess'); return SAMPLE_VIDEO; }),
      assemblePage: vi.fn(async () => { callOrder.push('assemble'); return SAMPLE_PAGE; }),
      exportProject: vi.fn(async () => { callOrder.push('export'); }),
      startPreview: vi.fn(async () => { callOrder.push('preview'); return 'http://localhost:3000'; }),
    });
    const options = createOptions();

    await runPipeline(options, deps);

    expect(callOrder).toEqual([
      'validate', 'copy', 'style', 'video', 'postprocess', 'assemble', 'export', 'preview',
    ]);
  });

  it('에러 발생 시 진행률에 error 상태가 보고된다', async () => {
    const progressEvents: PipelineProgress[] = [];
    const deps = createMockDeps({
      generateCopy: vi.fn().mockRejectedValue(new Error('LLM 실패')),
      onProgress: (p) => progressEvents.push({ ...p }),
    });
    const options = createOptions();

    await expect(runPipeline(options, deps)).rejects.toThrow();

    const errorEvent = progressEvents.find(p => p.stage === 'copy-generation' && p.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toContain('LLM 실패');
  });
});
