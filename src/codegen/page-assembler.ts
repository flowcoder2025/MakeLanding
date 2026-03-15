import { mkdirSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { CopyResult } from '../shared/types.js';
import type { StyleConfig, VideoAssets, PageAssemblerInput } from './types.js';

export function generatePageCode(
  copy: CopyResult,
  style: StyleConfig,
  video: VideoAssets,
): string {
  const navItemsList = copy.navItems
    .map((item) => `    '${item}',`)
    .join('\n');

  return `import Navbar from '@/components/Navbar';
import VideoHero from '@/components/VideoHero';

export default function Home() {
  return (
    <main className="relative min-h-screen" style={{ backgroundColor: '${style.backgroundColor}' }}>
      <Navbar
        logo="${copy.navItems[0] ?? 'Brand'}"
        items={[
${navItemsList}
        ]}
        ctaText="${copy.ctaPrimary}"
      />

      <VideoHero
        headline={[
${copy.headline.map((line) => `          '${line}',`).join('\n')}
        ]}
        subCopy="${copy.subCopy}"
        ctaPrimary="${copy.ctaPrimary}"
        ctaSecondary="${copy.ctaSecondary}"
        videoSrc="/videos/${basename(video.mp4Path)}"
        videoWebmSrc="/videos/${basename(video.webmPath)}"
        posterSrc="/videos/${basename(video.posterPath)}"
      />
    </main>
  );
}
`;
}

export function generateTailwindConfig(style: StyleConfig): string {
  return `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '${style.primaryColor}',
          accent: '${style.accentColor}',
          bg: '${style.backgroundColor}',
        },
      },
      fontFamily: {
        sans: ['${style.fontFamily}', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
`;
}

export function generateLayoutCode(projectName: string): string {
  return `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${projectName}',
  description: '${projectName} - AI Generated Landing Page',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
`;
}

export function generateGlobalsCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow-x: hidden;
}
`;
}

export function generateNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
`;
}

export function generatePackageJson(projectName: string): string {
  const pkg = {
    name: projectName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: {
      next: '^14.2.0',
      react: '^18.3.0',
      'react-dom': '^18.3.0',
      gsap: '^3.12.0',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      autoprefixer: '^10.4.0',
      postcss: '^8.4.0',
      tailwindcss: '^3.4.0',
      typescript: '^5.5.0',
    },
  };

  return JSON.stringify(pkg, null, 2) + '\n';
}

export async function assembleProject(
  input: PageAssemblerInput,
  outputDir: string,
  templatesDir: string,
): Promise<string> {
  const projectDir = join(outputDir, input.projectName);

  const appDir = join(projectDir, 'src', 'app');
  const componentsDir = join(projectDir, 'src', 'components');
  const videosDir = join(projectDir, 'public', 'videos');

  mkdirSync(appDir, { recursive: true });
  mkdirSync(componentsDir, { recursive: true });
  mkdirSync(videosDir, { recursive: true });

  writeFileSync(
    join(appDir, 'page.tsx'),
    generatePageCode(input.copy, input.style, input.video),
    'utf-8',
  );

  writeFileSync(
    join(appDir, 'layout.tsx'),
    generateLayoutCode(input.projectName),
    'utf-8',
  );

  writeFileSync(
    join(appDir, 'globals.css'),
    generateGlobalsCss(),
    'utf-8',
  );

  writeFileSync(
    join(projectDir, 'tailwind.config.ts'),
    generateTailwindConfig(input.style),
    'utf-8',
  );

  writeFileSync(
    join(projectDir, 'next.config.js'),
    generateNextConfig(),
    'utf-8',
  );

  writeFileSync(
    join(projectDir, 'package.json'),
    generatePackageJson(input.projectName),
    'utf-8',
  );

  copyTemplateComponents(templatesDir, componentsDir);
  copyVideoAssets(input.video, videosDir);

  return projectDir;
}

function copyTemplateComponents(templatesDir: string, destDir: string): void {
  const srcDir = join(templatesDir, 'components');
  if (!existsSync(srcDir)) {
    return;
  }

  const files = readdirSync(srcDir).filter((f: string) => f.endsWith('.tsx'));
  for (const file of files) {
    copyFileSync(join(srcDir, file), join(destDir, file));
  }
}

function copyVideoAssets(video: VideoAssets, destDir: string): void {
  const assets = [video.mp4Path, video.webmPath, video.posterPath];
  for (const assetPath of assets) {
    if (existsSync(assetPath)) {
      copyFileSync(assetPath, join(destDir, basename(assetPath)));
    }
  }
}
