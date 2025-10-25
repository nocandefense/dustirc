import { EventEmitter } from 'events';
import { parseLine } from './parser';
import { IrcMessage } from './types';

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
    async connect(host: string, port = 6667, nick = 'dust'): Promise<void> {
        if (!host) { throw new Error('Host is required'); }
        if (!Number.isInteger(port) || port <= 0 || port > 65535) { throw new Error('Port out of range'); }
        if (this.connected) { throw new Error('Already connected'); }

        try {
            // Simulate async network operation (kept short for tests)
            await new Promise<void>((resolve) => setTimeout(resolve, 10));
            this.connected = true;
            this.host = host;
            this.port = port;
            this.nick = nick;
            this.emitter.emit('connect');
            // start send pump with a modest rate (5 messages/sec)
            this.startSendPump();
        } catch (err) {
            // Emit an error event for consumers
            this.emitter.emit('error');
            throw err;
        }
    }

    /**
     * Disconnect immediately.
     */
    disconnect(): void {
        if (!this.connected) { return; }
        this.connected = false;
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
        const start = Date.now();
        // Simulate a small network RTT for tests
        await new Promise((r) => setTimeout(r, 10));
        const end = Date.now();
        return end - start;
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

    /** Enqueue a raw line to the outbound queue */
    enqueueRaw(line: string) {
        this.sendQueue.push(line);
    }

    private startSendPump() {
        if (this.sendInterval) { return; }
        this.sendInterval = setInterval(() => {
            if (this.sendQueue.length === 0) { return; }
            const line = this.sendQueue.shift()!;
            // in a real client we'd write to the socket; here we simulate loopback by
            // treating the sent line as if received from the server (for tests/demo)
            this.handleInboundLine(line);
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
