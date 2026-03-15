#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Ralph Loop - Autonomous Coding Agent Runner
# Project: MakeLanding (TypeScript)
# ============================================================

# --- UTF-8 설정 ---
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

# Windows (Git Bash / MSYS2) 감지 시 chcp 설정
if command -v chcp.com &>/dev/null; then
  chcp.com 65001 >/dev/null 2>&1 || true
fi

# --- .ralphrc 로드 ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/.ralphrc" ]]; then
  source "$SCRIPT_DIR/.ralphrc"
fi

# --- 설정 변수 (기본값) ---
MAX_ITERATIONS="${MAX_ITERATIONS:-50}"
RATE_LIMIT_PER_HOUR="${RATE_LIMIT_PER_HOUR:-80}"
COOLDOWN_SEC="${COOLDOWN_SEC:-5}"
ERROR_COOLDOWN_SEC="${ERROR_COOLDOWN_SEC:-30}"
ALLOWED_TOOLS="${ALLOWED_TOOLS:-Edit,Write,Read,Bash,Glob,Grep}"
NO_PROGRESS_LIMIT="${NO_PROGRESS_LIMIT:-3}"

# --- 상태 변수 ---
iteration=0
tasks_completed=0
total_tasks_completed=0
no_progress_count=0
last_sha=""
start_time=$(date +%s)
invocations_this_hour=0
hour_start=$(date +%s)

# --- 색상 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ============================================================
# preflight() — 사전 검증
# ============================================================
preflight() {
  log_info "Preflight checks..."

  # claude CLI
  if ! command -v claude &>/dev/null; then
    log_error "claude CLI not found. Install: npm install -g @anthropic-ai/claude-code"
    exit 1
  fi

  # gh CLI
  if ! command -v gh &>/dev/null; then
    log_error "gh CLI not found. Install: https://cli.github.com/"
    exit 1
  fi

  # gh 인증
  if ! gh auth status &>/dev/null 2>&1; then
    log_error "gh not authenticated. Run: gh auth login"
    exit 1
  fi

  # git 저장소
  if ! git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
    log_error "Not a git repository."
    exit 1
  fi

  # 필수 파일
  local required_files=(".ralph/PROMPT.md" ".ralph/fix_plan.md" ".ralph/AGENT.md" ".ralphrc" ".ralph/guardrails.md")
  for f in "${required_files[@]}"; do
    if [[ ! -f "$SCRIPT_DIR/$f" ]]; then
      log_error "Required file missing: $f"
      exit 1
    fi
  done

  # fix_plan에 미완료 WI 존재 확인
  local unchecked
  unchecked=$(count_tasks "unchecked")
  if [[ "$unchecked" -eq 0 ]]; then
    local completed
    completed=$(count_tasks "completed")
    if [[ "$completed" -eq 0 ]]; then
      log_error "fix_plan.md is empty. Run /wi:prd first."
      exit 1
    else
      log_ok "All tasks already completed."
      exit 0
    fi
  fi

  log_ok "Preflight passed. $unchecked task(s) remaining."
}

# ============================================================
# count_tasks() — 코드블록 내부 제외하고 체크박스 카운트
# ============================================================
count_tasks() {
  local mode="$1"  # "unchecked" or "completed"
  awk '
    /^```/ { in_code = !in_code; next }
    in_code { next }
    /^- \[ \] / && mode == "unchecked" { count++ }
    /^- \[x\] / && mode == "completed" { count++ }
    END { print count + 0 }
  ' mode="$mode" "$SCRIPT_DIR/.ralph/fix_plan.md"
}

# ============================================================
# check_all_done() — 전체 완료 확인
# ============================================================
check_all_done() {
  local completed unchecked
  completed=$(count_tasks "completed")
  unchecked=$(count_tasks "unchecked")

  if [[ "$completed" -eq 0 && "$unchecked" -eq 0 ]]; then
    # 빈 상태 — 완료 아님
    return 1
  fi

  if [[ "$unchecked" -eq 0 ]]; then
    log_ok "All $completed tasks completed!"
    return 0
  fi

  return 1
}

# ============================================================
# check_progress() — 무진행 감지 (circuit breaker)
# ============================================================
check_progress() {
  local current_sha
  current_sha=$(git rev-parse HEAD 2>/dev/null || echo "none")

  # uncommitted 변경 감지
  local has_changes=false
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    has_changes=true
  fi

  if [[ "$current_sha" == "$last_sha" && "$has_changes" == "false" ]]; then
    no_progress_count=$((no_progress_count + 1))
    log_warn "No progress detected ($no_progress_count/$NO_PROGRESS_LIMIT)"

    if [[ "$no_progress_count" -ge "$NO_PROGRESS_LIMIT" ]]; then
      log_error "Circuit breaker: $NO_PROGRESS_LIMIT consecutive iterations without progress."
      log_error "Check guardrails.md for recorded failures."
      return 1
    fi
  else
    no_progress_count=0
    last_sha="$current_sha"
  fi

  return 0
}

# ============================================================
# check_rate_limit() — 시간 기반 rate limiting
# ============================================================
check_rate_limit() {
  local now elapsed
  now=$(date +%s)
  elapsed=$((now - hour_start))

  # 1시간 경과 시 카운터 리셋
  if [[ "$elapsed" -ge 3600 ]]; then
    invocations_this_hour=0
    hour_start=$now
  fi

  if [[ "$invocations_this_hour" -ge "$RATE_LIMIT_PER_HOUR" ]]; then
    local wait_sec=$((3600 - elapsed))
    log_warn "Rate limit reached ($RATE_LIMIT_PER_HOUR/hr). Waiting ${wait_sec}s..."
    sleep "$wait_sec"
    invocations_this_hour=0
    hour_start=$(date +%s)
  fi
}

# ============================================================
# execute_claude() — Claude CLI 실행
# ============================================================
execute_claude() {
  local prompt context output exit_code

  prompt=$(cat "$SCRIPT_DIR/.ralph/PROMPT.md")
  context="You are running inside Ralph Loop iteration $((iteration + 1)). Project: $PROJECT_NAME ($PROJECT_TYPE). Read fix_plan.md, AGENT.md, guardrails.md before starting."

  log_info "Iteration $((iteration + 1))/$MAX_ITERATIONS — Invoking Claude..."

  output=$(claude -p "$prompt" \
    --output-format json \
    --append-system-prompt "$context" \
    --allowedTools "$ALLOWED_TOOLS" \
    2>&1) || exit_code=$?

  invocations_this_hour=$((invocations_this_hour + 1))

  # EXIT_SIGNAL 감지
  if echo "$output" | grep -q "EXIT_SIGNAL: true"; then
    log_ok "EXIT_SIGNAL received. All tasks done."
    return 2
  fi

  # 에러 감지
  if [[ "${exit_code:-0}" -ne 0 ]]; then
    log_error "Claude exited with code ${exit_code:-unknown}"
    log_warn "Cooling down for ${ERROR_COOLDOWN_SEC}s..."
    sleep "$ERROR_COOLDOWN_SEC"
    return 1
  fi

  # 완료된 태스크 수 추출
  local completed_this_loop
  completed_this_loop=$(echo "$output" | grep -oP 'TASKS_COMPLETED_THIS_LOOP:\s*\K\d+' || echo "0")
  tasks_completed=$((tasks_completed + completed_this_loop))
  total_tasks_completed=$((total_tasks_completed + completed_this_loop))

  return 0
}

# ============================================================
# validate_post_iteration() — 반복 후 검증
# ============================================================
validate_post_iteration() {
  local violations=0

  # 최근 커밋 메시지 검증 (새 커밋이 있는 경우)
  local current_sha
  current_sha=$(git rev-parse HEAD 2>/dev/null || echo "none")

  if [[ "$current_sha" != "$last_sha" ]]; then
    local last_msg
    last_msg=$(git log -1 --format='%s')

    if ! echo "$last_msg" | grep -qP '^WI-(\d{3}-(feat|fix|docs|style|refactor|test|chore|perf|ci|revert)|(chore|docs))\s'; then
      log_warn "Invalid commit message: $last_msg"
      violations=$((violations + 1))
    fi
  fi

  # .ralph/ 파일 삭제 감지
  local deleted_ralph
  deleted_ralph=$(git diff --name-only --diff-filter=D HEAD~1 HEAD 2>/dev/null | grep '^\.ralph/' || true)
  if [[ -n "$deleted_ralph" ]]; then
    log_warn ".ralph/ files deleted: $deleted_ralph"
    violations=$((violations + 1))
  fi

  # 위반 시 guardrails.md에 기록
  if [[ "$violations" -gt 0 ]]; then
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "" >> "$SCRIPT_DIR/.ralph/guardrails.md"
    echo "### Violation at $timestamp (iteration $((iteration + 1)))" >> "$SCRIPT_DIR/.ralph/guardrails.md"
    [[ -n "${last_msg:-}" ]] && echo "- Invalid commit: $last_msg" >> "$SCRIPT_DIR/.ralph/guardrails.md"
    [[ -n "${deleted_ralph:-}" ]] && echo "- Deleted .ralph/ files: $deleted_ralph" >> "$SCRIPT_DIR/.ralph/guardrails.md"
  fi
}

# ============================================================
# main()
# ============================================================
main() {
  echo ""
  echo "============================================"
  echo "  Ralph Loop - $PROJECT_NAME ($PROJECT_TYPE)"
  echo "============================================"
  echo ""

  preflight

  last_sha=$(git rev-parse HEAD 2>/dev/null || echo "none")

  while [[ "$iteration" -lt "$MAX_ITERATIONS" ]]; do
    tasks_completed=0

    # 전체 완료 확인
    if check_all_done; then
      break
    fi

    # 무진행 감지
    if ! check_progress; then
      break
    fi

    # Rate limit 확인
    check_rate_limit

    # Claude 실행
    local claude_result=0
    execute_claude || claude_result=$?

    if [[ "$claude_result" -eq 2 ]]; then
      # EXIT_SIGNAL
      break
    fi

    # 반복 후 검증
    validate_post_iteration

    iteration=$((iteration + 1))

    # Cooldown
    if [[ "$iteration" -lt "$MAX_ITERATIONS" ]]; then
      log_info "Cooldown ${COOLDOWN_SEC}s..."
      sleep "$COOLDOWN_SEC"
    fi
  done

  # --- 종료 처리 ---
  echo ""
  echo "============================================"
  echo "  Ralph Loop Complete"
  echo "============================================"

  local elapsed=$(($(date +%s) - start_time))
  local minutes=$((elapsed / 60))
  local seconds=$((elapsed % 60))

  echo ""
  log_info "Total iterations: $iteration"
  log_info "Total tasks completed: $total_tasks_completed"
  log_info "Elapsed: ${minutes}m ${seconds}s"

  # 미머지 PR 확인
  local open_prs
  open_prs=$(gh pr list --state open --json number,title 2>/dev/null || echo "[]")
  if [[ "$open_prs" != "[]" ]]; then
    echo ""
    log_warn "Open PRs remaining:"
    echo "$open_prs" | python3 -c "
import sys, json
for pr in json.loads(sys.stdin.read()):
    print(f\"  #{pr['number']}: {pr['title']}\")
" 2>/dev/null || echo "$open_prs"
  fi

  echo ""
}

main "$@"
