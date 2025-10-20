# [![CI](https://github.com/nocandefense/dustirc/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nocandefense/dustirc/actions/workflows/ci.yml)

Dust is an IRC client for Visual Studio Code.

## Features

- Basic command to connect to an IRC server (scaffold)
- Status bar indicating connection state

## Development setup

After cloning, install dependencies and prepare Husky hooks:

```bash
npm ci
npm run prepare
```

This will install dev hooks (Husky) so that staged files are auto-fixed by `lint-staged` on commit.

## Run & test

Run the extension's test suite and build locally:

```bash
npm run compile
npm test
```

To run the extension in the VS Code debugger, open this folder in VS Code and use the "Run Extension" launch configuration.

## Publishing

To publish the extension to the VS Code Marketplace you'll typically:

1. Bump the version in `package.json`.
2. Build the extension with `npm run compile`.
3. Create a VSIX and publish with `vsce` or the `@vscode/vsce` CLI.

Example (local):

```bash
npm run compile
npx vsce package
# then publish using vsce or through the Marketplace web UI
```

## Contributing

See `CONTRIBUTING.md` for development setup and contribution guidelines. In short:

- Run `npm ci` then `npm run prepare` to enable Husky git hooks locally.
- The repo includes a pre-commit hook that runs `lint-staged` to auto-fix staged files.

## Running tests

Run the test suite locally with:

```bash
npm test
```

## Known Issues

There are no known issues at this time. If you find a bug, please open an issue on the repository.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
- Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
- Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
