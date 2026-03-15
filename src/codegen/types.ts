export interface LlmConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
}

export type LlmClient = (systemPrompt: string, userMessage: string) => Promise<string>;

export interface VideoHeroConfig {
  headline: string[];
  subCopy: string;
  ctaPrimary: string;
  ctaSecondary: string;
  brandColor: string;
  videoSrc: string;
  videoWebmSrc: string;
  posterSrc: string;
}

export interface NavbarConfig {
  businessName: string;
  navItems: string[];
  ctaText: string;
  brandColor: string;
}

export interface CtaConfig {
  primaryText: string;
  secondaryText: string;
  brandColor: string;
  primaryHref: string;
  secondaryHref: string;
}
