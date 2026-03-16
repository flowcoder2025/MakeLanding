/**
 * 룰 기반 레시피 선택 + 스타일 프로필 매핑
 * Usage: npx tsx scripts/pick-recipe.ts <spec.json>
 * Output: JSON { recipe_id, sections, nav_items, style_profile, style_tokens }
 */
import { readFileSync } from 'node:fs';

interface LandingSpec {
  archetype: string;
  channel: string;
  visual_direction: { tone: string[]; theme: string; motion: string; density: string };
}

interface Recipe {
  when: { archetype: string[]; channel: string[] };
  sections: string[];
  nav_items: string[];
}

interface StyleProfile {
  style_tokens: string[];
  prompt_suffix: string;
}

const specPath = process.argv[2] ?? 'outputs/spec.json';
const spec: LandingSpec = JSON.parse(readFileSync(specPath, 'utf-8'));

// Load recipes
const recipes: Record<string, Recipe> = JSON.parse(
  readFileSync(new URL('../recipes/index.json', import.meta.url), 'utf-8')
);

// Load visual tokens
const visualTokens: Record<string, StyleProfile> = JSON.parse(
  readFileSync(new URL('../styles/visual_tokens.json', import.meta.url), 'utf-8')
);

// --- Recipe matching ---
function pickRecipe(spec: LandingSpec): { id: string; recipe: Recipe } {
  // Score each recipe: +2 for archetype match, +2 for channel match
  let bestId = '';
  let bestScore = -1;

  for (const [id, recipe] of Object.entries(recipes)) {
    let score = 0;
    if (recipe.when.archetype.includes(spec.archetype)) score += 2;
    if (recipe.when.channel.includes(spec.channel)) score += 2;
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  // Fallback to saas_demo_v3 if nothing matches
  if (!bestId || bestScore === 0) bestId = 'saas_demo_v3';

  return { id: bestId, recipe: recipes[bestId] };
}

// --- Style profile matching ---
function pickStyleProfile(spec: LandingSpec): string {
  if (spec.archetype === 'ecommerce') return 'luxury_product';
  if (spec.visual_direction.theme === 'dark') return 'premium_tech_dark';
  if (spec.visual_direction.tone.includes('bold') || spec.visual_direction.tone.includes('playful')) return 'creative_bold';
  if (spec.visual_direction.tone.includes('luxury') || spec.visual_direction.tone.includes('minimal')) return 'minimal_elegant';
  return 'consumer_bright_clean';
}

// --- Output ---
const { id, recipe } = pickRecipe(spec);
const styleProfileId = pickStyleProfile(spec);
const styleProfile = visualTokens[styleProfileId];

const result = {
  recipe_id: id,
  sections: recipe.sections,
  nav_items: recipe.nav_items,
  style_profile: styleProfileId,
  style_tokens: styleProfile.style_tokens,
  prompt_suffix: styleProfile.prompt_suffix,
};

console.log(JSON.stringify(result, null, 2));
