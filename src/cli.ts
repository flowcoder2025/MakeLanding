#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCliArgs } from './input/cli-parser.js';
import { validateInput } from './input/validator.js';
import { resolveStyle, toStyleConfig } from './input/style-resolver.js';
import { generateCopy } from './codegen/copy-generator.js';
import { createLlmClient } from './codegen/llm-client.js';
import { generateVideo } from './comfyui/video-generator.js';
import { postProcessVideo } from './comfyui/video-postprocess.js';
import { assembleProject } from './codegen/page-assembler.js';
import { startPreview } from './preview/preview-server.js';
import { runPipeline, createCliProgressReporter } from './pipeline/index.js';
import {
  DEFAULT_LLM_PROVIDER,
  DEFAULT_LLM_MODEL_ANTHROPIC,
  DEFAULT_LLM_MODEL_OPENAI,
} from './shared/constants.js';
import type { PipelineDeps, PageOutput } from './pipeline/types.js';
import type { StyleConfig, VideoAssets } from './codegen/types.js';
import type { CopyResult } from './shared/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../templates');

const { input, outputDir, skipVideo, skipPreview } = parseCliArgs(process.argv);

const apiKey = process.env.LLM_API_KEY ?? '';
const provider = DEFAULT_LLM_PROVIDER;
const model = provider === 'openai' ? DEFAULT_LLM_MODEL_OPENAI : DEFAULT_LLM_MODEL_ANTHROPIC;

const llmClient = apiKey
  ? createLlmClient({ provider, apiKey, model })
  : null;

const deps: PipelineDeps = {
  validateInput,

  generateCopy: async (inp) => {
    if (!llmClient) {
      throw new Error('LLM_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    return generateCopy(inp, llmClient);
  },

  resolveStyle: async (inp) => {
    const brand = resolveStyle(inp);
    return toStyleConfig(brand);
  },

  generateVideo,

  postprocessVideo: async (rawVideoPath, outDir) => {
    const result = await postProcessVideo({
      inputPath: rawVideoPath,
      outputDir: join(outDir, 'public', 'videos'),
    });
    return result;
  },

  assemblePage: async (
    copy: CopyResult,
    style: StyleConfig,
    video: VideoAssets | null,
    outDir: string,
  ): Promise<PageOutput> => {
    const projectName = input.businessName.toLowerCase().replace(/\s+/g, '-');
    const projectDir = await assembleProject(
      { projectName, copy, style, video },
      outDir,
      TEMPLATES_DIR,
    );
    return { outputDir: projectDir, files: [] };
  },

  exportProject: async () => {
    // assembleProject가 이미 모든 파일을 생성함
  },

  startPreview: async (outDir) => {
    const server = await startPreview({ projectDir: outDir });
    return server.url;
  },

  onProgress: createCliProgressReporter(),
};

runPipeline({ input, outputDir, skipVideo, skipPreview }, deps)
  .then((result) => {
    console.log('\n✅ 랜딩 페이지 생성 완료!');
    if (result.previewUrl) {
      console.log(`🌐 프리뷰: ${result.previewUrl}`);
    }
    console.log(`📁 출력: ${result.page.outputDir}`);
  })
  .catch((err) => {
    console.error('\n❌ 오류:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
