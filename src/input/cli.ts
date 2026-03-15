import { Command } from 'commander';
import type { BusinessInput } from '../shared/types.js';
import { loadConfigFile } from './config-loader.js';

interface GenerateOptions {
  config?: string;
  name?: string;
  industry?: string;
  message?: string;
  target?: string;
}

function buildProgram(): Command {
  const program = new Command();

  program
    .name('makelanding')
    .description('AI 비디오 배경 프리미엄 랜딩 페이지 자동 생성 도구')
    .version('0.1.0');

  program
    .command('generate')
    .description('랜딩 페이지를 생성합니다')
    .option('-c, --config <path>', 'JSON 설정 파일 경로')
    .option('-n, --name <name>', '비즈니스명')
    .option('-i, --industry <industry>', '업종')
    .option('-m, --message <message>', '핵심 메시지')
    .option('-t, --target <target>', '타겟 고객')
    .action(async (options: GenerateOptions) => {
      const input = await resolveInput(options);
      console.log(JSON.stringify(input, null, 2));
    });

  return program;
}

async function resolveInput(options: GenerateOptions): Promise<BusinessInput> {
  if (options.config) {
    return loadConfigFile(options.config);
  }

  const missing: string[] = [];
  if (!options.name) missing.push('--name');
  if (!options.industry) missing.push('--industry');
  if (!options.message) missing.push('--message');
  if (!options.target) missing.push('--target');

  if (missing.length > 0) {
    throw new Error(
      `다음 옵션이 필요합니다: ${missing.join(', ')}\n` +
      '또는 --config <path>로 JSON 설정 파일을 지정하세요.',
    );
  }

  return {
    businessName: options.name!,
    industry: options.industry!,
    coreMessage: options.message!,
    targetCustomer: options.target!,
  };
}

export { buildProgram, resolveInput };
