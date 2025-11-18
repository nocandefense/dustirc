import * as assert from 'assert';
import IrcConnection from '../src/irc/connection';

suite('IrcConnection events', () => {
    let conn: IrcConnection;

    setup(() => {
        conn = new IrcConnection();
    });

    teardown(() => {
        // Ensure connection is properly cleaned up after each test
        if (conn && typeof conn.disconnect === 'function') {
            try {
                conn.disconnect();
            } catch (err) {
                // Ignore errors during cleanup
            }
        }
    });

    test('handleInboundLine emits raw and privmsg', () => {
        const c = new IrcConnection();
        const line = ':nick!user@host PRIVMSG #chan :hello world';
        let rawSeen = '';
        let priv: any = null;
        c.on('raw', (l: string) => { rawSeen = l; });
        c.on('privmsg', (m: any) => { priv = m; });

        c.handleInboundLine(line);

        assert.strictEqual(rawSeen, line);
        assert.ok(priv, 'expected privmsg event');
        assert.strictEqual(priv.trailing, 'hello world');
        assert.strictEqual(priv.params[0], '#chan');
    });

    test('sendMessage emits legacy message immediately and pump processes privmsg', async () => {
        const c = new IrcConnection();
        await c.connect('irc.example.org', 6667, 'tester');

        let legacy: any = null;
        c.on('message', (m: any) => { legacy = m; });

        const processed = new Promise<any>((resolve) => {
            c.on('privmsg', (m: any) => resolve(m));
        });

        c.sendMessage('hi there', '#test');

        // legacy message should be emitted synchronously
        assert.ok(legacy, 'expected legacy message event');
        assert.strictEqual(legacy.from, 'tester');
        assert.strictEqual(legacy.text, 'hi there');
        assert.strictEqual(legacy.target, '#test');

        try {
            // processed privmsg should arrive via pump
            const msg = await Promise.race([processed, new Promise((_r, rej) => setTimeout(() => rej(new Error('timeout')), 1000))]);
            assert.strictEqual(msg.trailing, 'hi there');
            assert.strictEqual(msg.params[0], '#test');
        } finally {
            // Always disconnect, even if test fails
            c.disconnect();
        }
    });
});
