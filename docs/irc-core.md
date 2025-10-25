# IRC core: types, parser, and connection (design notes)

This document describes the recent additions to the codebase that implement a small, testable IRC core: the TypeScript message types, a line parser, and an event-emitting connection core. It also documents usage, testing, and recommended next steps.

## Purpose

The goal of these changes is to provide a small, well-defined contract between raw IRC protocol data and the extension's UI/commands. The core is intentionally lightweight and well-tested so it can later be wired to a real socket transport.

## Files added/changed

- `src/irc/types.ts` — TypeScript types for parsed IRC messages (`IrcMessage`, `IrcCommand`, etc.).
- `src/irc/parser.ts` — A line-oriented parser that turns raw IRC lines into `IrcMessage` objects (supports tags, prefix, command, params, trailing parameter).
- `src/irc/connection.ts` — An event-emitting connection core that exposes typed events (e.g. `privmsg`, `join`, `numeric`, plus `raw`, `connect`, `disconnect`, `error`) and a small outbound send queue/pump to simulate rate-limited writes.
- `test/parser.test.ts`, `test/parser.edgecases.test.ts` — Unit tests for parser behavior and edge cases.
- `test/connection.events.test.ts` — Unit tests for the connection core events and outbound pump.

## IrcMessage contract (summary)

IrcMessage provides a compact, explicit shape for parsed messages. Key fields:

- `raw: string` — raw input line (unchanged).
- `tags?: Record<string,string|true>` — optional IRCv3 message tags (URL-decoded values; flags map to `true`).
- `prefix?: string` — raw prefix token (server or `nick!user@host`).
- `from?: string` — nickname extracted from the prefix, when available.
- `command: string` — the command token (e.g., `PRIVMSG`, `JOIN`, or numeric `001`).
- `params: string[]` — the non-trailing parameters.
- `trailing?: string` — the trailing parameter (the one that starts with `:` and may contain spaces).
- `type: 'privmsg'|'notice'|'join'|'part'|'nick'|'ping'|'numeric'|'other'` — a small classification used by the connection core.
- `numeric?: number` — parsed numeric code when `type === 'numeric'`.

This contract is intentionally small and pragmatic; event consumers may map or extend the shape to richer domain models (channels, users, etc.).

## Parser behaviour

- Recognizes optional message tags at the start (leading `@`), decodes URL-encoded tag values, and treats tag-only flags as `true`.
- Recognizes optional prefixes (leading `:`). If the prefix contains `!`, the nickname part before `!` is extracted into `from`.
- Splits the rest of the line at spaces; the first token is the `command`, the remainder are `params` until an argument that begins with `:` — that last portion becomes `trailing`.
- Classifies several commands into `type` values (PRIVMSG → `privmsg`, JOIN → `join`, numeric codes → `numeric`, etc.).
- Handles malformed or minimal lines robustly (e.g., prefix-only lines, missing spaces after tags) and yields `command: 'UNKNOWN'` with `type: 'other'` for unrecognized inputs.

Note: The parser operates on complete lines (without the trailing CRLF). The connection core includes hooks (see below) where a read loop should accumulate buffers and call the parser only on complete lines.

## Connection core behaviour

- Exposes an EventEmitter-style API (`on(event, listener)`) with typed event names: `connect`, `disconnect`, `error`, `raw`, `privmsg`, `notice`, `join`, `part`, `nick`, `ping`, `numeric`, and a legacy `message` for backward compatibility.
- `connect(host, port, nick)` and `disconnect()` implement connection lifecycle (the current implementation is mocked for fast tests — see next steps for socket wiring).
- `handleInboundLine(line: string)` feeds a single raw line into the parser and emits `raw` and the typed event (e.g., `privmsg`) and—for PRIVMSG—also emits the legacy `message` event with a `{from, text, target}` object for current UI code.
- `sendMessage(text: string)` keeps prior behavior: emits the legacy `message` for immediate UI feedback and enqueues a raw `PRIVMSG` line to the send queue.
- A simple send pump processes the outbound queue on an interval (200ms by default) and currently simulates loopback by feeding the sent raw line back into `handleInboundLine` (so tests and demo behavior are observable without a live socket).
- `reconnect()` implements a small retry/backoff strategy using stored connection info.

Design notes:

- The connection core intentionally preserves existing behavior (the legacy `message` event) while adding a stronger typed API (`privmsg`, `join`, etc.), making it safe to migrate UI code incrementally.
- The send queue/pump is a placeholder for true socket writes + rate-limiting. When wiring a real socket, replace the pump's write-simulation with socket.write and keep the pump to manage rate-limits.

## Tests

- Parser tests cover PING, PRIVMSG, numeric replies, tags, URL-encoded tags, malformed lines, fragmented-line buffering simulation, and empty trailing arguments.
- Connection tests cover `handleInboundLine` behavior, the legacy `message` emission, and send-pump processing.

Run tests locally:

```bash
npm run test:unit
```

## How to use (examples)

Subscribe to events:

```ts
const conn = new IrcConnection();
conn.on('connect', () => console.log('connected'));
conn.on('privmsg', (msg) => console.log('PRIVMSG', msg.from, msg.params[0], msg.trailing));
conn.on('raw', (line) => console.log('raw line', line));
```

Feed raw lines (when you receive them from a socket):

```ts
conn.handleInboundLine(':nick!user@host PRIVMSG #chan :hello');
```

Send a message (UI compatibility):

```ts
conn.sendMessage('hi there'); // emits legacy message and enqueues raw PRIVMSG
```

## Testing tips

- Unit tests already exercise parser and connection behaviors; use `handleInboundLine` to inject raw lines in tests rather than mocking sockets when possible.
- For integration tests with a real TCP socket, use Node's `net.createServer()` in the test harness to accept a connection and write test lines; ensure your reader accumulates buffers and splits at CRLF.

## Next steps / Recommendations

1. Wire `handleInboundLine` to a real `net.Socket` read loop. Build a small `readLoop(socket)` helper that buffers incoming bytes, splits at `\r\n` boundaries, and calls `handleInboundLine` per line.
2. Add unit/integration tests for the real socket wiring (mock server) and for queueing behavior under load.
3. Replace the pump loopback simulation with `socket.write()` while preserving send-queue semantics for rate-limiting.
4. Consider adding a small channel/user model and typed events for `notice`, `nick`, and `numeric` replies to simplify UI consumption.

If you want, I can implement the socket wiring and the integration tests next and open a small PR with those changes.
