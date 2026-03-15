# Agent Commands - MakeLanding (TypeScript)

## Install Dependencies
```bash
npm ci
```

## Lint
```bash
npm run lint
```

## Build
```bash
npm run build
```

## Test
```bash
npm test
```

## Type Check
```bash
npx tsc --noEmit
```

## Dev Server (프리뷰 확인용)
```bash
npm run dev
```

## FFmpeg (비디오 후처리)
```bash
# Windows — winget 설치 경로
FFMPEG="/c/Users/User/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.0.1-full_build/bin/ffmpeg.exe"
```

## ComfyUI (로컬 서버)
```
URL: http://127.0.0.1:8188
API: http://127.0.0.1:8188/api
```

## Notes
- 이 프로젝트는 CLI 도구이므로 package.json이 아직 없을 수 있음
- 첫 WI(WI-001)에서 `npm init` + 의존성 설치가 필요할 수 있음
- 검증 실패 시 package.json 존재 여부부터 확인
