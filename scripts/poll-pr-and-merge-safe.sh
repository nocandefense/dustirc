#!/usr/bin/env bash
# Safe PR poll-and-merge script
# Usage: POLL_PR=9 GITHUB_PAT=... ./scripts/poll-pr-and-merge-safe.sh
set -u
PR=${POLL_PR:-}
if [ -z "$PR" ]; then echo "POLL_PR environment variable required (PR number)"; exit 0; fi
if [ -z "${GITHUB_PAT:-}" ]; then echo "GITHUB_PAT not set; export it before running"; exit 0; fi
HEAD_SHA=${HEAD_SHA:-}
echo "Safe polling PR #$PR for checks (will not exit non-zero on failures)..."
for i in {1..36}; do
  echo "[attempt $i] $(date +%T)"
  resp=$(curl -s -H "Authorization: token $GITHUB_PAT" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/nocandefense/dustirc/pulls/$PR") || true
  echo "PR state: " $(echo "$resp" | jq -r '.state, .mergeable_state' 2>/dev/null)
  # get head sha
  head_sha=$(echo "$resp" | jq -r '.head.sha' 2>/dev/null)
  if [ -z "$head_sha" ] || [ "$head_sha" = "null" ]; then echo "Could not read head sha yet"; sleep 5; continue; fi
  echo "Head sha: $head_sha"
  check_resp=$(curl -s -H "Authorization: token $GITHUB_PAT" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/nocandefense/dustirc/commits/$head_sha/check-runs") || true
  echo "$check_resp" | jq -r '.check_runs[] | "- \(.name): status=\(.status) conclusion=\(.conclusion)"' || true
  inprog=$(echo "$check_resp" | jq -r '.check_runs[] | select(.status=="in_progress" or .status=="queued") | .name' | wc -l 2>/dev/null || true)
  if [ "$inprog" -eq 0 ]; then
    bad=$(echo "$check_resp" | jq -r '.check_runs[] | select(.conclusion != "success") | "\(.name):\(.conclusion)"') || true
    if [ -z "$bad" ]; then
      echo "All checks passed; attempting merge..."
      merge_resp=$(curl -s -X PUT -H "Authorization: token $GITHUB_PAT" -H "Accept: application/vnd.github+json" https://api.github.com/repos/nocandefense/dustirc/pulls/$PR/merge -d '{"commit_title":"chore: merge via safe script","merge_method":"merge"}') || true
      echo "Merge response: $merge_resp"
      echo "Done (safe script)."
      exit 0
    else
      echo "Checks finished but some failed: $bad"
      echo "Will not merge. Exiting safely."; exit 0
    fi
  fi
  sleep 5
done
echo "Timed out waiting for checks (3 minutes). Exiting safely."; exit 0
