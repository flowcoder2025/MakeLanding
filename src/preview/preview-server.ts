import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { exec } from 'node:child_process';
import type { PreviewDeps, PreviewOptions, PreviewServer } from './types.js';

const DEFAULT_PORT = 3000;
const SERVER_TIMEOUT_MS = 30_000;

export async function openBrowserDefault(url: string): Promise<void> {
  const platform = process.platform;
  const cmd = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
  return new Promise((resolve, reject) => {
    exec(`${cmd} ${url}`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function waitForServerDefault(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`서버가 ${timeoutMs}ms 내에 응답하지 않았습니다: ${url}`);
}

export function createDefaultDeps(): PreviewDeps {
  return {
    existsSync,
    spawn: (command, args, options) => spawn(command, args, options as Parameters<typeof spawn>[2]),
    openBrowser: openBrowserDefault,
    waitForServer: waitForServerDefault,
  };
}

export async function startPreview(
  options: PreviewOptions,
  deps: PreviewDeps = createDefaultDeps(),
): Promise<PreviewServer> {
  const { projectDir, port = DEFAULT_PORT, openBrowser: shouldOpen = true } = options;

  if (!deps.existsSync(projectDir)) {
    throw new Error(`프로젝트 디렉토리를 찾을 수 없습니다: ${projectDir}`);
  }

  const packageJsonPath = join(projectDir, 'package.json');
  if (!deps.existsSync(packageJsonPath)) {
    throw new Error(`package.json을 찾을 수 없습니다: ${packageJsonPath}`);
  }

  const url = `http://localhost:${port}`;

  const childProcess = deps.spawn(
    'npm',
    ['run', 'dev', '--', '--port', String(port)],
    { cwd: projectDir, stdio: 'pipe' },
  );

  childProcess.on('error', (err: unknown) => {
    console.error('프리뷰 서버 에러:', err);
  });

  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data: unknown) => {
      const msg = String(data);
      if (msg.includes('ERROR') || msg.includes('error')) {
        console.error('[preview]', msg.trim());
      }
    });
  }

  await deps.waitForServer(url, SERVER_TIMEOUT_MS);

  if (shouldOpen) {
    await deps.openBrowser(url);
  }

  return {
    url,
    port,
    stop: async () => {
      if (!childProcess.killed) {
        childProcess.kill();
      }
    },
  };
}
