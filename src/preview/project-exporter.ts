import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ExportConfig, ExportResult, TailwindExportConfig } from './types.js';

export async function exportProject(config: ExportConfig): Promise<ExportResult> {
  const { outputDir } = config;
  const filesWritten: string[] = [];

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(join(outputDir, 'app'), { recursive: true });
  mkdirSync(join(outputDir, 'public'), { recursive: true });

  writeAndTrack(outputDir, 'package.json', generatePackageJson(config.projectName), filesWritten);
  writeAndTrack(outputDir, 'next.config.mjs', generateNextConfig(), filesWritten);
  writeAndTrack(outputDir, 'tailwind.config.ts', generateTailwindConfig(config.tailwindConfig), filesWritten);
  writeAndTrack(outputDir, 'tsconfig.json', generateTsConfig(), filesWritten);
  writeAndTrack(outputDir, 'postcss.config.mjs', generatePostcssConfig(), filesWritten);

  writeAndTrack(outputDir, join('app', 'page.tsx'), config.pageContent, filesWritten);
  writeAndTrack(outputDir, join('app', 'layout.tsx'), config.layoutContent, filesWritten);
  writeAndTrack(outputDir, join('app', 'globals.css'), config.globalCss, filesWritten);

  if (config.videoAssets && config.videoAssets.length > 0) {
    const videosDir = join(outputDir, 'public', 'videos');
    mkdirSync(videosDir, { recursive: true });

    for (const asset of config.videoAssets) {
      if (!existsSync(asset.sourcePath)) {
        throw new Error(`비디오 파일을 찾을 수 없습니다: ${asset.sourcePath}`);
      }
      const destPath = join(videosDir, asset.fileName);
      copyFileSync(asset.sourcePath, destPath);
      filesWritten.push(toPosix(join('public', 'videos', asset.fileName)));
    }
  }

  return { outputDir, filesWritten };
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function writeAndTrack(baseDir: string, filePath: string, content: string, tracker: string[]) {
  writeFileSync(join(baseDir, filePath), content, 'utf-8');
  tracker.push(toPosix(filePath));
}

function generatePackageJson(projectName: string): string {
  const pkg = {
    name: projectName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      next: '14.2.21',
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      gsap: '^3.12.5',
    },
    devDependencies: {
      '@types/node': '^20.14.0',
      '@types/react': '^18.3.3',
      '@types/react-dom': '^18.3.0',
      autoprefixer: '^10.4.19',
      postcss: '^8.4.38',
      tailwindcss: '^3.4.4',
      typescript: '^5.5.0',
    },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

function generateNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /\\.(mp4|webm)$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
`;
}

function generateTailwindConfig(tailwind: TailwindExportConfig): string {
  return `import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '${tailwind.brandColor}',
      },
      fontFamily: {
        main: ['${tailwind.fontFamily}', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
`;
}

function generateTsConfig(): string {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  };
  return JSON.stringify(tsconfig, null, 2) + '\n';
}

function generatePostcssConfig(): string {
  return `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`;
}
