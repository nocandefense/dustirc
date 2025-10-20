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

## Git hooks

- The repository includes a Husky pre-commit hook at `.husky/pre-commit` that runs `lint-staged`.
- After running `npm ci`, run `npm run prepare` to install the hooks locally. The hook file in the repo is executable so Git will run it on commits.
