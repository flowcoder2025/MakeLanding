import { Command } from 'commander';
import { loadConfigFile } from './config-loader.js';
import { validateInput } from './validator.js';
import type { LandingPageInput } from '../shared/types.js';

export function parseCliArgs(argv: string[]): LandingPageInput {
  const program = new Command();

  program
    .name('makelanding')
    .description('AI 비디오 배경 프리미엄 랜딩 페이지 자동 생성 도구');

  let parsedInput: LandingPageInput | undefined;

  program
    .command('generate')
    .description('랜딩 페이지를 생성합니다')
    .option('-c, --config <path>', 'JSON 설정 파일 경로')
    .option('--business-name <name>', '비즈니스명')
    .option('--industry <industry>', '업종')
    .option('--core-message <message>', '핵심 메시지')
    .option('--target-audience <audience>', '타겟 고객')
    .action((opts) => {
      let base: Partial<LandingPageInput> = {};

      if (opts.config) {
        base = loadConfigFile(opts.config);
      }

      const input: LandingPageInput = {
        businessName: opts.businessName ?? base.businessName ?? '',
        industry: opts.industry ?? base.industry ?? '',
        coreMessage: opts.coreMessage ?? base.coreMessage ?? '',
        targetAudience: opts.targetAudience ?? base.targetAudience ?? '',
      };

      validateInput(input);
      parsedInput = input;
    });

  program.parse(argv);

  if (!parsedInput) {
    throw new Error('generate 명령을 사용해주세요. 예: makelanding generate --config input.json');
  }

  return parsedInput;
}
