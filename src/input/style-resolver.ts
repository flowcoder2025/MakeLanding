import type {
  LandingPageInput,
  BrandStyle,
  VideoStyleType,
  FontStyle,
  ColorPalette,
} from '../shared/types.js';

interface IndustryProfile {
  videoType: VideoStyleType;
  fontStyle: FontStyle;
  colorPalette: ColorPalette;
}

const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  교육: {
    videoType: 'realistic',
    fontStyle: 'bold',
    colorPalette: {
      primary: '#E53935',
      accent: '#FF8A65',
      background: '#1A1A2E',
      text: '#FFFFFF',
    },
  },
  화장품: {
    videoType: '3d-product',
    fontStyle: 'elegant',
    colorPalette: {
      primary: '#D4AF37',
      accent: '#F5E6CC',
      background: '#1C1C1C',
      text: '#FFFFFF',
    },
  },
  뷰티: {
    videoType: '3d-product',
    fontStyle: 'elegant',
    colorPalette: {
      primary: '#C9A96E',
      accent: '#F0D9B5',
      background: '#1A1A1A',
      text: '#FFFFFF',
    },
  },
  게임: {
    videoType: '3d-character',
    fontStyle: 'playful',
    colorPalette: {
      primary: '#7C4DFF',
      accent: '#00E5FF',
      background: '#0D0D1A',
      text: '#FFFFFF',
    },
  },
  엔터테인먼트: {
    videoType: '3d-character',
    fontStyle: 'playful',
    colorPalette: {
      primary: '#FF4081',
      accent: '#7C4DFF',
      background: '#121212',
      text: '#FFFFFF',
    },
  },
  식품: {
    videoType: '3d-product',
    fontStyle: 'bold',
    colorPalette: {
      primary: '#4CAF50',
      accent: '#8BC34A',
      background: '#1B2A1B',
      text: '#FFFFFF',
    },
  },
  음료: {
    videoType: '3d-product',
    fontStyle: 'bold',
    colorPalette: {
      primary: '#00BCD4',
      accent: '#26C6DA',
      background: '#0D1B2A',
      text: '#FFFFFF',
    },
  },
  피트니스: {
    videoType: 'realistic',
    fontStyle: 'bold',
    colorPalette: {
      primary: '#FF5722',
      accent: '#FF9800',
      background: '#1A1A1A',
      text: '#FFFFFF',
    },
  },
  헬스: {
    videoType: 'realistic',
    fontStyle: 'bold',
    colorPalette: {
      primary: '#F44336',
      accent: '#FF7043',
      background: '#1A1A1A',
      text: '#FFFFFF',
    },
  },
  럭셔리: {
    videoType: '3d-product',
    fontStyle: 'elegant',
    colorPalette: {
      primary: '#CFB53B',
      accent: '#E8D5A3',
      background: '#0A0A0A',
      text: '#FFFFFF',
    },
  },
  금융: {
    videoType: 'realistic',
    fontStyle: 'classic',
    colorPalette: {
      primary: '#1565C0',
      accent: '#42A5F5',
      background: '#0D1B2A',
      text: '#FFFFFF',
    },
  },
  IT: {
    videoType: 'realistic',
    fontStyle: 'modern',
    colorPalette: {
      primary: '#2196F3',
      accent: '#03DAC6',
      background: '#121212',
      text: '#FFFFFF',
    },
  },
  기술: {
    videoType: 'realistic',
    fontStyle: 'modern',
    colorPalette: {
      primary: '#2979FF',
      accent: '#00E5FF',
      background: '#0D1117',
      text: '#FFFFFF',
    },
  },
  패션: {
    videoType: '3d-product',
    fontStyle: 'elegant',
    colorPalette: {
      primary: '#212121',
      accent: '#BDBDBD',
      background: '#FAFAFA',
      text: '#212121',
    },
  },
  부동산: {
    videoType: 'realistic',
    fontStyle: 'classic',
    colorPalette: {
      primary: '#1B5E20',
      accent: '#A5D6A7',
      background: '#1A1A2E',
      text: '#FFFFFF',
    },
  },
  의료: {
    videoType: 'realistic',
    fontStyle: 'classic',
    colorPalette: {
      primary: '#0097A7',
      accent: '#4DD0E1',
      background: '#E0F7FA',
      text: '#263238',
    },
  },
};

const DEFAULT_PROFILE: IndustryProfile = {
  videoType: 'realistic',
  fontStyle: 'modern',
  colorPalette: {
    primary: '#6200EE',
    accent: '#03DAC6',
    background: '#121212',
    text: '#FFFFFF',
  },
};

function findProfile(industry: string): IndustryProfile {
  const directMatch = INDUSTRY_PROFILES[industry];
  if (directMatch) {
    return directMatch;
  }

  for (const [keyword, profile] of Object.entries(INDUSTRY_PROFILES)) {
    if (industry.includes(keyword) || keyword.includes(industry)) {
      return profile;
    }
  }

  return DEFAULT_PROFILE;
}

export function resolveStyle(input: LandingPageInput): BrandStyle {
  const profile = findProfile(input.industry);

  return {
    colorPalette: { ...profile.colorPalette },
    fontStyle: profile.fontStyle,
    videoType: profile.videoType,
  };
}

const FONT_FAMILY_MAP: Record<FontStyle, string> = {
  modern: 'Pretendard',
  classic: 'Noto Serif KR',
  bold: 'Black Han Sans',
  elegant: 'Cormorant Garamond',
  playful: 'Jua',
};

export function toStyleConfig(brand: BrandStyle): import('../codegen/types.js').StyleConfig {
  return {
    primaryColor: brand.colorPalette.primary,
    accentColor: brand.colorPalette.accent,
    backgroundColor: brand.colorPalette.background,
    fontFamily: FONT_FAMILY_MAP[brand.fontStyle],
    videoStyle: brand.videoType,
  };
}
