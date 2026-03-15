import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildMp4Args,
  buildWebmArgs,
  buildPosterArgs,
  resolveFFmpegPath,
  postprocessVideo,
} from '../../src/comfyui/video-postprocess.js';
import type { PostProcessOptions, FFmpegExecutor } from '../../src/comfyui/video-postprocess.js';

const noopExecutor: FFmpegExecutor = vi.fn(async () => {});

describe('video-postprocess', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `makelanding-postprocess-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('buildMp4Args', () => {
    it('H.264 인코딩을 위한 FFmpeg 인자를 생성한다', () => {
      const args = buildMp4Args('/input/video.mp4', '/output/hero-bg.mp4');

      expect(args).toContain('-i');
      expect(args).toContain('/input/video.mp4');
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
      expect(args).toContain('-movflags');
      expect(args).toContain('+faststart');
      expect(args).toContain('/output/hero-bg.mp4');
    });

    it('CRF 값으로 품질을 조절한다', () => {
      const args = buildMp4Args('/input/video.mp4', '/output/hero-bg.mp4', { crf: 28 });

      expect(args).toContain('-crf');
      expect(args).toContain('28');
    });

    it('오디오를 제거한다', () => {
      const args = buildMp4Args('/input/video.mp4', '/output/hero-bg.mp4');

      expect(args).toContain('-an');
    });
  });

  describe('buildWebmArgs', () => {
    it('VP9 인코딩을 위한 FFmpeg 인자를 생성한다', () => {
      const args = buildWebmArgs('/input/video.mp4', '/output/hero-bg.webm');

      expect(args).toContain('-i');
      expect(args).toContain('/input/video.mp4');
      expect(args).toContain('-c:v');
      expect(args).toContain('libvpx-vp9');
      expect(args).toContain('/output/hero-bg.webm');
    });

    it('오디오를 제거한다', () => {
      const args = buildWebmArgs('/input/video.mp4', '/output/hero-bg.webm');

      expect(args).toContain('-an');
    });
  });

  describe('buildPosterArgs', () => {
    it('첫 프레임을 JPEG으로 추출하는 인자를 생성한다', () => {
      const args = buildPosterArgs('/input/video.mp4', '/output/hero-poster.jpg');

      expect(args).toContain('-i');
      expect(args).toContain('/input/video.mp4');
      expect(args).toContain('-frames:v');
      expect(args).toContain('1');
      expect(args).toContain('/output/hero-poster.jpg');
    });

    it('JPEG 품질을 설정한다', () => {
      const args = buildPosterArgs('/input/video.mp4', '/output/hero-poster.jpg');

      expect(args).toContain('-q:v');
    });
  });

  describe('resolveFFmpegPath', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('FFMPEG_PATH 환경변수가 있으면 해당 경로를 반환한다', () => {
      process.env.FFMPEG_PATH = '/custom/ffmpeg';
      expect(resolveFFmpegPath()).toBe('/custom/ffmpeg');
    });

    it('환경변수가 없으면 기본값 "ffmpeg"을 반환한다', () => {
      delete process.env.FFMPEG_PATH;
      expect(resolveFFmpegPath()).toBe('ffmpeg');
    });
  });

  describe('postprocessVideo', () => {
    it('MP4, WebM, 포스터 이미지 경로를 반환한다', async () => {
      const inputPath = join(tempDir, 'raw-video.mp4');
      writeFileSync(inputPath, 'fake video data');

      const outputDir = join(tempDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const options: PostProcessOptions = {
        inputPath,
        outputDir,
        executor: noopExecutor,
      };

      const result = await postprocessVideo(options);

      expect(result.mp4Path).toBe(join(outputDir, 'hero-bg.mp4'));
      expect(result.webmPath).toBe(join(outputDir, 'hero-bg.webm'));
      expect(result.posterPath).toBe(join(outputDir, 'hero-poster.jpg'));
    });

    it('커스텀 출력 파일명을 지원한다', async () => {
      const inputPath = join(tempDir, 'raw-video.mp4');
      writeFileSync(inputPath, 'fake video data');

      const outputDir = join(tempDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const options: PostProcessOptions = {
        inputPath,
        outputDir,
        baseName: 'product-bg',
        executor: noopExecutor,
      };

      const result = await postprocessVideo(options);

      expect(result.mp4Path).toBe(join(outputDir, 'product-bg.mp4'));
      expect(result.webmPath).toBe(join(outputDir, 'product-bg.webm'));
      expect(result.posterPath).toBe(join(outputDir, 'product-bg-poster.jpg'));
    });

    it('입력 파일이 없으면 에러를 던진다', async () => {
      const options: PostProcessOptions = {
        inputPath: '/nonexistent/video.mp4',
        outputDir: tempDir,
        executor: noopExecutor,
      };

      await expect(postprocessVideo(options)).rejects.toThrow('입력 파일을 찾을 수 없습니다');
    });

    it('FFmpeg를 3회 호출한다 (MP4, WebM, 포스터)', async () => {
      const mockExecutor: FFmpegExecutor = vi.fn(async () => {});

      const inputPath = join(tempDir, 'raw-video.mp4');
      writeFileSync(inputPath, 'fake video data');

      const outputDir = join(tempDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      await postprocessVideo({ inputPath, outputDir, executor: mockExecutor });

      expect(mockExecutor).toHaveBeenCalledTimes(3);
    });

    it('출력 디렉토리가 없으면 자동 생성한다', async () => {
      const inputPath = join(tempDir, 'raw-video.mp4');
      writeFileSync(inputPath, 'fake video data');

      const outputDir = join(tempDir, 'auto-created-output');

      await postprocessVideo({ inputPath, outputDir, executor: noopExecutor });

      expect(existsSync(outputDir)).toBe(true);
    });

    it('FFmpeg 실행 실패 시 에러를 전파한다', async () => {
      const failingExecutor: FFmpegExecutor = vi.fn(async () => {
        throw new Error('FFmpeg 실행 실패');
      });

      const inputPath = join(tempDir, 'raw-video.mp4');
      writeFileSync(inputPath, 'fake video data');

      const outputDir = join(tempDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      await expect(
        postprocessVideo({ inputPath, outputDir, executor: failingExecutor }),
      ).rejects.toThrow('FFmpeg 실행 실패');
    });
  });
});
