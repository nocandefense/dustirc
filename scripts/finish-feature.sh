#!/usr/bin/env bash
set -euo pipefail

# Usage: finish-feature.sh [branch]
# If no branch is provided, uses the current branch.

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "Refusing to finish the main branch. Use a feature branch name."
  exit 1
fi

echo "Finishing branch: $BRANCH"

if command -v gh >/dev/null 2>&1; then
  # Check if there's a PR and whether it's merged
  if gh pr view "$BRANCH" --json merged --jq '.merged' >/dev/null 2>&1; then
    MERGED=$(gh pr view "$BRANCH" --json merged --jq '.merged')
  else
    MERGED=false
  fi

  if [ "$MERGED" = "true" ]; then
    echo "PR for $BRANCH is already merged. Cleaning up..."
  else
    echo "PR for $BRANCH is not merged. Attempting to merge via gh..."
    gh pr merge "$BRANCH" --merge || {
      echo "Automatic merge failed. Please merge the PR on GitHub and re-run this script.";
      exit 1;
    }
  fi

  # Ensure main is up-to-date, then delete remote and local branches
  git checkout main
  git pull --ff-only origin main

  echo "Deleting remote branch origin/$BRANCH"
  git push origin --delete "$BRANCH" || echo "Remote deletion may have failed or branch was already removed"

  echo "Deleting local branch $BRANCH"
  git branch -D "$BRANCH" || echo "Local branch deletion failed or branch doesn't exist"

  echo "Done. Now on main and cleaned up."
  exit 0
else
  echo "gh CLI not found. Please merge the PR on GitHub, then run the following commands to cleanup:";
  echo "  git checkout main";
  echo "  git pull origin main";
  echo "  git push origin --delete $BRANCH";
  echo "  git branch -D $BRANCH";
  exit 1
fi
