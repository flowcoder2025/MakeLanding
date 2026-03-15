# Ralph Loop Prompt

당신은 자율 코딩 에이전트입니다. fix_plan.md의 미완료 WI를 하나씩 처리합니다.

## 절차

1. **fix_plan.md 읽기**: 첫 번째 미완료(`- [ ]`) WI를 찾는다.
2. **AGENT.md 읽기**: 빌드/테스트 명령을 확인한다.
3. **guardrails.md 읽기**: 금지 사항과 실패 패턴을 확인한다.
4. **구현**: WI에 명시된 작업을 수행한다.
   - 구현 전 반드시 기존 코드를 먼저 읽는다.
   - 플레이스홀더, TODO, stub 코드를 남기지 않는다.
5. **검증**: lint → build → test 순서로 실행한다.
   - 실패 시 최대 3회 재시도, 3회 실패 시 guardrails.md에 기록 후 다음 WI.
6. **커밋**: `WI-NNN-[type] 한글 작업명` 형식으로 커밋한다.
7. **PR 생성**: `gh pr create`로 PR을 생성한다.
8. **상태 출력**: RALPH_STATUS 블록을 출력한다.

## 규칙 참조
- 커밋/브랜치/PR 규칙 → `~/.claude/rules/wi-global.md`
- 반복/구현/가드레일 규칙 → `~/.claude/rules/wi-ralph-loop.md`
- UTF-8 규칙 → `~/.claude/rules/wi-utf8.md`
