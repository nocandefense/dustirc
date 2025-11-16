# Change Log

All notable changes to the "dustirc" extension will be documented in this file.

This project follows the "Keep a Changelog" format and uses semantic versioning. For guidance, see: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### Added

- **Real IRC Network Connectivity**: Connect to actual IRC servers with TCP/TLS support
- **Channel Management**: Join (`dustirc.join`) and leave (`dustirc.part`) IRC channels
- **Automatic Server Registration**: Automatically send NICK/USER commands on connect
- **Channel State Tracking**: Track joined channels and current active channel
- **Smart Message Targeting**: Send messages to current active channel instead of hardcoded target
- **Status Bar Integration**: Shows current channel or connection state
- **TLS Auto-detection**: Automatically use TLS for common SSL ports (6697, 6670)
- **Enhanced Connection**: Connect command now prompts for username and detects TLS requirements
- **Multi-channel Support**: Join multiple channels with intelligent current channel management
- Ping and reconnect commands (`dustirc.ping`, `dustirc.reconnect`)
- Log outgoing messages to `.vscode/dust-outgoing.log` when using `dustirc.say`
- Added `dustirc.autoReconnect` setting to auto-reconnect on disconnect
- IRC core: TypeScript types, robust line parser, and event-emitting `IrcConnection` with send queue/pump and typed events (`privmsg`, `notice`, `join`, `part`, `numeric`, and legacy `message`)

### Changed

- **Breaking**: `sendMessage()` now requires a target channel or uses current active channel
- Status bar now displays current channel name when joined to channels
- Connection process now includes username prompt and automatic registration
- Message events now include target information for better message routing

### Fixed

- Messages are now sent to the correct target channel instead of hardcoded `#local`
- Connection state properly tracked for JOIN/PART events
- Test suite updated to reflect new message targeting behavior

### Technical Improvements

- Comprehensive unit tests and documentation (See PR #12)
- Real network socket support with connection lifecycle management  
- Channel state management with current channel tracking
- Enhanced event system with proper IRC message parsing

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
