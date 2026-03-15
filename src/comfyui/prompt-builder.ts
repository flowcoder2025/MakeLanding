import type { LandingPageInput, VideoStyleType } from '../shared/types.js';

const STYLE_SUFFIXES: Record<VideoStyleType, string> = {
  realistic: 'cinematic scene, dramatic lighting, photorealistic, professional',
  '3d-product': '3d product visualization, studio lighting, luxury material, clean background',
  '3d-character': '3d animated character, stylized, dynamic pose, vibrant colors',
};

export function buildVideoPrompt(
  input: LandingPageInput,
  videoStyle: VideoStyleType,
): string {
  const parts = [input.coreMessage, input.industry, STYLE_SUFFIXES[videoStyle]];
  return parts.join(', ');
}
