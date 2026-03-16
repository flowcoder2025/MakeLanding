#!/bin/bash
# MakeLanding 전체 파이프라인 (청사진 v2)
#
# brief → spec → recipe → copy → hero(3장+업스케일→1장선택) → video → render → screenshot → critic → auto-fix
#
# Usage: bash scripts/pipeline.sh <brief-file> [--skip-video] [--skip-autofix]

set -euo pipefail
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

BRIEF_FILE="${1:?Usage: bash scripts/pipeline.sh <brief-file> [--skip-video] [--skip-autofix]}"
SKIP_VIDEO=false
SKIP_AUTOFIX=false

shift
for arg in "$@"; do
  case "$arg" in
    --skip-video) SKIP_VIDEO=true ;;
    --skip-autofix) SKIP_AUTOFIX=true ;;
  esac
done

OUT="outputs"
mkdir -p "$OUT" "$OUT/screenshots"

# Helper: extract structured_output from claude --output-format json
extract_structured() {
  node -e "
    const fs = require('fs');
    const raw = JSON.parse(fs.readFileSync('$1', 'utf-8'));
    const out = raw.structured_output ?? raw;
    fs.writeFileSync('$1', JSON.stringify(out, null, 2), 'utf-8');
  "
}

echo "================================================"
echo "  MakeLanding Pipeline v2 (Blueprint-compliant)"
echo "  Brief: $BRIEF_FILE"
echo "================================================"

# ━━━ Step 1: brief → spec ━━━
echo ""
echo "📋 Step 1: brief → spec"
cat "$BRIEF_FILE" | claude -p \
  --append-system-prompt-file prompts/system/brief_to_spec.system.md \
  --output-format json \
  --json-schema "$(cat schemas/landing-spec.schema.json)" \
  "Convert the piped brief into LandingSpec JSON." \
  > "$OUT/spec.json"
extract_structured "$OUT/spec.json"
echo "✅ spec → $OUT/spec.json"

# ━━━ Step 2: spec → recipe (룰 기반, visual_tokens 적용) ━━━
echo ""
echo "🧩 Step 2: spec → recipe + style tokens"
npx tsx scripts/pick-recipe.ts "$OUT/spec.json" > "$OUT/recipe.json"
RECIPE_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$OUT/recipe.json','utf-8')).recipe_id)")
STYLE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$OUT/recipe.json','utf-8')).style_profile)")
echo "✅ recipe=$RECIPE_ID, style=$STYLE"

# ━━━ Step 3: spec + recipe → copy ━━━
echo ""
echo "✍️  Step 3: spec + recipe → copy"
cat "$OUT/spec.json" "$OUT/recipe.json" | claude -p \
  --append-system-prompt-file prompts/system/spec_to_copy.system.md \
  --output-format json \
  --json-schema "$(cat schemas/landing-copy.schema.json)" \
  "Generate landing copy JSON for the selected recipe." \
  > "$OUT/copy.json"
extract_structured "$OUT/copy.json"
echo "✅ copy → $OUT/copy.json"

# ━━━ Step 4: Hero image + video (ComfyUI) ━━━
HERO_IMG_ARG=""
HERO_VID_ARG=""
if [ "$SKIP_VIDEO" = false ]; then
  echo ""
  echo "🎨 Step 4: hero image (3 candidates + upscale) + I2V video"
  npx tsx scripts/generate-hero.ts "$OUT" "$OUT/copy.json" "$OUT/recipe.json"
  HERO_IMG_ARG="hero-bg.png"
  HERO_VID_ARG="hero-bg-video.webp"
else
  echo ""
  echo "⏭️  Step 4: Skipped (--skip-video)"
  [ -f "$OUT/hero-bg.png" ] && HERO_IMG_ARG="hero-bg.png"
  [ -f "$OUT/hero-bg-video.webp" ] && HERO_VID_ARG="hero-bg-video.webp"
fi

# ━━━ Step 5: Render page (레시피 기반 동적 렌더링) ━━━
echo ""
echo "🖥️  Step 5: render page (recipe-driven)"
npx tsx scripts/render-page.ts "$OUT/spec.json" "$OUT/copy.json" "$OUT/recipe.json" "$OUT/page.html" $HERO_IMG_ARG $HERO_VID_ARG
echo "✅ page → $OUT/page.html"

# ━━━ Step 6: Capture screenshots ━━━
echo ""
echo "📸 Step 6: capture screenshots"
npx tsx scripts/capture-screens.ts "$OUT/page.html" "$OUT/screenshots"

# ━━━ Step 7: Auto-fix loop (critic → patch → re-render, max 2x) ━━━
if [ "$SKIP_AUTOFIX" = false ]; then
  echo ""
  echo "🔄 Step 7: auto-fix loop (max 2 iterations, threshold=84)"
  npx tsx scripts/auto-fix.ts "$OUT" $HERO_IMG_ARG $HERO_VID_ARG
else
  echo ""
  echo "⏭️  Step 7: Skipped (--skip-autofix)"
fi

# ━━━ Summary ━━━
SCORE="N/A"
[ -f "$OUT/critic.json" ] && SCORE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$OUT/critic.json','utf-8')).overall_score)" 2>/dev/null || echo "N/A")

echo ""
echo "================================================"
echo "  Pipeline Complete!"
echo "  Recipe:  $RECIPE_ID"
echo "  Style:   $STYLE"
echo "  Score:   $SCORE"
echo "================================================"
echo "  Spec:        $OUT/spec.json"
echo "  Recipe:      $OUT/recipe.json"
echo "  Copy:        $OUT/copy.json"
echo "  Page:        $OUT/page.html"
[ -n "$HERO_IMG_ARG" ] && echo "  Hero Image:  $OUT/$HERO_IMG_ARG"
[ -n "$HERO_VID_ARG" ] && echo "  Hero Video:  $OUT/$HERO_VID_ARG"
echo "  Screenshots: $OUT/screenshots/"
[ -f "$OUT/critic.json" ] && echo "  Critic:      $OUT/critic.json"
echo "================================================"
