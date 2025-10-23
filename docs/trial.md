# Trialing the new commands (ping, reconnect) and outgoing logging

This page explains how to try the small features added in the recent update: the
`dustirc.ping` and `dustirc.reconnect` commands, and the outgoing-message logging
that writes to `.vscode/dust-outgoing.log`.

## Steps to try locally

1. Open this repository in VS Code and switch to the `main` branch (it should already be the active branch).
2. Run the extension in the Extension Development Host (F5 in VS Code). This opens a new window that loads the extension.
3. In the Extension Development Host window, open the Command Palette (Cmd+Shift+P) and run `DustIRC: Connect` (contributed command id `dustirc.connect`). Provide the IRC server details as prompted.
4. Once connected, try the Ping command:
   - Open Command Palette and run `DustIRC: Ping` (`dustirc.ping`).
   - The command returns a simulated RTT in milliseconds; you should see a notification with the result.
5. To test reconnecting:
   - Use Command Palette and run `DustIRC: Reconnect` (`dustirc.reconnect`).
   - This will attempt to reconnect the active connection according to the connection's retry logic.
6. To test outgoing message logging:
   - Use the `DustIRC: Say` command (or however you normally send a message through the extension). The extension will append a timestamped entry to `.vscode/dust-outgoing.log` in the workspace root.
   - Open the file `.vscode/dust-outgoing.log` in the workspace to verify the entry was written.

## Configuration

- `dustirc.autoReconnect` (boolean): when enabled, the extension will automatically call reconnect when the connection is lost. Toggle it in the Extension Settings UI or by adding the setting to your workspace `settings.json`:

```json
{
   "dustirc.autoReconnect": true
}
```


## Notes and troubleshooting

- The outgoing log write is best-effort. If VS Code or the environment prevents writing into `.vscode/`, the extension will silently ignore write errors.
- These features are not published to the VS Code Marketplace as a new release yet — they are available on the `main` branch for testing.
- If you see TypeScript/ESM runtime errors in the Extension Development Host, ensure your development environment is using Node 18+ and that the extension was rebuilt after recent changes.

## What to verify

- You can verify correctness by seeing: the ping response notification, reconnect attempts completing without errors, and new entries in `.vscode/dust-outgoing.log` after sending messages.

If you'd like, I can also add a short integration test or a small sample workspace with a simulated connection to make trialing even easier.
