import type { PipelineProgress, PipelineStage } from './types.js';

const STAGE_LABELS: Record<PipelineStage, string> = {
  'input-validation': '입력 검증',
  'copy-generation': 'AI 카피 생성',
  'style-resolution': '브랜드 스타일 결정',
  'video-generation': '비디오 생성 (ComfyUI)',
  'video-postprocess': '비디오 후처리',
  'code-generation': '페이지 코드 생성',
  'project-export': '프로젝트 내보내기',
  'preview': '프리뷰 서버 실행',
};

const STAGES_ORDER: PipelineStage[] = [
  'input-validation',
  'copy-generation',
  'style-resolution',
  'video-generation',
  'video-postprocess',
  'code-generation',
  'project-export',
  'preview',
];

const STATUS_ICONS: Record<PipelineProgress['status'], string> = {
  pending: ' ',
  running: '>',
  done: 'v',
  error: 'x',
  skipped: '-',
};

export function createCliProgressReporter(): (progress: PipelineProgress) => void {
  const stageStates = new Map<PipelineStage, PipelineProgress['status']>();

  return (progress: PipelineProgress) => {
    stageStates.set(progress.stage, progress.status);

    const completedCount = Array.from(stageStates.values()).filter(
      s => s === 'done' || s === 'skipped',
    ).length;
    const totalStages = STAGES_ORDER.length;

    const label = STAGE_LABELS[progress.stage];
    const icon = STATUS_ICONS[progress.status];

    const line = `[${icon}] [${completedCount}/${totalStages}] ${label}`;

    if (progress.status === 'error' && progress.message) {
      process.stderr.write(`${line} - ${progress.message}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  };
}
