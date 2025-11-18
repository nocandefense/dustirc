# Development Workflow

This project follows **Git Flow** principles for clean branch management and code organization.

## Branch Strategy

### Main Branches

- `main` - Production-ready code, always deployable
- `develop` - Integration branch for features (if needed for complex releases)

### Supporting Branches

- `feature/*` - New features and enhancements
- `chore/*` - Maintenance tasks (tests, CI, docs, refactoring, dependencies)
- `bugfix/*` - Bug fixes for current release
- `hotfix/*` - Urgent fixes for production issues

## Branch Naming Convention

```bash
feature/room-switching-ui
feature/nickserv-authentication
chore/test-coverage-improvements
chore/update-dependencies
chore/ci-improvements
bugfix/connection-memory-leak
bugfix/message-routing-error
hotfix/security-patch
```

## Workflow Rules

### ✅ DO

- **One concern per branch** - Keep features, chores, and fixes separate
- **Branch from main** - Always start from latest main branch
- **Small, focused PRs** - Easier to review and less risky to merge
- **Descriptive commit messages** - Follow conventional commits format
- **Clean up branches** - Delete merged branches promptly

### ❌ DON'T

- **Mix concerns** - Don't combine features with test improvements
- **Long-lived branches** - Keep PRs small and merge frequently
- **Work directly on main** - Always use feature branches
- **Force push shared branches** - Only force push your own feature branches

## Example Workflow

```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/my-new-feature

# Work on feature
git add .
git commit -m "feat: add new feature implementation"
git push -u origin feature/my-new-feature

# Create PR when ready
# After review and merge, clean up
git checkout main
git pull origin main
git branch -d feature/my-new-feature
```

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add room switching functionality
fix: resolve connection timeout issue
chore: update test coverage
docs: add API documentation
test: add integration tests for IRC parser
```

## Code Review Guidelines

- **Single responsibility** - Each PR should have one clear purpose
- **Test coverage** - All features should include appropriate tests
- **Documentation** - Update docs for user-facing changes
- **Breaking changes** - Clearly document any breaking changes
