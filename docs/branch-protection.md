# Branch protection checklist

This document lists recommended repository settings and a brief how-to for enabling branch protection on GitHub for the `main` branch. Enforcing these rules prevents accidental direct pushes and helps protect release and CI integrity.

Recommended rules for `main` (minimum):

- Require pull requests before merging
  - Require at least 1 (or 2) reviewers depending on the project's needs
- Require status checks to pass before merging
  - Enable the CI job(s) that must succeed (unit tests, lint, build)
  - Optionally require coverage or other quality gates
- Require branches to be up to date before merging
  - Prevents merging commit that would break CI after merge
- Require linear history (no merge commits) — optional
- Require signed commits — optional, for stricter policies
- Include CODEOWNERS if you want automatic reviewer assignment
- Restrict who can push to matching branches (optional)

How to enable via GitHub web UI:

1. Go to your repository on GitHub.
2. Click "Settings" → "Branches" → "Branch protection rules" → "Add rule".
3. In "Branch name pattern" enter `main`.
4. Toggle on "Require pull request reviews before merging" and set required reviewers.
5. Toggle on "Require status checks to pass before merging" and select the CI checks you want to require.
6. Toggle on "Require branches to be up to date before merging" if you want the branch to be rebased or merged with main before merge.
7. Optionally toggle on other settings (signed commits, linear history, restrict who can push).
8. Save changes.

Using `gh` (GitHub CLI) to create a branch protection rule (example):

```bash
gh api --method PUT \
  -H "Accept: application/vnd.github.v3+json" \
  /repos/:owner/:repo/branches/main/protection \
  -f required_status_checks='{"strict":true, "contexts": ["build-and-test", "lint"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count": 1}'
```

Notes and best practices
- Combine server-side branch protection rules with client-side hooks (we added a Husky pre-push hook) so that accidental direct pushes are blocked both locally and on GitHub.
- Keep CI job names stable; if you rename a job you'll need to update the required status checks in the protection rule.
- For open-source/public repositories, consider requiring at least 2 reviewers for changes that alter behavior or security-sensitive code.

If you want, I can attempt to apply a branch protection rule via the GitHub API (using `gh api` or direct API calls) — but that requires a token with admin:repo scope and will run from your environment (I don't have repository admin rights). I can prepare a script/PR for maintainers to apply if you prefer.
