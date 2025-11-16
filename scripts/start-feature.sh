#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <short-branch-name>
Example: $0 tls-options -> creates feature/tls-options"
  exit 1
fi

SHORT="$1"
BRANCH="feature/$SHORT"

echo "Starting new feature branch: $BRANCH"

# Ensure we're on main and up-to-date
git checkout main
git pull --ff-only origin main

git checkout -b "$BRANCH"
git push -u origin "$BRANCH"

echo "Branch created and pushed: $BRANCH"
echo "Open a PR with: gh pr create --fill -B main -H $BRANCH"

exit 0
