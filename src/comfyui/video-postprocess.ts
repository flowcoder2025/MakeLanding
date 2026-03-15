import { execFile as execFileCb } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export type FFmpegExecutor = (bin: string, args: string[]) => Promise<void>;

export interface PostProcessOptions {
  inputPath: string;
  outputDir: string;
  baseName?: string;
  mp4Crf?: number;
  webmCrf?: number;
  posterQuality?: number;
  executor?: FFmpegExecutor;
}

export interface PostProcessResult {
  mp4Path: string;
  webmPath: string;
  posterPath: string;
}

const DEFAULT_MP4_CRF = 23;
const DEFAULT_WEBM_CRF = 30;
const DEFAULT_POSTER_QUALITY = 2;
const DEFAULT_BASE_NAME = 'hero-bg';

export function buildMp4Args(
  inputPath: string,
  outputPath: string,
  options: { crf?: number } = {},
): string[] {
  const crf = options.crf ?? DEFAULT_MP4_CRF;
  return [
    '-i', inputPath,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an',
    '-y',
    outputPath,
  ];
}

export function buildWebmArgs(
  inputPath: string,
  outputPath: string,
  options: { crf?: number } = {},
): string[] {
  const crf = options.crf ?? DEFAULT_WEBM_CRF;
  return [
    '-i', inputPath,
    '-c:v', 'libvpx-vp9',
    '-crf', String(crf),
    '-b:v', '0',
    '-pix_fmt', 'yuv420p',
    '-an',
    '-y',
    outputPath,
  ];
}

export function buildPosterArgs(
  inputPath: string,
  outputPath: string,
  options: { quality?: number } = {},
): string[] {
  const quality = options.quality ?? DEFAULT_POSTER_QUALITY;
  return [
    '-i', inputPath,
    '-frames:v', '1',
    '-q:v', String(quality),
    '-y',
    outputPath,
  ];
}

export function resolveFFmpegPath(): string {
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }
  return 'ffmpeg';
}

function defaultExecutor(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFileCb(bin, args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function postprocessVideo(options: PostProcessOptions): Promise<PostProcessResult> {
  const {
    inputPath,
    outputDir,
    baseName = DEFAULT_BASE_NAME,
    executor = defaultExecutor,
  } = options;

  if (!existsSync(inputPath)) {
    throw new Error(`입력 파일을 찾을 수 없습니다: ${inputPath}`);
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const ffmpeg = resolveFFmpegPath();

  const mp4Path = join(outputDir, `${baseName}.mp4`);
  const webmPath = join(outputDir, `${baseName}.webm`);
  const posterSuffix = baseName === DEFAULT_BASE_NAME ? 'hero-poster.jpg' : `${baseName}-poster.jpg`;
  const posterPath = join(outputDir, posterSuffix);

  const mp4Args = buildMp4Args(inputPath, mp4Path, { crf: options.mp4Crf });
  const webmArgs = buildWebmArgs(inputPath, webmPath, { crf: options.webmCrf });
  const posterArgs = buildPosterArgs(inputPath, posterPath, { quality: options.posterQuality });

  await executor(ffmpeg, mp4Args);
  await executor(ffmpeg, webmArgs);
  await executor(ffmpeg, posterArgs);

  return { mp4Path, webmPath, posterPath };
}
