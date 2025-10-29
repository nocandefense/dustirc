import * as assert from 'assert';
import * as sinon from 'sinon';
import * as connModule from '../src/irc/connection';
import IrcConnection from '../src/irc/connection';

suite('IrcConnection TLS options', () => {
    test('forwards tlsOptions to tls.connect', async () => {
        const conn = new IrcConnection();

        let capturedOpts: any = null;

        // Replace the exported tlsConnect helper so we can capture the
        // options passed and simulate an immediate successful connection.
        const stub = sinon.stub(connModule, 'tlsConnect').callsFake((opts: any, cb?: any) => {
            capturedOpts = opts;

            // Minimal fake socket with the methods used by the connection code.
            const fakeSocket: any = {
                setEncoding: () => { },
                on: (_: string, __: any) => { },
                removeAllListeners: () => { },
                end: () => { },
                destroy: () => { },
                write: () => { },
                setTimeout: () => { },
            };

            if (typeof cb === 'function') {
                // call next tick to simulate async connect
                process.nextTick(cb);
            }
            return fakeSocket as any;
        });

        // Provide a custom TLS option to check it is forwarded and merged
        const tlsOptions = { rejectUnauthorized: false, servername: 'test.example' };

        await conn.connect('irc.example.org', 6697, 'tester', { real: true, tls: true, tlsOptions });

        // Ensure our stub saw merged options that include host/port and the
        // provided tlsOptions.
        assert.ok(capturedOpts, 'expected tls.connect to be called');
        assert.strictEqual(capturedOpts.host, 'irc.example.org');
        assert.strictEqual(capturedOpts.port, 6697);
        assert.strictEqual(capturedOpts.rejectUnauthorized, false);
        assert.strictEqual(capturedOpts.servername, 'test.example');

        stub.restore();
        conn.disconnect();
    });
});
