export interface LandingPageInput {
  businessName: string;
  industry: string;
  coreMessage: string;
  targetAudience: string;
  language?: string;
}

export type VideoStyleType = 'realistic' | '3d-product' | '3d-character';
export type FontStyle = 'modern' | 'classic' | 'bold' | 'elegant';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface BrandStyle {
  colors: ColorPalette;
  fontStyle: FontStyle;
  videoStyle: VideoStyleType;
}
