import * as assert from 'assert';
import IrcConnection from '../src/irc/connection';

suite('IrcConnection', () => {
    test('connect and disconnect', async () => {
        const c = new IrcConnection();
        assert.strictEqual(c.isConnected(), false);
        await c.connect('irc.example.org', 6667, 'tester');
        assert.strictEqual(c.isConnected(), true);
        const info = c.getInfo();
        assert.strictEqual(info.host, 'irc.example.org');
        assert.strictEqual(info.port, 6667);
        assert.strictEqual(info.nick, 'tester');
        c.disconnect();
        assert.strictEqual(c.isConnected(), false);
    });

    test('invalid host throws', async () => {
        const c = new IrcConnection();
        await assert.rejects(async () => {
            // @ts-ignore
            await c.connect('', 6667);
        }, /Host is required/);
    });

    test('invalid port throws', async () => {
        const c = new IrcConnection();
        await assert.rejects(async () => {
            await c.connect('irc.example.org', 70000);
        }, /Port out of range/);
    });

    test('double connect throws', async () => {
        const c = new IrcConnection();
        await c.connect('irc.example.org');
        await assert.rejects(async () => {
            await c.connect('irc.example.org');
        }, /Already connected/);
        c.disconnect();
    });

    test('reconnect uses stored info', async () => {
        const c = new IrcConnection();
        await c.connect('irc.example.org', 6667, 'reconnect-test');
        // simulate disconnect without clearing info (disconnect clears info, so we'll set again)
        const info = c.getInfo();
        // Reset but keep host/port for reconnect test
        (c as any).host = info.host;
        (c as any).port = info.port;
        (c as any).nick = info.nick;
        (c as any).connected = false;

        const ok = await c.reconnect(2, 10);
        assert.strictEqual(ok, true);
        assert.strictEqual(c.isConnected(), true);
        c.disconnect();
    });
});
