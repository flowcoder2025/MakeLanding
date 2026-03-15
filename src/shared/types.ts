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
