#!/usr/bin/env bash
# Cleanup local branches that have been merged into main.
# Usage:
#   ./scripts/cleanup-merged-branches.sh        # deletes local merged branches (except main, develop)
#   ./scripts/cleanup-merged-branches.sh --remote  # also delete remotes for those branches

set -euo pipefail
DELETE_REMOTE=false
if [ "${1:-}" = "--remote" ]; then DELETE_REMOTE=true; fi

echo "Fetching latest refs from origin..."
git fetch origin --prune

current=$(git rev-parse --abbrev-ref HEAD)
if [ "$current" != "main" ]; then
  echo "Switching to main to compute merged branches..."
  git checkout main
  git pull --ff-only origin main
fi

echo "Finding local branches merged into main..."
merged=$(git branch --merged main | grep -vE "(^\*|main|develop|gh-pages)" | sed 's/^..//')
if [ -z "$(echo "$merged" | tr -d '[:space:]')" ]; then
  echo "No merged local branches to delete."
  exit 0
fi

echo "Merged branches:"; echo "$merged"
read -p "Delete these local branches? [y/N] " ans
if [ "$ans" != "y" ]; then echo "Aborting."; exit 0; fi

echo "$merged" | while read -r branch; do
  if [ -n "$branch" ]; then
    echo "Deleting local branch: $branch"
    git branch -D "$branch" || true
    if [ "$DELETE_REMOTE" = true ]; then
      echo "Deleting remote branch origin/$branch"
      git push origin --delete "$branch" || true
    fi
  fi
done

echo "Done."
