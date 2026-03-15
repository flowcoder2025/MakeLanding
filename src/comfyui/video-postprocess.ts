import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT } from '../shared/constants.js';

const execFile = promisify(execFileCb);

export interface PostProcessOptions {
  inputPath: string;
  outputDir: string;
  maxFileSizeMb?: number;
  width?: number;
  height?: number;
  ffmpegPath?: string;
  ffprobePath?: string;
}

export interface PostProcessResult {
  mp4Path: string;
  webmPath: string;
  posterPath: string;
}

const DEFAULT_MAX_FILE_SIZE_MB = 10;
const DEFAULT_FFMPEG_PATH = process.env.FFMPEG_PATH ?? 'ffmpeg';
const DEFAULT_FFPROBE_PATH = process.env.FFPROBE_PATH ?? 'ffprobe';
const MIN_BITRATE_KBPS = 100;
const BITS_PER_KBYTE = 8;
const KBYTES_PER_MB = 1024;
const MAXRATE_MULTIPLIER = 1.5;
const BUFSIZE_MULTIPLIER = 2;

export function calculateTargetBitrate(durationSec: number, maxFileSizeMb: number): number {
  if (durationSec <= 0) {
    throw new Error('비디오 길이가 0 이하입니다');
  }
  const maxFileSizeKbit = maxFileSizeMb * KBYTES_PER_MB * BITS_PER_KBYTE;
  const bitrateKbps = Math.floor(maxFileSizeKbit / durationSec);
  return Math.max(bitrateKbps, MIN_BITRATE_KBPS);
}

export function buildMp4Args(
  inputPath: string,
  outputPath: string,
  bitrateKbps: number,
  width: number,
  height: number,
): string[] {
  return [
    '-y',
    '-i', inputPath,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-b:v', `${bitrateKbps}k`,
    '-maxrate', `${Math.floor(bitrateKbps * MAXRATE_MULTIPLIER)}k`,
    '-bufsize', `${bitrateKbps * BUFSIZE_MULTIPLIER}k`,
    '-an',
    '-movflags', '+faststart',
    '-vf', `scale=${width}:${height}`,
    outputPath,
  ];
}

export function buildWebmArgs(
  inputPath: string,
  outputPath: string,
  bitrateKbps: number,
  width: number,
  height: number,
): string[] {
  return [
    '-y',
    '-i', inputPath,
    '-c:v', 'libvpx-vp9',
    '-b:v', `${bitrateKbps}k`,
    '-an',
    '-vf', `scale=${width}:${height}`,
    outputPath,
  ];
}

export function buildPosterArgs(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number,
): string[] {
  return [
    '-y',
    '-i', inputPath,
    '-vframes', '1',
    '-q:v', '2',
    '-vf', `scale=${width}:${height}`,
    outputPath,
  ];
}

export async function getVideoDuration(
  inputPath: string,
  ffprobePath: string = DEFAULT_FFPROBE_PATH,
): Promise<number> {
  const { stdout } = await execFile(ffprobePath, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    inputPath,
  ]);
  const duration = parseFloat(stdout.trim());
  if (isNaN(duration) || duration <= 0) {
    throw new Error(`비디오 길이를 가져올 수 없습니다: ${inputPath}`);
  }
  return duration;
}

export async function postProcessVideo(options: PostProcessOptions): Promise<PostProcessResult> {
  const {
    inputPath,
    outputDir,
    maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
    width = DEFAULT_VIDEO_WIDTH,
    height = DEFAULT_VIDEO_HEIGHT,
    ffmpegPath = DEFAULT_FFMPEG_PATH,
    ffprobePath = DEFAULT_FFPROBE_PATH,
  } = options;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const stem = basename(inputPath, extname(inputPath));
  const mp4Path = join(outputDir, `${stem}.mp4`);
  const webmPath = join(outputDir, `${stem}.webm`);
  const posterPath = join(outputDir, `${stem}-poster.jpg`);

  const duration = await getVideoDuration(inputPath, ffprobePath);
  const bitrateKbps = calculateTargetBitrate(duration, maxFileSizeMb);

  await execFile(ffmpegPath, buildMp4Args(inputPath, mp4Path, bitrateKbps, width, height));
  await execFile(ffmpegPath, buildWebmArgs(inputPath, webmPath, bitrateKbps, width, height));
  await execFile(ffmpegPath, buildPosterArgs(inputPath, posterPath, width, height));

  return { mp4Path, webmPath, posterPath };
}
