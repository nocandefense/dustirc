# Network layer for IrcConnection

This document describes the new optional real network layer implemented in
`src/irc/connection.ts`.

## Overview

The project originally used a simulated in-memory connection for tests and
simple demos. The new implementation adds an opt-in real TCP/TLS socket layer
while preserving the previous behavior by default to avoid breaking tests.

## How to use

The `connect` API signature was extended to accept an optional fourth argument
of type `ConnectOptions`:

```ts
await conn.connect(host, port = 6667, nick = 'dust', { real: true, tls: true });
```

### Options

- `real?: boolean` - When `true` opens a real TCP (or TLS) socket. Default: `false`.
- `tls?: boolean` - When `true` uses TLS for the connection; also inferred for
  port `6697` if not specified.
- `timeout?: number` - Optional socket connect timeout in milliseconds.
- `autoRegister?: boolean` - If `true`, automatically send PASS/NICK/USER after connect using provided registration fields.
- `user?: string` - Username for the USER command (used by autoRegister or register()).
- `realname?: string` - Realname (GECOS) for the USER command.
- `password?: string` - Optional server password (PASS).

## Behavior

- When `real` is not provided or `false`, the connection behaves exactly as
  before: it simulates a connect, uses an in-memory outbound queue, and loops
  sent messages back into `handleInboundLine` for tests.
- When `real: true`, the connection opens a `net.Socket` (or `tls.TLSSocket`)
  and writes queued outbound lines to the socket, terminated with CRLF.
- Incoming socket data is buffered until a LF (`\n`) is found, then each
  complete line is emitted via `raw` and parsed using the existing parser.
- `disconnect()` will close/destroy the socket and stop the send pump.

## Ping implementation

- The parser now treats `PONG` as a `ping` type to support RTT measurement
  when using a real socket.
- `ping()` sends a `PING :<token>` and waits for a matching reply (PONG with
  the same token) for up to 5 seconds.

## Registration helpers

The connection exposes convenience helpers for IRC registration:

- `sendPass(password: string)` — enqueue `PASS <password>`.
- `sendNick(nick: string)` — set the local nick and enqueue `NICK <nick>`.
- `sendUser(user: string, realname?: string, mode = '0', unused = '*')` — enqueue `USER <user> <mode> <unused> :<realname>`.
- `register({ nick?, user?, realname?, password? })` — convenience sequence that enqueues PASS (if provided), then NICK, then USER.

### Examples

```ts
// manual registration after connect (simulated or real)
await conn.connect('irc.example.org', 6667, 'myNick');
conn.register({ password: 'pw', user: 'myuser', realname: 'Real Name' });

// auto-register on connect (opt-in via ConnectOptions)
await conn.connect('irc.libera.chat', 6697, 'myNick', {
  real: true,
  tls: true,
  autoRegister: true,
  user: 'myuser',
  realname: 'Real Name',
  password: 'pw',
});
```

### Behavior notes

- `autoRegister` is opt-in. When enabled the client calls `register()` immediately after the connection is established and after the send pump has started. Registration commands are enqueued and therefore subject to the same rate-limiting and ordering semantics as other outbound messages.
- Registration lines are written to the socket (with CRLF) in real mode or looped back into `handleInboundLine` in simulated mode, preserving existing test behavior.

## Notes and compatibility

- The default behavior remains the simulated mode; tests and existing code
  that call `connect(host, port, nick)` without options will be unaffected.
- The public API is backward compatible; a new optional `ConnectOptions` type
  was added and exported.

## Security

- TLS mode uses Node's `tls.connect`. No certificate validation overrides are
  provided; the default Node behavior is used. For production usage you may
  want to surface TLS options (SNI, CA, cert/key) via the `ConnectOptions`.

## Possible next improvements

- Expose additional TLS/connect options (SNI, custom CA, client certs).
- Implement capability negotiation (CAP) and SASL so clients can authenticate with modern servers.
- Add stronger event typing for typed events emitted by `IrcConnection`.
