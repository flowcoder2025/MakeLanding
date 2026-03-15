import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn((...args: unknown[]) => {
    const callback = args[args.length - 1] as (
      err: Error | null,
      result: { stdout: string; stderr: string },
    ) => void;
    callback(null, { stdout: '12.0\n', stderr: '' });
  }),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import {
  calculateTargetBitrate,
  buildMp4Args,
  buildWebmArgs,
  buildPosterArgs,
  getVideoDuration,
  postProcessVideo,
} from '../../src/comfyui/video-postprocess.js';

describe('calculateTargetBitrate', () => {
  it('10MB 10초 비디오의 비트레이트를 계산한다', () => {
    // 10MB = 10 * 1024KB * 8bit = 81920kbit, / 10s = 8192kbps
    const bitrate = calculateTargetBitrate(10, 10);
    expect(bitrate).toBe(8192);
  });

  it('10MB 12초 비디오의 비트레이트를 계산한다', () => {
    // 81920 / 12 = 6826.67 → floor = 6826
    const bitrate = calculateTargetBitrate(12, 10);
    expect(bitrate).toBe(6826);
  });

  it('최소 비트레이트 100kbps를 보장한다', () => {
    const bitrate = calculateTargetBitrate(100000, 0.001);
    expect(bitrate).toBe(100);
  });

  it('길이가 0 이하이면 에러를 던진다', () => {
    expect(() => calculateTargetBitrate(0, 10)).toThrow('비디오 길이가 0 이하입니다');
    expect(() => calculateTargetBitrate(-5, 10)).toThrow('비디오 길이가 0 이하입니다');
  });
});

describe('buildMp4Args', () => {
  it('H.264 인코딩 인자를 올바르게 생성한다', () => {
    const args = buildMp4Args('/input/raw.mp4', '/output/hero-bg.mp4', 5000, 1920, 1080);

    expect(args).toContain('-c:v');
    expect(args).toContain('libx264');
    expect(args).toContain('-b:v');
    expect(args).toContain('5000k');
    expect(args).toContain('-an');
    expect(args).toContain('+faststart');
    expect(args).toContain('scale=1920:1080');
    expect(args[args.length - 1]).toBe('/output/hero-bg.mp4');
  });

  it('maxrate는 비트레이트의 1.5배이다', () => {
    const args = buildMp4Args('/in.mp4', '/out.mp4', 4000, 1920, 1080);
    const idx = args.indexOf('-maxrate');
    expect(args[idx + 1]).toBe('6000k');
  });

  it('bufsize는 비트레이트의 2배이다', () => {
    const args = buildMp4Args('/in.mp4', '/out.mp4', 4000, 1920, 1080);
    const idx = args.indexOf('-bufsize');
    expect(args[idx + 1]).toBe('8000k');
  });
});

describe('buildWebmArgs', () => {
  it('VP9 인코딩 인자를 올바르게 생성한다', () => {
    const args = buildWebmArgs('/input/raw.mp4', '/output/hero-bg.webm', 5000, 1920, 1080);

    expect(args).toContain('-c:v');
    expect(args).toContain('libvpx-vp9');
    expect(args).toContain('-b:v');
    expect(args).toContain('5000k');
    expect(args).toContain('-an');
    expect(args).toContain('scale=1920:1080');
    expect(args[args.length - 1]).toBe('/output/hero-bg.webm');
  });
});

describe('buildPosterArgs', () => {
  it('포스터 추출 인자를 올바르게 생성한다', () => {
    const args = buildPosterArgs('/input/raw.mp4', '/output/poster.jpg', 1920, 1080);

    expect(args).toContain('-vframes');
    expect(args).toContain('1');
    expect(args).toContain('-q:v');
    expect(args).toContain('2');
    expect(args).toContain('scale=1920:1080');
    expect(args[args.length - 1]).toBe('/output/poster.jpg');
  });
});

describe('getVideoDuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1] as (
        err: Error | null,
        result: { stdout: string; stderr: string },
      ) => void;
      callback(null, { stdout: '12.0\n', stderr: '' });
    });
  });

  it('ffprobe로 비디오 길이를 가져온다', async () => {
    const duration = await getVideoDuration('/video.mp4', 'ffprobe');

    expect(duration).toBe(12.0);
    expect(execFile).toHaveBeenCalledWith(
      'ffprobe',
      expect.arrayContaining(['-show_entries', 'format=duration', '/video.mp4']),
      expect.any(Function),
    );
  });

  it('유효하지 않은 출력이면 에러를 던진다', async () => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1] as (
        err: Error | null,
        result: { stdout: string; stderr: string },
      ) => void;
      callback(null, { stdout: 'N/A\n', stderr: '' });
    });

    await expect(getVideoDuration('/bad.mp4', 'ffprobe')).rejects.toThrow(
      '비디오 길이를 가져올 수 없습니다',
    );
  });
});

describe('postProcessVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1] as (
        err: Error | null,
        result: { stdout: string; stderr: string },
      ) => void;
      callback(null, { stdout: '12.0\n', stderr: '' });
    });
  });

  it('MP4, WebM, poster 경로를 반환한다', async () => {
    const result = await postProcessVideo({
      inputPath: '/raw/video.mp4',
      outputDir: '/output',
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
    });

    expect(result.mp4Path).toMatch(/video\.mp4$/);
    expect(result.webmPath).toMatch(/video\.webm$/);
    expect(result.posterPath).toMatch(/video-poster\.jpg$/);
  });

  it('출력 디렉토리가 없으면 생성한다', async () => {
    vi.mocked(existsSync).mockReturnValueOnce(false);

    await postProcessVideo({
      inputPath: '/raw/video.mp4',
      outputDir: '/new-output',
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
    });

    expect(mkdirSync).toHaveBeenCalledWith('/new-output', { recursive: true });
  });

  it('ffprobe 1회 + ffmpeg 3회 (mp4, webm, poster) 호출한다', async () => {
    await postProcessVideo({
      inputPath: '/raw/video.mp4',
      outputDir: '/output',
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
    });

    // ffprobe 1회 + ffmpeg 3회 = 4회
    expect(execFile).toHaveBeenCalledTimes(4);
  });

  it('기본 해상도 1920x1080을 사용한다', async () => {
    await postProcessVideo({
      inputPath: '/raw/video.mp4',
      outputDir: '/output',
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
    });

    const calls = vi.mocked(execFile).mock.calls;
    // ffmpeg 호출들에서 scale 필터 확인 (인덱스 1, 2, 3 — 0은 ffprobe)
    for (let i = 1; i < calls.length; i++) {
      const args = calls[i][1] as string[];
      const vfArg = args.find((a: string) => a.includes('scale='));
      expect(vfArg).toBe('scale=1920:1080');
    }
  });

  it('커스텀 해상도를 적용한다', async () => {
    await postProcessVideo({
      inputPath: '/raw/video.mp4',
      outputDir: '/output',
      width: 1280,
      height: 720,
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
    });

    const calls = vi.mocked(execFile).mock.calls;
    for (let i = 1; i < calls.length; i++) {
      const args = calls[i][1] as string[];
      const vfArg = args.find((a: string) => a.includes('scale='));
      expect(vfArg).toBe('scale=1280:720');
    }
  });
});
