/**
 * 자동 수정 루프 (청사진 13번)
 *
 * 1. critic 실행 (spec + copy → Claude → critic.json)
 * 2. score >= 84 → 배포 후보, 종료
 * 3. score < 84 → copy 패치 (critic.patches 기반) → 재렌더 → 재캡처 → 재평가
 * 4. 최대 2회 반복
 *
 * Usage: npx tsx scripts/auto-fix.ts [outputs-dir] [heroImage] [heroVideo]
 */
import { readFileSync, writeFileSync, execSync } from 'node:fs';
import { resolve } from 'node:path';

const THRESHOLD_SHIP = 84;
const MAX_ITERATIONS = 2;

const outDir = process.argv[2] ?? 'outputs';
const heroImg = process.argv[3] ?? '';
const heroVid = process.argv[4] ?? '';

const specPath = resolve(outDir, 'spec.json');
const copyPath = resolve(outDir, 'copy.json');
const recipePath = resolve(outDir, 'recipe.json');
const pagePath = resolve(outDir, 'page.html');
const criticPath = resolve(outDir, 'critic.json');
const screenshotDir = resolve(outDir, 'screenshots');

function run(cmd: string): string {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] });
}

function extractStructured(filePath: string): void {
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const out = raw.structured_output ?? raw;
  writeFileSync(filePath, JSON.stringify(out, null, 2), 'utf-8');
}

// --- Critic: spec + copy → Claude → critic.json ---
function runCritic(): { overall_score: number; patches: Array<{ priority: string; target: string; issue: string; action: string; reason: string }> } {
  console.log('🔍 Running critic...');
  run(
    `cat "${specPath}" "${copyPath}" | claude -p ` +
    `--append-system-prompt-file prompts/system/screenshot_critic.system.md ` +
    `--output-format json ` +
    `--json-schema "$(cat schemas/critic-report.schema.json)" ` +
    `"Review the landing page spec and copy. Score the structural quality and produce a patch plan." ` +
    `> "${criticPath}"`
  );
  extractStructured(criticPath);
  return JSON.parse(readFileSync(criticPath, 'utf-8'));
}

// --- Patch copy: critic.patches를 Claude에 전달해서 copy 수정 ---
function patchCopy(critic: { keep: string[]; patches: Array<{ target: string; action: string }> }): void {
  console.log('🔧 Patching copy...');
  const patchInstructions = JSON.stringify({
    keep: critic.keep,
    fix: critic.patches.map(p => `[${p.target}] ${p.action}`),
  });

  run(
    `cat "${specPath}" "${recipePath}" "${copyPath}" | claude -p ` +
    `--append-system-prompt-file prompts/system/spec_to_copy.system.md ` +
    `--output-format json ` +
    `--json-schema "$(cat schemas/landing-copy.schema.json)" ` +
    `"Revise the copy based on these critic patches. Preserve what works, fix only the weak parts. Patches: ${patchInstructions.replace(/"/g, '\\"')}" ` +
    `> "${copyPath}"`
  );
  extractStructured(copyPath);
}

// --- Render + Capture ---
function renderAndCapture(): void {
  const heroArgs = [heroImg, heroVid].filter(Boolean).join(' ');
  run(`npx tsx scripts/render-page.ts "${specPath}" "${copyPath}" "${recipePath}" "${pagePath}" ${heroArgs}`);
  run(`npx tsx scripts/capture-screens.ts "${pagePath}" "${screenshotDir}"`);
}

// --- Main loop ---
async function main() {
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`\n━━━ Auto-fix iteration ${i + 1}/${MAX_ITERATIONS} ━━━`);

    // Render current state
    renderAndCapture();

    // Evaluate
    const critic = runCritic();
    console.log(`📊 Score: ${critic.overall_score}`);

    if (critic.overall_score >= THRESHOLD_SHIP) {
      console.log(`✅ Score ${critic.overall_score} >= ${THRESHOLD_SHIP} — 배포 후보!`);
      return;
    }

    console.log(`⚠️  Score ${critic.overall_score} < ${THRESHOLD_SHIP} — patching copy...`);

    // Patch
    const fullCritic = JSON.parse(readFileSync(criticPath, 'utf-8'));
    patchCopy(fullCritic);
  }

  // Final render after last patch
  renderAndCapture();
  const finalCritic = runCritic();
  console.log(`\n📊 Final score: ${finalCritic.overall_score}`);
  if (finalCritic.overall_score >= THRESHOLD_SHIP) {
    console.log('✅ 배포 후보!');
  } else {
    console.log('⚠️  카피/섹션 구조를 재검토하세요.');
  }
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
