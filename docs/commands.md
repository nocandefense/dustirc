# Extension commands and settings

New commands added to the extension:

- `dustirc.ping` — sends a ping to the connected server and displays the RTT.
- `dustirc.reconnect` — attempts to reconnect using the last used connection info.
- Outgoing messages typed via `dustirc.say` are logged to `.vscode/dust-outgoing.log` in the workspace.

Configuration:

- `dustirc.autoReconnect` (boolean) — if enabled, the extension will attempt to reconnect automatically when the connection is lost.
