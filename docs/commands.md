# Extension commands and settings

## Available Commands

All commands are available through the VS Code Command Palette (`Cmd/Ctrl+Shift+P`):

### Connection Management

- **`dustirc.connect`** - Connect to an IRC server
  - Prompts for: host, port, nickname, username
  - Automatically detects TLS for common SSL ports (6697, 6670)
  - Handles server registration (PASS, NICK, USER) automatically
  - Example: Connect to `irc.libera.chat:6697` with TLS

### Channel Management

- **`dustirc.join`** - Join an IRC channel
  - Prompts for channel name (e.g., `#general`, `programming`)
  - Automatically adds `#` prefix if not provided
  - Joined channel becomes the "current channel" for sending messages
  - Status bar updates to show current channel

- **`dustirc.part`** - Leave an IRC channel
  - If only one channel joined: leaves that channel automatically
  - If multiple channels joined: shows selection menu
  - Updates current channel to remaining joined channel (if any)
  - Status bar updates accordingly

### Messaging

- **`dustirc.say`** - Send a message to the current channel
  - Requires being joined to at least one channel
  - Messages are sent to the current active channel
  - Messages are logged to `.vscode/dust-outgoing.log` in workspace
  - Displays in the IRC Output channel immediately

### Utility Commands

- **`dustirc.ping`** - Send a ping to the connected server and display RTT
  - Shows round-trip time in milliseconds
  - Useful for checking connection health

- **`dustirc.reconnect`** - Attempt to reconnect using stored connection info
  - Uses the last successful connection parameters
  - Helpful when connection is dropped

- **`dustirc.openOutput`** - Open the IRC Output channel
  - Shows all IRC activity (joins, parts, messages, notices, server responses)
  - Useful for monitoring IRC events and debugging

### Legacy Commands

- **`dustirc.helloWorld`** - Display a test message (development/demo command)

## Message Flow Example

1. **Connect**: `Dust: Connect` → Enter server details
2. **Join**: `Dust: Join Channel` → Enter `#general`
3. **Chat**: `Dust: Say...` → Type your message
4. **Monitor**: `Dust: Open Output` → View all IRC activity
5. **Leave**: `Dust: Leave Channel` → Select channel to leave

## Configuration Settings

- **`dustirc.autoReconnect`** (boolean, default: `false`)
  - When enabled, automatically attempts to reconnect when connection is lost
  - Uses exponential backoff for retry attempts
  - Can be toggled in VS Code Settings or `settings.json`:

    ```json
    {
      "dustirc.autoReconnect": true
    }
    ```

## Status Bar Integration

The status bar (bottom of VS Code) shows your current IRC state:

- **`Dust: disconnected`** - Not connected to any IRC server
- **`Dust: connected`** - Connected to server but not joined to any channels
- **`Dust: #channelname`** - Connected and currently active in the specified channel

Click the status bar item to quickly access IRC commands.

## Message Logging

### Output Channel

All IRC activity is logged to the "Dust IRC" output channel:

- Server responses and errors
- Join/part notifications  
- Incoming messages (PRIVMSG, NOTICE)
- Connection events

### Workspace Logging

Outgoing messages sent via `dustirc.say` are logged to:

```text
.vscode/dust-outgoing.log
```

This file is created in your workspace root and contains timestamped outgoing messages for reference.
