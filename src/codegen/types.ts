export interface LlmConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
}

export type LlmClient = (systemPrompt: string, userMessage: string) => Promise<string>;

export interface StyleConfig {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  videoStyle: 'realistic' | '3d-product' | '3d-character';
}

export interface VideoAssets {
  mp4Path: string;
  webmPath: string;
  posterPath: string;
}

export interface PageAssemblerInput {
  projectName: string;
  copy: import('../shared/types.js').CopyResult;
  style: StyleConfig;
  video: VideoAssets;
}
