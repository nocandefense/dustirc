# Contributing

Thanks for wanting to contribute! A few pointers to get you started.

## Development setup

1. Clone the repo
2. Install dependencies and prepare git hooks

```bash
npm ci
npm run prepare
```

## Commit style & linting

- Husky and lint-staged will run ESLint auto-fixes on staged files.
- Run the full lint and tests locally before opening a PR:

```bash
npm run lint:md
npm run lint
npm test
```

## Pull requests

- Open small, focused PRs and reference any related issues.
- CI runs build, lint, and tests on PRs. Ensure these pass before requesting review.

## Branching and workflow

We follow a lightweight trunk-based / GitHub Flow workflow:

- Keep `main` always releasable and protected by branch rules (require PRs and passing CI).
- Work in short-lived branches with descriptive names:
  - `feature/<short-description>` for features
    - `fix/<short-description>` for bugfixes
    - `chore/<short-description>` for housekeeping
    - `docs/<short-description>` for documentation
- Keep branches small and focused; rebase or merge from `main` frequently to avoid large conflicts.

## PR checklist

Before creating a PR, ensure:

- Tests and linters pass locally (`npm run lint && npm test`).
- The PR is small and targets `main`.
- The PR description explains the change and any testing performed.
- You updated `CHANGELOG.md` under the `[Unreleased]` section with a short bullet describing the change.
- If this PR should be published as part of a release when merged, add the label `release:publish` to the PR.

Maintainers will:

- Review the PR and merge once CI passes and at least one approval is given (if enabled).
- Use a merge commit or squash strategy as appropriate for the change.

## Releases and publishing

Publishing the extension to the Marketplace is a guarded process:

- The repository has an automated publish workflow that runs when a release is published or when a `v*` tag is pushed.
- The publish workflow will only actually publish if:
  - The PR that contains the release/tag commit has the label `release:publish`, and
  - The tag starts with `v` (for example `v1.2.0`), and
  - The release is not marked as a prerelease, and
  - The `VSCE_TOKEN` secret is configured in the repository.

Releasing using the GitHub UI (recommended for curated release notes):

1. Merge your PR to `main`.
2. Create a new Release on GitHub (Draft or Publish) and set the tag to `vX.Y.Z` and write release notes (or copy notes from `CHANGELOG.md`).

Releasing using a tag push (quick flow):

1. Ensure the PR that introduced the release commit has the `release:publish` label.
2. Create an annotated tag and push it:

```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

The publish workflow will run and will publish only if guards pass.

## Changelog

Maintain `CHANGELOG.md` in Keep a Changelog format. During development add short bullets to the `[Unreleased]` section. When releasing, move items into a new version heading and add the release date.

## Branch protection

We recommend protecting `main` with these rules (set in repository settings):

- Require pull requests before merging.
- Require status checks to pass (CI job).
- Optionally require at least one approving review for non-trivial changes.

For more developer-focused details (CI, tests, coverage, releases) see `docs/development.md`.

## Git hooks

- The repository includes a Husky pre-commit hook at `.husky/pre-commit` that runs `lint-staged`.
- After running `npm ci`, run `npm run prepare` to install the hooks locally. The hook file in the repo is executable so Git will run it on commits.

### Branch naming & helper scripts

We enforce a branch-per-piece workflow and provide small helper scripts to get started and finish a branch:

- Start a feature branch locally and push it to origin:

```bash
# create and push feature/my-change and checkout
npm run branch:start my-change
```

- Finish a feature branch (attempt to merge the PR using `gh` if available, delete remote and local branch, and return to `main`):

```bash
npm run branch:finish
```

The CI enforces that PR source branches follow the allowed prefixes (for example `feature/`, `fix/`, `chore/`, `hotfix/`, `docs/`, `release/`, or `dependabot/`). Use the helper scripts to stay consistent.

## Built artifacts

Please avoid committing built or compiled artifacts (for example, `*.js`/`*.js.map` generated from TypeScript). Tests and CI run from the TypeScript sources. If you need to run tests locally, use the TypeScript sources and the project's scripts:

```bash
npm ci
npm run build # if you need to rebuild TypeScript outputs locally
npm test
```

If you accidentally commit built files, remove them and add appropriate `.gitignore` entries in your branch (a maintainer can help if needed).
