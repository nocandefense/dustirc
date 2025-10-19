import { EventEmitter } from 'events';

export class IrcConnection {
    private connected = false;
    private host: string | null = null;
    private port: number | null = null;
    private nick: string | null = null;
    private emitter = new EventEmitter();

    on(event: 'connect' | 'disconnect', listener: () => void) {
        this.emitter.on(event, listener);
    }

    async connect(host: string, port = 6667, nick = 'dust'): Promise<void> {
        // Minimal, mockable connection logic for now.
        if (!host) { throw new Error('Host is required'); }
        if (port <= 0 || port > 65535) { throw new Error('Port out of range'); }
        // Simulate async network operation
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
        this.connected = true;
        this.host = host;
        this.port = port;
        this.nick = nick;
        this.emitter.emit('connect');
    }

    disconnect(): void {
        this.connected = false;
        this.host = null;
        this.port = null;
        this.nick = null;
        this.emitter.emit('disconnect');
    }

    isConnected(): boolean {
        return this.connected;
    }

    getInfo(): { host: string | null; port: number | null; nick: string | null } {
        return { host: this.host, port: this.port, nick: this.nick };
    }
}

export default IrcConnection;
