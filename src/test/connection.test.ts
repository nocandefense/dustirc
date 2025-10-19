import * as assert from 'assert';
import { IrcConnection } from '../irc/connection';

suite('IrcConnection Test Suite', () => {
    test('connect sets state', async () => {
        const c = new IrcConnection();
        await c.connect('example.test', 6667, 'tester');
        assert.strictEqual(c.isConnected(), true);
        const info = c.getInfo();
        assert.strictEqual(info.host, 'example.test');
        assert.strictEqual(info.port, 6667);
        assert.strictEqual(info.nick, 'tester');
    });

    test('connect throws on invalid port', async () => {
        const c = new IrcConnection();
        let threw = false;
        try {
            await c.connect('example.test', 70000, 'tester');
        } catch (e) {
            threw = true;
        }
        assert.strictEqual(threw, true);
    });
});
