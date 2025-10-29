# Change Log

All notable changes to the "dustirc" extension will be documented in this file.

This project follows the "Keep a Changelog" format and uses semantic versioning. For guidance, see: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

- Added ping and reconnect commands (`dustirc.ping`, `dustirc.reconnect`).
- Log outgoing messages to `.vscode/dust-outgoing.log` when using `dustirc.say`.
- Added `dustirc.autoReconnect` setting to auto-reconnect on disconnect.
- Added an IRC core: TypeScript types, a robust line parser, and an event-emitting `IrcConnection` with a send queue/pump and typed events (`privmsg`, `notice`, `join`, `part`, `numeric`, and legacy `message`). Includes unit tests and documentation. (See PR #12)

## [1.1.0] - 2025-10-20

- Added features X, Y, and Z.

## [1.0.1] - 2025-10-20

- Fixed issue #.

## [1.0.0] - 2025-10-20

- Initial release

---

## Maintaining this changelog

- Add new changes under the [Unreleased] section during development.
- When cutting a release, move entries from [Unreleased] to a new version heading with the release date.
- Use concise bullets and reference issues or PRs when applicable.
