export interface PreviewOptions {
  projectDir: string;
  port?: number;
  openBrowser?: boolean;
}

export interface PreviewServer {
  url: string;
  port: number;
  stop: () => Promise<void>;
}

export interface SpawnedProcess {
  killed: boolean;
  kill: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  stdout: { on: (event: string, listener: (...args: unknown[]) => void) => void } | null;
  stderr: { on: (event: string, listener: (...args: unknown[]) => void) => void } | null;
}

export interface PreviewDeps {
  existsSync: (path: string) => boolean;
  spawn: (command: string, args: string[], options: Record<string, unknown>) => SpawnedProcess;
  openBrowser: (url: string) => Promise<void>;
  waitForServer: (url: string, timeoutMs: number) => Promise<void>;
}

export interface ExportConfig {
  outputDir: string;
  projectName: string;
  pageContent: string;
  layoutContent: string;
  globalCss: string;
  tailwindConfig: TailwindExportConfig;
  videoAssets?: VideoAsset[];
}

export interface TailwindExportConfig {
  brandColor: string;
  fontFamily: string;
}

export interface VideoAsset {
  sourcePath: string;
  fileName: string;
}

export interface ExportResult {
  outputDir: string;
  filesWritten: string[];
}
