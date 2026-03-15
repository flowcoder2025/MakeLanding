# MakeLanding - Project Rules

## Project Info
- **Name**: MakeLanding
- **Type**: TypeScript (Node.js)
- **Description**: AI 비디오 배경 프리미엄 랜딩 페이지 자동 생성 도구

## Rule Inheritance
이 프로젝트는 글로벌 규칙을 상속합니다:
- `~/.claude/rules/wi-global.md` — 커밋, 브랜치, PR, 코드 규칙
- `~/.claude/rules/wi-ralph-loop.md` — Ralph Loop 실행 규칙
- `~/.claude/rules/wi-utf8.md` — UTF-8 인코딩 규칙

## Tech Stack
- Node.js 20 + TypeScript
- npm 패키지 매니저
- ESLint + Vitest

---

## 작업 전 체크리스트 (필수)

- [ ] **경계 확인**: 이 코드는 생성기(`src/`)인가, 템플릿(`templates/`)인가?
- [ ] **모듈 소속**: 어느 도메인 모듈에 속하는가? (input / comfyui / codegen / preview / shared)
- [ ] **캡슐화**: 모듈 외부에서 접근할 API만 `index.ts`에 노출했는가?
- [ ] **재사용 확인**: 같은 코드가 이미 있는가? 2회 반복 시 분리했는가?
- [ ] **설정 분리**: URL, API키, 경로, 매직넘버가 코드에 박혀있지 않은가?

### 위반 시
**체크리스트 미확인 시 사용자에게 경고 후 확인 진행**

---

## Architecture

### 핵심: 생성기 vs 템플릿 분리

이 프로젝트는 **코드를 만드는 도구**이므로 두 영역의 경계가 가장 중요하다.

```
src/                    # 생성기 코드 (도구 자체)
  input/                #   주제 입력 & 파싱
  comfyui/              #   ComfyUI API 연동
  codegen/              #   랜딩 페이지 코드 조합
  preview/              #   프리뷰 서버 & 내보내기
  pipeline/             #   전체 파이프라인 오케스트레이션
  shared/               #   공통 유틸, 타입, 상수
    constants.ts        #     ComfyUI URL, 기본값 등
    types.ts            #     공통 인터페이스

templates/              # 출력 템플릿 (생성될 랜딩 페이지의 원형)
  components/           #   VideoHero, Navbar, CTA 등 React 컴포넌트
  layouts/              #   페이지 레이아웃
  styles/               #   Tailwind 설정, 글로벌 CSS
  next-config/          #   next.config.js, package.json 템플릿

prompts/                # AI 프롬프트 (LLM 카피, ComfyUI 워크플로우)
  copy/                 #   카피라이팅 프롬프트
  comfyui/              #   비디오 생성 워크플로우 JSON 템플릿

out/                    # 생성 결과물 (gitignore)
```

**규칙:**
- `src/` 코드가 `templates/`를 직접 import 하지 않는다 — 파일로 읽어서 조합
- `templates/` 코드는 독립 실행 가능해야 한다 — `out/`에 복사 후 `npm run dev` 동작
- `prompts/`는 코드가 아닌 텍스트/JSON — 버전 관리 대상

### 모듈 구조

각 도메인 모듈은 규모에 따라 유연하게:

```
# 작은 모듈 — 단일 파일이면 충분
input/
  index.ts

# 큰 모듈 — 내부 파일 분리
comfyui/
  index.ts              # Public API만 export
  client.ts             # API 클라이언트
  workflow-builder.ts   # 워크플로우 생성
  types.ts              # 모듈 내부 타입
```

**규칙:**
- `index.ts`만 외부 노출 (다른 모듈에서 `import { x } from '../comfyui'`)
- 모듈 내부 파일은 해당 모듈에서만 import
- `internal/` 폴더 강제하지 않음 — 파일명으로 구분 가능하면 플랫 구조 OK

---

## 프로젝트 특화 규칙

### ComfyUI 워크플로우 관리
- 워크플로우 JSON은 `prompts/comfyui/`에 템플릿으로 보관
- 런타임에 변수(프롬프트, 해상도 등)를 치환하여 사용
- 워크플로우 변경 시 기존 템플릿과 비교 후 수정 (실험 기록 필수)

### LLM 프롬프트 관리
- 카피라이팅 프롬프트는 `prompts/copy/`에 별도 파일로 관리
- 코드에 프롬프트 문자열 인라인 금지
- 프롬프트 변경 = 별도 커밋 (코드 변경과 분리)

### 비디오 파일 관리
- 생성된 비디오: `out/{project-name}/public/videos/`
- 네이밍: `hero-bg.mp4`, `hero-bg.webm`, `hero-poster.jpg`
- 원본(ComfyUI 출력)은 `out/`에만 보관, git에 포함하지 않음

### 생성 결과물 규칙
- `out/` 폴더는 `.gitignore` 대상
- 결과물은 독립 실행 가능한 Next.js 프로젝트여야 함
- `npm install && npm run dev`로 즉시 실행 가능

### 하드코딩 금지
- ComfyUI 서버 주소 → `shared/constants.ts` 또는 환경변수
- API 키 → `.env` (gitignore)
- 비디오 해상도/길이 → 설정 파일
- HTML에 `<meta charset="UTF-8">` 필수

### UTF-8
- 모든 파일 UTF-8 (BOM 없음)
- 파일 읽기/쓰기 시 `encoding: 'utf-8'` 명시
- 한글 카피 생성 특성상 인코딩 누락 = 치명적 버그
