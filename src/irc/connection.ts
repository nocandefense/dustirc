import { EventEmitter } from 'events';

export class IrcConnection {
    private connected = false;
    private host: string | null = null;
    private port: number | null = null;
    private nick: string | null = null;
    private emitter = new EventEmitter();

    on(event: 'connect' | 'disconnect' | 'error', listener: () => void) {
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

    isConnected(): boolean {
        return this.connected;
    }

    getInfo(): { host: string | null; port: number | null; nick: string | null } {
        return { host: this.host, port: this.port, nick: this.nick };
    }
}

export default IrcConnection;
