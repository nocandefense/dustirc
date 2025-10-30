import { EventEmitter } from 'events';
import { parseLine } from './parser';
import { IrcMessage } from './types';
import * as net from 'net';
import * as tls from 'tls';

// Export a thin indirection to allow tests to replace the TLS connect helper
// without modifying Node's `tls` module (some environments mark its
// properties as non-writable). Tests can replace `tlsConnect` to observe
// or simulate connections.
export let tlsConnect = tls.connect;

/**
 * Options to enable a real network connection. By default the existing simulated
 * in-memory behavior is used (for tests and demos). Callers that want to open
 * a real socket should pass { real: true } and optionally { tls: true }.
 */
export interface ConnectOptions {
    real?: boolean; // open a real TCP/TLS connection when true
    tls?: boolean; // use TLS for the connection (if real)
    // Low-level TLS options that will be forwarded to `tls.connect` when
    // `tls` is enabled. Most callers won't need this, but it allows supplying
    // custom CA, client cert/key, SNI, or to adjust `rejectUnauthorized`.
    tlsOptions?: tls.ConnectionOptions;
    // optional timeout in ms for socket connect
    timeout?: number;
    // If true, automatically send PASS/NICK/USER after connect using the
    // provided registration fields below. This is optional to preserve
    // compatibility with tests that use the simulated fast path.
    autoRegister?: boolean;
    user?: string;
    realname?: string;
    password?: string;
}

export type IrcEvents =
    | 'connect'
    | 'disconnect'
    | 'error'
    | 'message' // legacy event for simple UI message objects
    | 'raw' // raw line received
    | 'privmsg'
    | 'notice'
    | 'join'
    | 'part'
    | 'nick'
    | 'ping'
    | 'numeric';

export class IrcConnection {
    private connected = false;
    private host: string | null = null;
    private port: number | null = null;
    private nick: string | null = null;
    private emitter = new EventEmitter();
    // Underlying socket when using real network mode.
    private socket: net.Socket | tls.TLSSocket | null = null;
    // Buffer for incoming data when using sockets
    private recvBuffer = '';

    // outbound queue for rate-limiting (not strictly enforced for tests)
    private sendQueue: string[] = [];
    private sendInterval: NodeJS.Timeout | null = null;

    on(event: IrcEvents, listener: (...args: any[]) => void) {
        this.emitter.on(event, listener);
    }

    /**
     * Connect to an IRC server (mocked async).
     * Throws on invalid args or if already connected.
     */
    /**
     * Connect to an IRC server.
     *
     * By default this method uses the existing simulated (mocked) behavior used
     * by the tests: it does not open a network socket and resolves quickly.
     * To open a real TCP/TLS socket, pass a ConnectOptions object with
     * `real: true` and optionally `tls: true`.
     *
     * NOTE: keeping this opt-in preserves test behavior and backwards
     * compatibility. Example:
     *   await conn.connect('irc.libera.chat', 6697, 'nick', { real: true, tls: true });
     */
    async connect(host: string, port = 6667, nick = 'dust', options?: ConnectOptions): Promise<void> {
        if (!host) { throw new Error('Host is required'); }
        if (!Number.isInteger(port) || port <= 0 || port > 65535) { throw new Error('Port out of range'); }
        if (this.connected) { throw new Error('Already connected'); }

        // Save basic info regardless of network mode so reconnect() can use it.
        this.host = host;
        this.port = port;
        this.nick = nick;

        const useReal = options?.real === true;

        if (!useReal) {
            // existing simulated behavior (fast for tests)
            // Simulate async network operation (kept short for tests)
            await new Promise<void>((resolve) => setTimeout(resolve, 10));
            this.connected = true;
            // start send pump with a modest rate (5 messages/sec)
            this.startSendPump();
            this.emitter.emit('connect');
            // If requested, auto-register using provided options
            if (options?.autoRegister) {
                this.register({
                    nick,
                    user: options.user,
                    realname: options.realname,
                    password: options.password,
                });
            }
            return;
        }

        // Real network path
        return new Promise<void>((resolve, reject) => {
            const connectOpts = { host, port } as any;
            const useTls = options?.tls === true || port === 6697;
            let socket: net.Socket | tls.TLSSocket;

            const onError = (err: Error) => {
                this.emitter.emit('error', err);
                cleanup();
                reject(err);
            };

            const onConnect = () => {
                this.connected = true;
                this.socket = socket;
                this.recvBuffer = '';
                // start pump and wire socket events
                this.startSendPump();
                this.emitter.emit('connect');
                // If requested, auto-register now we're connected
                if (options?.autoRegister) {
                    this.register({
                        nick,
                        user: options.user,
                        realname: options.realname,
                        password: options.password,
                    });
                }
                resolve();
            };

            const cleanup = () => {
                if (socket) {
                    socket.removeAllListeners('error');
                    socket.removeAllListeners('data');
                    socket.removeAllListeners('close');
                    socket.removeAllListeners('end');
                }
            };

            if (useTls) {
                // Merge user-supplied TLS options (if any) with host/port.
                const tlsOpts = Object.assign({ host, port }, options?.tlsOptions || {});
                socket = tlsConnect(tlsOpts, () => onConnect());
            } else {
                socket = net.connect(connectOpts, () => onConnect());
            }

            socket.setEncoding('utf8');

            // socket data handler - buffer until CRLF and parse lines
            socket.on('data', (chunk: string) => {
                this.recvBuffer += chunk;
                let idx;
                while ((idx = this.recvBuffer.indexOf('\n')) !== -1) {
                    // remove trailing CRLF and whitespace
                    const rawLine = this.recvBuffer.slice(0, idx + 1).replace(/\r?\n$/, '');
                    this.recvBuffer = this.recvBuffer.slice(idx + 1);
                    // feed line to handler
                    this.handleInboundLine(rawLine);
                }
            });

            socket.on('error', onError);

            socket.on('close', (hadError: boolean) => {
                // mirror previous simulated disconnect behavior
                this.connected = false;
                this.socket = null;
                this.emitter.emit('disconnect');
                this.stopSendPump();
                cleanup();
            });

            socket.on('end', () => {
                // server closed
                if (this.connected) {
                    this.disconnect();
                }
            });

            // apply an optional connect timeout
            if (options?.timeout && typeof (options.timeout) === 'number') {
                socket.setTimeout(options.timeout, () => {
                    const err = new Error('Connection timeout');
                    socket.destroy(err);
                });
            }
        });
    }

    /**
     * Disconnect immediately.
     */
    disconnect(): void {
        if (!this.connected && !this.socket) { return; }
        this.connected = false;
        // If using a real socket, destroy it
        if (this.socket) {
            try { this.socket.end(); } catch (_) { /* ignore */ }
            try { this.socket.destroy(); } catch (_) { /* ignore */ }
            this.socket = null;
        }
        // Clear stored connection info
        this.host = null;
        this.port = null;
        this.nick = null;
        this.emitter.emit('disconnect');
        this.stopSendPump();
    }

    /**
     * Try to reconnect using retries with simple backoff.
     * Returns true on success, false on failure after retries.
     */
    async reconnect(retries = 3, delayMs = 100): Promise<boolean> {
        const host = this.host;
        const port = this.port;
        const nick = this.nick ?? 'dust';
        // If we don't have previous connection info, cannot reconnect
        if (!host || !port) { return false; }

        this.disconnect();

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                await this.connect(host, port, nick);
                return true;
            } catch (err) {
                // simple backoff
                await new Promise((r) => setTimeout(r, delayMs));
                delayMs *= 2;
            }
        }
        return false;
    }

    /**
     * Simulate a ping to the server and return round-trip time in ms.
     * If not connected, throws an error.
     */
    async ping(): Promise<number> {
        if (!this.connected) { throw new Error('Not connected'); }

        // If not using a real socket, preserve existing simulated behavior
        if (!this.socket) {
            const start = Date.now();
            await new Promise((r) => setTimeout(r, 10));
            return Date.now() - start;
        }

        // Real socket: send a PING and wait for a PONG reply
        return new Promise<number>((resolve, reject) => {
            const token = Date.now().toString();
            const line = `PING :${token}`;
            const start = Date.now();

            const onPingReply = (msg: IrcMessage) => {
                // numeric type 'ping' is used for both PING and PONG in parser
                // trailing contains token; match to ensure this is our reply
                if (msg.trailing === token) {
                    this.emitter.removeListener('ping', onPingReply as any);
                    resolve(Date.now() - start);
                }
            };

            const onError = (err: any) => {
                this.emitter.removeListener('ping', onPingReply as any);
                reject(err || new Error('Ping error'));
            };

            this.emitter.on('ping', onPingReply as any);
            this.emitter.once('error', onError);

            // enqueue the raw PING line (send pump will write it)
            this.enqueueRaw(line);

            // fallback timeout
            setTimeout(() => {
                this.emitter.removeListener('ping', onPingReply as any);
                reject(new Error('Ping timeout'));
            }, 5000);
        });
    }

    /**
     * Send a message (mocked) — emits a local 'message' event for UI.
     */
    /**
     * Send a user-visible message. This emits a legacy 'message' event immediately
     * (keeps existing behavior for the UI) and enqueues a raw PRIVMSG for the send
     * pump which would write to the socket in a real implementation.
     */
    sendMessage(text: string): void {
        if (!this.connected) { throw new Error('Not connected'); }
        // legacy immediate UI event
        this.emitter.emit('message', { from: this.nick ?? 'me', text });
        // enqueue raw PRIVMSG to be sent (simulated)
        const target = '#local';
        const raw = `PRIVMSG ${target} :${text}`;
        this.enqueueRaw(raw);
    }

    /** Send PASS command (for servers requiring a password) */
    sendPass(password: string): void {
        if (!this.connected) { throw new Error('Not connected'); }
        if (!password) { return; }
        this.enqueueRaw(`PASS ${password}`);
    }

    /** Send NICK command and update local nick state */
    sendNick(nick: string): void {
        if (!this.connected) { throw new Error('Not connected'); }
        if (!nick) { throw new Error('Nick is required'); }
        this.nick = nick;
        this.enqueueRaw(`NICK ${nick}`);
    }

    /** Send USER command. realname may contain spaces. */
    sendUser(user: string, realname = '', mode = '0', unused = '*'): void {
        if (!this.connected) { throw new Error('Not connected'); }
        if (!user) { throw new Error('User is required'); }
        // USER <username> <mode> <unused> :<realname>
        this.enqueueRaw(`USER ${user} ${mode} ${unused} :${realname}`);
    }

    /**
     * Convenience method that sends PASS (optional), NICK and USER in that order.
     * Accepts an options object so callers can register in one call.
     */
    register(opts: { nick?: string; user?: string; realname?: string; password?: string } = {}): void {
        if (!this.connected) { throw new Error('Not connected'); }
        // If a password is provided, send it first
        if (opts.password) {
            this.sendPass(opts.password);
        }
        // Prefer provided nick, then stored nick
        const nickToUse = opts.nick ?? this.nick;
        if (nickToUse) {
            this.sendNick(nickToUse);
        }
        // USER requires a username; if provided, send it
        if (opts.user) {
            this.sendUser(opts.user, opts.realname ?? '');
        }
    }

    /** Enqueue a raw line to the outbound queue */
    enqueueRaw(line: string) {
        // Always queue for rate-limiting. The send pump will write to the socket
        // when in real mode, otherwise it will loop back locally (existing behavior).
        this.sendQueue.push(line);
    }

    private startSendPump() {
        if (this.sendInterval) { return; }
        this.sendInterval = setInterval(() => {
            if (this.sendQueue.length === 0) { return; }
            const line = this.sendQueue.shift()!;
            // If we have a real socket, write the line (append CRLF). Otherwise
            // simulate loopback into handleInboundLine to preserve current tests.
            if (this.socket && this.connected) {
                try {
                    // Ensure CRLF termination per IRC spec
                    this.socket.write(line.replace(/\r?\n$/, '') + '\r\n');
                } catch (err) {
                    this.emitter.emit('error', err);
                }
            } else {
                // simulated loopback for tests
                this.handleInboundLine(line);
            }
        }, 200);
    }

    private stopSendPump() {
        if (this.sendInterval) {
            clearInterval(this.sendInterval);
            this.sendInterval = null;
        }
        this.sendQueue = [];
    }

    /**
     * Feed a raw line into the parser and emit typed events. Useful for tests
     * or when reading from a socket.
     */
    handleInboundLine(line: string) {
        // emit raw
        this.emitter.emit('raw', line);
        let msg: IrcMessage;
        try {
            msg = parseLine(line);
        } catch (err) {
            this.emitter.emit('error', err);
            return;
        }

        // Emit a generic 'message' event for compatibility when it's a PRIVMSG
        if (msg.type === 'privmsg') {
            this.emitter.emit('message', { from: msg.from, text: msg.trailing, target: msg.params[0] });
        }

        // Emit typed event
        this.emitter.emit(msg.type, msg);
    }

    isConnected(): boolean {
        return this.connected;
    }

    getInfo(): { host: string | null; port: number | null; nick: string | null } {
        return { host: this.host, port: this.port, nick: this.nick };
    }
}

export default IrcConnection;
