# Development: tests, CI, coverage, and releases

This document collects the developer-facing details for working on this repository: branch and PR discipline, how to run tests locally, what CI runs, how coverage is generated and uploaded, and how publishing works.

## Quick links

- CI workflow: `.github/workflows/ci.yml`
- Publish workflow: `.github/workflows/publish.yml`
- Release guide: `docs/release.md`
- Changelog: `CHANGELOG.md`

## Branch & PR discipline (summary)

- Follow the trunk-based / GitHub Flow model: create short-lived branches and open PRs to `main`.
- Branch name examples: `feat/<what>`, `fix/<what>`, `docs/<what>`.
- Keep PRs small and single-purpose.
- Update `CHANGELOG.md` under `[Unreleased]` with a short bullet for your change.
- If a PR should trigger publishing when released, add the label `release:publish` to the PR.

## Running tests locally

There are two test workflows in this repo:

- Unit tests: fast, run with Mocha and `ts-node`.
- Full integration tests: run with the VS Code test harness (slower) — invoked via `npm test`.

Common commands:

```bash
# compile TypeScript sources (webpack) and tests
npm run compile
npm run compile-tests

# run unit tests (fast)
npm run test:unit

# run coverage (generates coverage/lcov.info)
npm run test:coverage

# run the full extension test suite (integration, slow)
npm test

# linting
npm run lint
npm run lint:md
```

Notes:

- `npm run test:unit` runs Mocha using the TDD interface (`suite`/`test`).
- `npm run test:coverage` runs unit tests under `nyc` and produces `coverage/lcov.info`.
- If `npm ci` fails complaining about package-lock mismatches, run `npm install` locally to update the lockfile and commit it.

## CI behavior

CI is defined in `.github/workflows/ci.yml` and currently runs two separate jobs:

- `unit-tests` — quick job that runs on pushes and PRs, installs deps, runs `npm run test:coverage`, and uploads `coverage/lcov.info` as an artifact and to Codecov (if configured).
- `build-and-test` — the main job that runs compile, lint, and the VS Code integration tests.

This split provides fast feedback from unit tests while still exercising the full build/test matrix.

## Coverage and Codecov

- Unit tests produce coverage via `nyc` and write `coverage/lcov.info`.
- CI uploads the `lcov` file as an artifact and then uses `codecov/codecov-action@v4` to upload to Codecov.
- To enable uploads using a token, add `CODECOV_TOKEN` to repository secrets. If using the Codecov GitHub App, a token is not required.
- A Codecov badge has been added to the README; once Codecov receives reports it will show the coverage percentage.

If you want PR coverage comments or coverage gating (require a minimum coverage), we can add the Codecov action configuration or a PR bot to fail PRs under a threshold.

## Publish / Release process

See `docs/release.md` for full step-by-step instructions. Short summary:

- The repo has a guarded publish workflow (`.github/workflows/publish.yml`) that publishes a VSIX when a GitHub Release is published or a `v*` tag is pushed.
- The publish workflow only publishes if these guards pass:
  - The PR containing the release/tag commit has the label `release:publish`.
  - The tag starts with `v` (for example `v1.2.0`).
  - The release is not marked as a prerelease.
  - The secret `VSCE_TOKEN` is configured in repository secrets.

Publishing options:

- Manual, curated: create a Release on GitHub and publish it (recommended for release notes).
- Quick: push an annotated tag `git tag -a v1.2.0 -m "Release v1.2.0"` and `git push origin v1.2.0` (the workflow will run and publish if guards pass).

## Branch protection (recommended)

We recommend protecting `main` with these settings in the GitHub repository settings:

- Require pull requests before merging.
- Require status checks to pass — at a minimum require the `unit-tests` job (fast) and the `build-and-test` job.
- Optionally require at least one approving review for changes.

If you want, I can prepare a PR describing the recommended settings you can apply manually or using GitHub's API.

## Troubleshooting

- `npm ci` errors: usually indicate `package.json` and `package-lock.json` are out of sync — run `npm install` to update the lockfile locally and commit it.
- Tests failing in CI but passing locally: ensure you run `npm run compile-tests` and `npm run compile` locally to match CI steps.
- Publish skipped: check the publish workflow run logs for which guard failed (PR label, token, tag format, prerelease flag).

## Where to look for artifacts

- CI run pages (GitHub Actions) — each workflow run contains logs and uploaded artifacts (e.g., `coverage-lcov`).
- Codecov UI (if configured) — shows coverage and PR diffs.

---

If you want this condensed into a one-page developer cheat-sheet or to include GitHub CLI helper scripts (`scripts/release.sh`) I can add them.
