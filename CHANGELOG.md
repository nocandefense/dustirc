# Change Log

All notable changes to the "dustirc" extension will be documented in this file.

This project follows the "Keep a Changelog" format and uses semantic versioning. For guidance, see: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### Added

- **Webview Chat Interface**: Modern chat UI with channel tabs, message history, and input field
- **Rate Limiting**: Dual-layer protection (webview cooldown + backend burst limiting) to prevent IRC bans
- **PING/PONG Keepalive**: Automatic response to server PINGs prevents connection timeouts
- **Real IRC Network Connectivity**: Connect to actual IRC servers with TCP/TLS support
- **Channel Management**: Join (`dustirc.join`) and leave (`dustirc.part`) IRC channels
- **Automatic Server Registration**: Automatically send NICK/USER commands on connect
- **Channel State Tracking**: Track joined channels and current active channel
- **Smart Message Targeting**: Send messages to current active channel instead of hardcoded target
- **Status Bar Integration**: Shows current channel or connection state
- **TLS Auto-detection**: Automatically use TLS for common SSL ports (6697, 6670)
- **Enhanced Connection**: Connect command now prompts for username and detects TLS requirements
- **Multi-channel Support**: Join multiple channels with intelligent current channel management
- **Ping and reconnect commands** (`dustirc.ping`, `dustirc.reconnect`)
- **Message logging** to `.vscode/dust-outgoing.log` when using `dustirc.say`
- **IRC Rooms Tree View**: Browse and navigate joined channels in the Explorer sidebar
- IRC core: TypeScript types, robust line parser, and event-emitting `IrcConnection` with send queue/pump and typed events (`privmsg`, `notice`, `join`, `part`, `numeric`, and legacy `message`)

### Changed

- **Breaking**: `sendMessage()` now requires a target channel or uses current active channel
- Status bar now displays current channel name when joined to channels
- Connection process now includes username prompt and automatic registration
- Message events now include target information for better message routing
- Webview is now the primary UI (can be disabled via `dustirc.ui.useWebview` setting)

### Fixed

- **Connection stability**: Server PINGs are now answered with PONG, preventing timeout disconnects
- Messages are now sent to the correct target channel instead of hardcoded `#local`
- Connection state properly tracked for JOIN/PART events
- **Rate limiting**: Messages are throttled to prevent server bans (5 msg/2sec burst, 200ms sustained)
- **Memory leaks**: IRC event listeners are now properly cleaned up on panel disposal
- **Type safety**: Removed `any` types, added proper interfaces for webview communication

### Technical Improvements

- Comprehensive unit tests (83 tests) including rate limiting validation
- Real network socket support with connection lifecycle management  
- Channel state management with current channel tracking
- Enhanced event system with proper IRC message parsing
- Removed debug logging from production code (reduced bundle size by 2.3 KiB)

- Fixed issue #.

## [1.0.0] - 2025-10-20

- Initial release

---

## Maintaining this changelog

- Add new changes under the [Unreleased] section during development.
- When cutting a release, move entries from [Unreleased] to a new version heading with the release date.
- Use concise bullets and reference issues or PRs when applicable.
