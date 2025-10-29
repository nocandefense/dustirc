# Releasing dustirc

This document explains the supported release workflows: a curated GitHub Release flow (recommended) and a quick tag-push flow. The repository uses a guarded publish action that only publishes a VSIX when guard checks pass.

## Guard checklist (what must be true for publishing)

- The PR that introduced the release commit must have the `release:publish` label.
- The tag must start with `v` (for example `v1.2.0`).
- The release must not be marked as a prerelease.
- The repository must have the secret `VSCE_TOKEN` configured.

## Recommended: GitHub Release (curated / manual)

1. Merge your PR into `main`.
1. Update `CHANGELOG.md` by moving entries from `[Unreleased]` to a new `## [vX.Y.Z] - YYYY-MM-DD` heading, and add release notes.
1. Create a new Release on GitHub:

```bash
# Using GitHub CLI (recommended for convenience)
gh release create v1.2.0 --notes-file CHANGELOG.md
```

1. The repository's `publish` workflow will run on `release.published`. The workflow checks the guard conditions and will publish the VSIX if they pass.

## Quick: Tag push (fast flow)

1. Ensure the PR that introduced the release commit has the `release:publish` label.
1. Create an annotated tag locally and push it:

```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

1. The repository's `publish` workflow also triggers on pushed tags matching `v*`. It will perform the same guard checks and publish if allowed.

## Verification and post-release

- After publishing, confirm the release appears in the Marketplace or check the GitHub Actions run artifacts (the VSIX is uploaded as an artifact).
- Optionally, create a GitHub release notes page with additional detail.

## Troubleshooting

- If the publish workflow skipped publishing, check the workflow run logs for which guard failed (missing label, missing `VSCE_TOKEN`, prerelease tag, etc.).
- If you need to re-run publishing, fix the issue (e.g., add the label) and re-trigger by re-publishing the release or re-pushing the tag (or create a new tag).

---

If you'd like, I can also add a short `PUBLISHING.md` with screenshot examples or automate the `gh release create` step in a small helper script.
