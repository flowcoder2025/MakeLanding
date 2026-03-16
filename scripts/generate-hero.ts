/**
 * 히어로 이미지 생성 파이프라인
 * 1. FLUX.1 schnell로 3장 생성 + RealESRGAN x4 업스케일
 * 2. 가장 적합한 1장 선택 (첫 번째 사용, 향후 Claude Vision 선택 가능)
 * 3. Wan2.2 I2V로 3초 루프 영상 생성
 *
 * Usage: npx tsx scripts/generate-hero.ts <outputs-dir> <copy.json> <recipe.json>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const COMFYUI_URL = process.env.COMFYUI_URL ?? 'http://127.0.0.1:8000';
const NUM_CANDIDATES = 3;

const outputDir = process.argv[2] ?? 'outputs';
const copyPath = process.argv[3] ?? `${outputDir}/copy.json`;
const recipePath = process.argv[4] ?? `${outputDir}/recipe.json`;

mkdirSync(outputDir, { recursive: true });

interface CopyJson { visual_brief?: { hero_scene?: string } }
interface RecipeJson { prompt_suffix?: string; style_tokens?: string[] }

const copy: CopyJson = JSON.parse(readFileSync(copyPath, 'utf-8'));
const recipe: RecipeJson = JSON.parse(readFileSync(recipePath, 'utf-8'));

const heroScene = copy.visual_brief?.hero_scene ?? 'Premium product photography, studio lighting, clean background';
const styleSuffix = recipe.prompt_suffix ?? '';

// 청사진 템플릿: hero_scene + style_tokens + 안전 규칙
const fullPrompt = [
  heroScene,
  styleSuffix,
  'strong negative space for headline placement, clean composition, polished lighting',
  'no embedded text, no UI paragraphs, no buttons, no watermark',
  'high detail, realistic materials, 8k quality',
].join(', ');

const negativePrompt = 'text, watermark, logo, blurry, low quality, cartoon, illustration, anime, cluttered, messy, UI elements, buttons, paragraphs';

// --- ComfyUI API ---
async function enqueue(workflow: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!res.ok) throw new Error(`Enqueue failed (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { prompt_id: string }).prompt_id;
}

async function waitForJob(promptId: string, timeoutMs = 600_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    const h = (await res.json()) as Record<string, { status?: { completed?: boolean } }>;
    if (h[promptId]?.status?.completed) return;
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`Job ${promptId} timed out`);
}

async function getOutputFilename(promptId: string, nodeId: string): Promise<string> {
  const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
  const h = (await res.json()) as Record<string, { outputs?: Record<string, { images?: Array<{ filename: string }> }> }>;
  const file = h[promptId]?.outputs?.[nodeId]?.images?.[0];
  if (!file) throw new Error(`No output from node ${nodeId}`);
  return file.filename;
}

async function downloadOutput(filename: string, destPath: string): Promise<void> {
  const res = await fetch(`${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

async function uploadImage(srcPath: string, filename: string): Promise<void> {
  const fileData = readFileSync(srcPath);
  const formData = new FormData();
  formData.append('image', new Blob([fileData]), filename);
  const res = await fetch(`${COMFYUI_URL}/upload/image`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

// --- Workflows ---
function imageWorkflow(prompt: string, negative: string, seed: number) {
  return {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'flux1-schnell-fp8.safetensors' } },
    '2': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
    '3': { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['1', 1] } },
    '4': { class_type: 'EmptyLatentImage', inputs: { width: 1344, height: 768, batch_size: 1 } },
    '5': { class_type: 'KSampler', inputs: { model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0], seed, steps: 4, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1 } },
    '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    '8': { class_type: 'UpscaleModelLoader', inputs: { model_name: 'RealESRGAN_x4plus.pth' } },
    '9': { class_type: 'ImageUpscaleWithModel', inputs: { upscale_model: ['8', 0], image: ['6', 0] } },
    '7': { class_type: 'SaveImage', inputs: { images: ['9', 0], filename_prefix: `hero-candidate-${seed}` } },
  };
}

function videoWorkflow(inputImage: string, prompt: string) {
  return {
    '1':  { class_type: 'UNETLoader', inputs: { unet_name: 'wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors', weight_dtype: 'fp8_e4m3fn' } },
    '2':  { class_type: 'LoraLoaderModelOnly', inputs: { model: ['1', 0], lora_name: 'wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors', strength_model: 1 } },
    '3':  { class_type: 'ModelSamplingSD3', inputs: { model: ['2', 0], shift: 5 } },
    '10': { class_type: 'UNETLoader', inputs: { unet_name: 'wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors', weight_dtype: 'fp8_e4m3fn' } },
    '11': { class_type: 'LoraLoaderModelOnly', inputs: { model: ['10', 0], lora_name: 'wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors', strength_model: 1 } },
    '12': { class_type: 'ModelSamplingSD3', inputs: { model: ['11', 0], shift: 5 } },
    '20': { class_type: 'CLIPLoader', inputs: { clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', type: 'wan' } },
    '21': { class_type: 'CLIPTextEncode', inputs: { text: `${prompt}, subtle ambient motion, gentle lighting shift, smooth cinematic, no fast motion`, clip: ['20', 0] } },
    '22': { class_type: 'CLIPTextEncode', inputs: { text: 'text, watermark, fast motion, shaky camera, blurry, distorted, flicker', clip: ['20', 0] } },
    '25': { class_type: 'VAELoader', inputs: { vae_name: 'wan_2.1_vae.safetensors' } },
    '30': { class_type: 'CLIPVisionLoader', inputs: { clip_name: 'CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors' } },
    '31': { class_type: 'LoadImage', inputs: { image: inputImage } },
    '32': { class_type: 'CLIPVisionEncode', inputs: { clip_vision: ['30', 0], image: ['31', 0], crop: 'center' } },
    '35': { class_type: 'WanImageToVideo', inputs: { positive: ['21', 0], negative: ['22', 0], vae: ['25', 0], width: 832, height: 480, length: 25, batch_size: 1, clip_vision_output: ['32', 0], start_image: ['31', 0] } },
    '40': { class_type: 'KSamplerAdvanced', inputs: { model: ['3', 0], positive: ['35', 0], negative: ['35', 1], latent_image: ['35', 2], noise_seed: 42, steps: 4, cfg: 1, sampler_name: 'euler', scheduler: 'simple', start_at_step: 0, end_at_step: 2, add_noise: 'enable', return_with_leftover_noise: 'enable' } },
    '41': { class_type: 'KSamplerAdvanced', inputs: { model: ['12', 0], positive: ['35', 0], negative: ['35', 1], latent_image: ['40', 0], noise_seed: 42, steps: 4, cfg: 1, sampler_name: 'euler', scheduler: 'simple', start_at_step: 2, end_at_step: 4, add_noise: 'disable', return_with_leftover_noise: 'disable' } },
    '50': { class_type: 'VAEDecode', inputs: { samples: ['41', 0], vae: ['25', 0] } },
    '60': { class_type: 'SaveAnimatedWEBP', inputs: { images: ['50', 0], filename_prefix: 'hero-video', fps: 8, lossless: false, quality: 85, method: 'default' } },
  };
}

// --- Main ---
async function main() {
  // Step 1: Generate 3 candidate images
  console.log(`🎨 Step 1: Generating ${NUM_CANDIDATES} hero candidates with FLUX.1 schnell + RealESRGAN x4...`);
  const seeds = Array.from({ length: NUM_CANDIDATES }, (_, i) => 10000 + i * 11111);
  const jobs: string[] = [];

  for (const seed of seeds) {
    const id = await enqueue(imageWorkflow(fullPrompt, negativePrompt, seed));
    jobs.push(id);
    console.log(`   Queued candidate seed=${seed}: ${id}`);
  }

  // Wait for all
  for (const id of jobs) await waitForJob(id);

  // Download all candidates
  const candidatePaths: string[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const filename = await getOutputFilename(jobs[i], '7');
    const dest = resolve(outputDir, `hero-candidate-${i + 1}.png`);
    await downloadOutput(filename, dest);
    candidatePaths.push(dest);
    console.log(`   ✅ candidate ${i + 1} → ${dest}`);
  }

  // Step 2: Select best (currently: first candidate, TODO: Claude Vision scoring)
  console.log('🔍 Step 2: Selecting best candidate (using first for now)...');
  const bestPath = candidatePaths[0];
  const heroDest = resolve(outputDir, 'hero-bg.png');
  writeFileSync(heroDest, readFileSync(bestPath));
  console.log(`✅ hero image → ${heroDest}`);

  // Step 3: I2V video
  console.log('🎬 Step 3: Generating I2V motion video with Wan2.2...');
  const inputName = 'hero-pipeline-input.png';
  await uploadImage(heroDest, inputName);
  const vidId = await enqueue(videoWorkflow(inputName, heroScene));
  console.log(`   Queued: ${vidId}`);
  await waitForJob(vidId, 600_000);
  const vidFile = await getOutputFilename(vidId, '60');
  const vidDest = resolve(outputDir, 'hero-bg-video.webp');
  await downloadOutput(vidFile, vidDest);
  console.log(`✅ hero video → ${vidDest}`);
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
