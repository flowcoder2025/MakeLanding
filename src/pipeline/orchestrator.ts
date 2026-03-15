import type {
  PipelineDeps,
  PipelineOptions,
  PipelineProgress,
  PipelineResult,
  PipelineStage,
  VideoAssets,
} from './types.js';

function report(
  deps: PipelineDeps,
  stage: PipelineStage,
  status: PipelineProgress['status'],
  message?: string,
): void {
  deps.onProgress?.({ stage, status, message });
}

async function executeStage<T>(
  deps: PipelineDeps,
  stage: PipelineStage,
  fn: () => T | Promise<T>,
): Promise<T> {
  report(deps, stage, 'running');
  try {
    const result = await fn();
    report(deps, stage, 'done');
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report(deps, stage, 'error', message);
    throw error;
  }
}

function skipStage(deps: PipelineDeps, stage: PipelineStage): void {
  report(deps, stage, 'skipped');
}

export async function runPipeline(
  options: PipelineOptions,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const { input, outputDir, skipVideo = false, skipPreview = false } = options;

  await executeStage(deps, 'input-validation', () => {
    deps.validateInput(input);
  });

  const copy = await executeStage(deps, 'copy-generation', () =>
    deps.generateCopy(input),
  );

  const style = await executeStage(deps, 'style-resolution', () =>
    deps.resolveStyle(input),
  );

  let video: VideoAssets | null = null;

  if (skipVideo) {
    skipStage(deps, 'video-generation');
    skipStage(deps, 'video-postprocess');
  } else {
    const rawVideoPath = await executeStage(deps, 'video-generation', () =>
      deps.generateVideo(input, style),
    );

    video = await executeStage(deps, 'video-postprocess', () =>
      deps.postprocessVideo(rawVideoPath, outputDir),
    );
  }

  const page = await executeStage(deps, 'code-generation', () =>
    deps.assemblePage(copy, style, video, outputDir),
  );

  await executeStage(deps, 'project-export', () =>
    deps.exportProject(page),
  );

  let previewUrl: string | null = null;

  if (skipPreview) {
    skipStage(deps, 'preview');
  } else {
    previewUrl = await executeStage(deps, 'preview', () =>
      deps.startPreview(outputDir),
    );
  }

  return { input, copy, style, video, page, previewUrl };
}
