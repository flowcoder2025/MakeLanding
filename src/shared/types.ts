export interface LandingPageInput {
  businessName: string;
  industry: string;
  coreMessage: string;
  targetAudience: string;
  language?: string;
}

export interface CopyResult {
  headline: string[];
  subCopy: string;
  ctaPrimary: string;
  ctaSecondary: string;
  navItems: string[];
}

export type VideoStyleType = 'realistic' | '3d-product' | '3d-character';

export type FontStyle = 'modern' | 'classic' | 'bold' | 'elegant' | 'playful';

export interface ColorPalette {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export interface BrandStyle {
  colorPalette: ColorPalette;
  fontStyle: FontStyle;
  videoType: VideoStyleType;
}
