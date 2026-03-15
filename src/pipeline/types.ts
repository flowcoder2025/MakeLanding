import type { LandingPageInput, CopyResult } from '../shared/types.js';

export type VideoStyleType = 'realistic' | '3d-product' | '3d-character';

export interface StyleConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  videoStyle: VideoStyleType;
}

export interface VideoAssets {
  mp4Path: string;
  webmPath: string;
  posterPath: string;
}

export interface PageOutput {
  outputDir: string;
  files: string[];
}

export interface PipelineOptions {
  input: LandingPageInput;
  outputDir: string;
  skipVideo?: boolean;
  skipPreview?: boolean;
}

export interface PipelineResult {
  input: LandingPageInput;
  copy: CopyResult;
  style: StyleConfig;
  video: VideoAssets | null;
  page: PageOutput;
  previewUrl: string | null;
}

export type PipelineStage =
  | 'input-validation'
  | 'copy-generation'
  | 'style-resolution'
  | 'video-generation'
  | 'video-postprocess'
  | 'code-generation'
  | 'project-export'
  | 'preview';

export interface PipelineProgress {
  stage: PipelineStage;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  message?: string;
}

export interface PipelineDeps {
  validateInput: (input: LandingPageInput) => void;
  generateCopy: (input: LandingPageInput) => Promise<CopyResult>;
  resolveStyle: (input: LandingPageInput) => Promise<StyleConfig>;
  generateVideo: (input: LandingPageInput, style: StyleConfig) => Promise<string>;
  postprocessVideo: (rawVideoPath: string, outputDir: string) => Promise<VideoAssets>;
  assemblePage: (copy: CopyResult, style: StyleConfig, video: VideoAssets | null, outputDir: string) => Promise<PageOutput>;
  exportProject: (pageOutput: PageOutput) => Promise<void>;
  startPreview: (outputDir: string) => Promise<string>;
  onProgress?: (progress: PipelineProgress) => void;
}
