import * as assert from 'assert';
import IrcConnection from '../src/irc/connection';

suite('IrcConnection registration', () => {
    test('register enqueues PASS NICK USER when connected (simulated)', async () => {
        const c = new IrcConnection();
        await c.connect('irc.example.org', 6667, 'regtest');

        // register should enqueue PASS, NICK and USER in that order
        c.register({ password: 'secret', user: 'myuser', realname: 'Real Name' });

        const q = (c as any).sendQueue as string[];
        // PASS should be first, then NICK (regtest), then USER
        assert.ok(q.length >= 3, 'expected at least 3 queued messages');
        const lastThree = q.slice(-3);
        assert.strictEqual(lastThree[0], 'PASS secret');
        assert.strictEqual(lastThree[1], 'NICK regtest');
        assert.strictEqual(lastThree[2], 'USER myuser 0 * :Real Name');

        c.disconnect();
    });

    test('connect with autoRegister enqueues registration', async () => {
        const c = new IrcConnection();
        await c.connect('irc.example.org', 6667, 'autoNick', {
            autoRegister: true,
            user: 'autouser',
            realname: 'Auto Real',
            password: 'pw',
        });

        const q = (c as any).sendQueue as string[];
        // the registration lines should be present in the queue
        assert.ok(q.includes('PASS pw'));
        assert.ok(q.includes('NICK autoNick'));
        assert.ok(q.includes('USER autouser 0 * :Auto Real'));

        c.disconnect();
    });
});
