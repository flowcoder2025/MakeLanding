import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startPreview } from '../../src/preview/preview-server.js';
import type { PreviewDeps, PreviewOptions } from '../../src/preview/types.js';

function createMockDeps(overrides: Partial<PreviewDeps> = {}): PreviewDeps {
  const mockProcess = {
    killed: false,
    kill: vi.fn(() => { mockProcess.killed = true; }),
    on: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  };

  return {
    existsSync: vi.fn().mockReturnValue(true),
    spawn: vi.fn().mockReturnValue(mockProcess),
    openBrowser: vi.fn().mockResolvedValue(undefined),
    waitForServer: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const DEFAULT_OPTIONS: PreviewOptions = {
  projectDir: '/tmp/out/my-landing',
};

describe('startPreview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('프로젝트 디렉토리에서 dev 서버를 시작한다', async () => {
    const deps = createMockDeps();

    const server = await startPreview(DEFAULT_OPTIONS, deps);

    expect(deps.spawn).toHaveBeenCalledWith(
      'npm',
      ['run', 'dev', '--', '--port', '3000'],
      expect.objectContaining({
        cwd: DEFAULT_OPTIONS.projectDir,
        stdio: 'pipe',
      }),
    );
    expect(server.url).toBe('http://localhost:3000');
    expect(server.port).toBe(3000);
  });

  it('사용자 지정 포트를 사용한다', async () => {
    const deps = createMockDeps();

    const server = await startPreview({ ...DEFAULT_OPTIONS, port: 4000 }, deps);

    expect(deps.spawn).toHaveBeenCalledWith(
      'npm',
      ['run', 'dev', '--', '--port', '4000'],
      expect.objectContaining({ cwd: DEFAULT_OPTIONS.projectDir }),
    );
    expect(server.url).toBe('http://localhost:4000');
    expect(server.port).toBe(4000);
  });

  it('서버 시작 후 브라우저를 자동으로 연다', async () => {
    const deps = createMockDeps();

    await startPreview(DEFAULT_OPTIONS, deps);

    expect(deps.openBrowser).toHaveBeenCalledWith('http://localhost:3000');
  });

  it('openBrowser: false 시 브라우저를 열지 않는다', async () => {
    const deps = createMockDeps();

    await startPreview({ ...DEFAULT_OPTIONS, openBrowser: false }, deps);

    expect(deps.openBrowser).not.toHaveBeenCalled();
  });

  it('프로젝트 디렉토리가 없으면 에러를 던진다', async () => {
    const deps = createMockDeps({
      existsSync: vi.fn().mockReturnValue(false),
    });

    await expect(startPreview(DEFAULT_OPTIONS, deps)).rejects.toThrow(
      '프로젝트 디렉토리를 찾을 수 없습니다',
    );
  });

  it('package.json이 없으면 에러를 던진다', async () => {
    const deps = createMockDeps({
      existsSync: vi.fn().mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return false;
        return true;
      }),
    });

    await expect(startPreview(DEFAULT_OPTIONS, deps)).rejects.toThrow(
      'package.json을 찾을 수 없습니다',
    );
  });

  it('stop()을 호출하면 프로세스를 종료한다', async () => {
    const deps = createMockDeps();

    const server = await startPreview(DEFAULT_OPTIONS, deps);
    await server.stop();

    const mockProc = (deps.spawn as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockProc.kill).toHaveBeenCalled();
  });

  it('서버가 준비될 때까지 대기한다', async () => {
    const deps = createMockDeps();

    await startPreview(DEFAULT_OPTIONS, deps);

    expect(deps.waitForServer).toHaveBeenCalledWith('http://localhost:3000', expect.any(Number));
  });

  it('기본 포트는 3000이다', async () => {
    const deps = createMockDeps();

    const server = await startPreview({ projectDir: '/tmp/out/test' }, deps);

    expect(server.port).toBe(3000);
  });
});
