#!/usr/bin/env bash
# Prepare a GitHub branch protection rule for `main` using the GitHub CLI (`gh`).
# This script only prints the `gh api` command and will not run it automatically.
# Usage:
#   bash scripts/apply-branch-protection.sh <owner> <repo>
# Example:
#   bash scripts/apply-branch-protection.sh nocandefense dustirc

set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "This script requires the GitHub CLI 'gh' to be installed and authenticated."
  echo "Install: https://cli.github.com/"
  exit 1
fi

APPLY=0
if [ "$1" = "--apply" ]; then
  APPLY=1
  shift
fi

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 [--apply] <owner> <repo>"
  echo "  --apply   Actually apply the branch protection using 'gh api' (requires gh auth and admin scope)."
  exit 1
fi

OWNER="$1"
REPO="$2"

read -r -d '' PAYLOAD <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["build-and-test", "lint"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null
}
JSON

echo "Prepared branch protection payload for ${OWNER}/${REPO} on branch 'main'."
echo
echo "Payload:"
echo "$PAYLOAD"
echo
echo "Notes:"
echo "- This operation requires the caller to have admin:org or admin:repo scope for the repository."
echo "- The contexts in 'required_status_checks.contexts' must match the job names in your CI workflow. Update them if needed."

if [ "$APPLY" -eq 0 ]; then
  echo
  echo "Dry-run mode (no changes made). To apply run with --apply:"
  echo "  bash $0 --apply ${OWNER} ${REPO}"
  exit 0
fi

echo
echo "Applying branch protection to ${OWNER}/${REPO}/branches/main..."

TMPFILE=$(mktemp /tmp/branch-protection-XXXX.json)
trap 'rm -f "$TMPFILE"' EXIT
printf "%s" "$PAYLOAD" > "$TMPFILE"

echo "Running: gh api --method PUT -H 'Accept: application/vnd.github.v3+json' /repos/${OWNER}/${REPO}/branches/main/protection --input ${TMPFILE}"
if gh api --method PUT -H 'Accept: application/vnd.github.v3+json' /repos/${OWNER}/${REPO}/branches/main/protection --input "$TMPFILE"; then
  echo "Branch protection applied successfully."
  exit 0
else
  echo "Failed to apply branch protection." >&2
  exit 2
fi
