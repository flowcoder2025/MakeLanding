import type {
  LandingPageInput,
  BrandStyle,
  ColorPalette,
  FontStyle,
  VideoStyleType,
} from '../shared/types.js';

interface IndustryProfile {
  videoStyle: VideoStyleType;
  fontStyle: FontStyle;
  colors: ColorPalette;
}

const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  education: {
    videoStyle: 'realistic',
    fontStyle: 'bold',
    colors: {
      primary: '#1E3A5F',
      secondary: '#4A90D9',
      accent: '#FF6B35',
      background: '#0D1B2A',
      text: '#FFFFFF',
    },
  },
  food: {
    videoStyle: '3d-product',
    fontStyle: 'elegant',
    colors: {
      primary: '#8B4513',
      secondary: '#D2691E',
      accent: '#FFD700',
      background: '#1A0F0A',
      text: '#FFFFFF',
    },
  },
  beauty: {
    videoStyle: '3d-product',
    fontStyle: 'elegant',
    colors: {
      primary: '#C4587A',
      secondary: '#E8A0BF',
      accent: '#D4AF37',
      background: '#1A0A12',
      text: '#FFFFFF',
    },
  },
  tech: {
    videoStyle: 'realistic',
    fontStyle: 'modern',
    colors: {
      primary: '#0EA5E9',
      secondary: '#38BDF8',
      accent: '#06B6D4',
      background: '#0F172A',
      text: '#FFFFFF',
    },
  },
  entertainment: {
    videoStyle: '3d-character',
    fontStyle: 'bold',
    colors: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      accent: '#F97316',
      background: '#0F0A1A',
      text: '#FFFFFF',
    },
  },
  realestate: {
    videoStyle: 'realistic',
    fontStyle: 'classic',
    colors: {
      primary: '#2D5016',
      secondary: '#6B8F3C',
      accent: '#C8A951',
      background: '#0F1A0A',
      text: '#FFFFFF',
    },
  },
  health: {
    videoStyle: 'realistic',
    fontStyle: 'bold',
    colors: {
      primary: '#059669',
      secondary: '#34D399',
      accent: '#10B981',
      background: '#0A1A14',
      text: '#FFFFFF',
    },
  },
  manufacturing: {
    videoStyle: '3d-product',
    fontStyle: 'modern',
    colors: {
      primary: '#475569',
      secondary: '#64748B',
      accent: '#3B82F6',
      background: '#0F1219',
      text: '#FFFFFF',
    },
  },
  finance: {
    videoStyle: 'realistic',
    fontStyle: 'classic',
    colors: {
      primary: '#1E3A5F',
      secondary: '#2C5282',
      accent: '#D4AF37',
      background: '#0D1520',
      text: '#FFFFFF',
    },
  },
};

const DEFAULT_PROFILE: IndustryProfile = {
  videoStyle: 'realistic',
  fontStyle: 'modern',
  colors: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    accent: '#F59E0B',
    background: '#111827',
    text: '#FFFFFF',
  },
};

const KEYWORD_TO_PROFILE: [string[], string][] = [
  [['교육', '학원', '강의', '학교', '대학', '학습', '수업', '과외', '에듀'], 'education'],
  [['카페', '레스토랑', '음식', '요리', '베이커리', '식당', '맛집', '푸드', '주방', '디저트'], 'food'],
  [['화장품', '뷰티', '패션', '의류', '스킨케어', '코스메틱', '네일', '헤어', '미용'], 'beauty'],
  [['기술', 'IT', '스타트업', '소프트웨어', '테크', '개발', '클라우드', 'AI', '데이터', 'SaaS'], 'tech'],
  [['게임', '엔터테인먼트', '애니메이션', '캐릭터', '웹툰', '만화', '스트리밍', '미디어'], 'entertainment'],
  [['부동산', '건설', '인테리어', '건축', '시공', '리모델링', '분양'], 'realestate'],
  [['헬스', '피트니스', '건강', '의료', '병원', '약국', '웰니스', '요가', '필라테스'], 'health'],
  [['제조', '산업', '공장', '생산', '자동차', '기계', '설비', '장비', '소재'], 'manufacturing'],
  [['금융', '보험', '은행', '증권', '투자', '자산', '펀드', '대출', '핀테크'], 'finance'],
];

function matchIndustry(industry: string): IndustryProfile {
  const normalized = industry.toLowerCase();

  for (const [keywords, profileKey] of KEYWORD_TO_PROFILE) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return INDUSTRY_PROFILES[profileKey];
      }
    }
  }

  return DEFAULT_PROFILE;
}

export function resolveBrandStyle(input: LandingPageInput): BrandStyle {
  const profile = matchIndustry(input.industry);

  return {
    colors: { ...profile.colors },
    fontStyle: profile.fontStyle,
    videoStyle: profile.videoStyle,
  };
}
