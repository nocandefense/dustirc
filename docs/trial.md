# Getting Started with Dust IRC

This guide walks through using the Dust IRC extension to connect to IRC servers, join channels, and participate in chat.

## Quick Start Trial

### Step 1: Connect to an IRC Server

1. Open VS Code with the Dust IRC extension installed
2. Open the Command Palette (`Cmd/Ctrl+Shift+P`)
3. Type `Dust: Connect` and press Enter
4. Fill in the connection details:
   - **Host**: `irc.libera.chat` (or another IRC server)
   - **Port**: `6697` (for TLS) or `6667` (for plaintext)
   - **Nickname**: Your desired IRC nickname (e.g., `dust_user`)
   - **Username**: Your username (can be same as nickname)

The extension will automatically:

- Detect TLS requirements for SSL ports (6697, 6670)
- Register with the server using NICK and USER commands
- Update the status bar to show `Dust: connected`

### Step 2: Join a Channel

1. Run `Dust: Join Channel` from Command Palette
2. Enter a channel name: `#general` or `#test`
   - The `#` prefix is automatically added if missing
3. Watch the status bar update to show `Dust: #channelname`
4. Open the IRC output to see join confirmation: `Dust: Open Output`

### Step 3: Send Messages

1. Run `Dust: Say...` from Command Palette
2. Type your message and press Enter
3. The message will be sent to your current active channel
4. You'll see the message appear in both:
   - The IRC Output channel (immediately)
   - The channel on the IRC server

### Step 4: Monitor Activity

1. Keep the IRC Output channel open: `Dust: Open Output`
2. You'll see:
   - Your own messages
   - Messages from other users
   - Join/part notifications
   - Server responses and notices

### Step 5: Channel Management

- **Join additional channels**: Use `Dust: Join Channel` repeatedly
- **Switch active channel**: Currently requires leaving and rejoining (UI improvements planned)
- **Leave channels**: Use `Dust: Leave Channel` - if multiple channels, you'll get a selection menu
- **Check connection**: Use `Dust: Ping` to see round-trip time

## Example IRC Servers for Testing

### Libera.Chat (recommended)

- **Host**: `irc.libera.chat`
- **Port**: `6697` (TLS) or `6667` (plaintext)
- **Channels**: `#general`, `#help`, `#test`

### OFTC

- **Host**: `irc.oftc.net`  
- **Port**: `6697` (TLS) or `6667` (plaintext)
- **Channels**: `#test`, `#help`

### Freenode (legacy)

- **Host**: `chat.freenode.net`
- **Port**: `6697` (TLS) or `6667` (plaintext)

## Configuration Options

Enable auto-reconnect in your VS Code settings:

```json
{
  "dustirc.autoReconnect": true
}
```

This will automatically attempt to reconnect if the connection drops.

## Troubleshooting

### Connection Issues

1. **"Connection failed"**: Check host/port, ensure IRC server is accessible
2. **"Certificate error"**: Try using port 6667 (plaintext) instead of 6697 (TLS)
3. **"Nickname in use"**: Try a different nickname or add numbers/underscores

### Messaging Issues

1. **"No target specified"**: Join a channel first with `Dust: Join Channel`
2. **"Not connected"**: Use `Dust: Connect` to establish connection first
3. **Messages not appearing**: Check `Dust: Open Output` for server responses

### Channel Issues

1. **"Channel key required"**: Some channels require passwords (not yet supported)
2. **"Cannot join channel"**: You may be banned or the channel may be invite-only
3. **Wrong current channel**: Use `Dust: Leave Channel` and `Dust: Join Channel` to switch

## File Logging

Two types of logs are maintained:

1. **IRC Output Channel**: Real-time view of all IRC activity in VS Code
2. **Workspace Log**: Outgoing messages saved to `.vscode/dust-outgoing.log`

The workspace log contains only your outgoing messages with timestamps for reference.

## Advanced Usage Tips

1. **Multiple Channels**: You can join multiple channels, but only one is "current" for sending messages
2. **Status Bar**: Click the status bar item showing your connection state for quick access
3. **Persistence**: Connection details are remembered for `Dust: Reconnect` command
4. **Network Issues**: Auto-reconnect helps with temporary disconnections
5. **Privacy**: No IRC credentials are permanently stored - you'll be prompted each time

## What to Verify

After following this guide, you should be able to:

- ✅ Connect to an IRC server with real network sockets
- ✅ Join and leave IRC channels
- ✅ Send and receive messages in channels
- ✅ See join/part notifications for other users
- ✅ Monitor connection health with ping
- ✅ View all activity in the IRC Output channel
- ✅ Reconnect automatically or manually when connection drops

## Feature Requests

### Status Command

TODO: Add a "Dust: Status" command that provides:

- Current connection state (connected/disconnected/connecting)
- Server and port information
- Current nickname
- List of joined channels
- Active/current channel for sending messages
- Relevant configuration settings overview:
  - Rate limiting settings (enabled/disabled, rate limit ms)
  - Auto-reconnect configuration (enabled, max attempts, delay)
  - TLS/SSL status
  - Connection timeout
  - Auto-join channels configuration

This would provide users with a comprehensive view of their IRC session state and configuration at a glance.

## Next Steps

Once you're comfortable with basic IRC usage:

1. Explore different IRC networks and channels
2. Configure auto-reconnect for persistent connections
3. Use the ping command to monitor connection quality
4. Check the workspace log file for message history
5. Try the `Dust: Status` command (when implemented) to view connection details
