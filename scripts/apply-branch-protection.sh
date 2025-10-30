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

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <owner> <repo>"
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
echo "The command to apply this via 'gh' is (will not run automatically):"
echo
echo "gh api --method PUT -H 'Accept: application/vnd.github.v3+json' /repos/${OWNER}/${REPO}/branches/main/protection -f required_status_checks='${PAYLOAD}'"
echo
echo "Notes:"
echo "- This command requires the caller to have admin:org or admin:repo scope for the repository."
echo "- The contexts in 'required_status_checks.contexts' must match the job names in your CI workflow. Update them if needed."
echo "- If you want me to apply this for you, run the command locally (I will not run it from here)."
