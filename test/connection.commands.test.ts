import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import IrcConnection from '../src/irc/connection';

suite('IrcConnection commands', () => {
    test('ping returns a number when connected', async () => {
        const c = new IrcConnection();
        await c.connect('example.com', 6667, 'dust');
        const rtt = await c.ping();
        assert.equal(typeof rtt, 'number');
        await c.disconnect();
    });

    test('ping throws when not connected', async () => {
        const c = new IrcConnection();
        let thrown = false;
        try { await c.ping(); } catch (e) { thrown = true; }
        assert.equal(thrown, true);
    });

    test('logs outgoing messages to workspace folder', async () => {
        // Create a temp workspace folder
        const tmp = fs.mkdtempSync(path.join(process.cwd(), 'tmp-work-'));
        const logDir = path.join(tmp, '.vscode');
        if (fs.existsSync(logDir)) { fs.rmSync(logDir, { recursive: true, force: true }); }

        // use require to ensure ts-node resolves the TypeScript module correctly

        const logging = require('../src/logging');
        logging.appendOutgoingMessage(tmp, 'hello world');

        const logFile = path.join(logDir, 'dust-outgoing.log');
        assert.ok(fs.existsSync(logFile), 'log file should be created');
        const contents = fs.readFileSync(logFile, 'utf8');
        assert.ok(contents.includes('hello world'));

        // cleanup
        fs.rmSync(tmp, { recursive: true, force: true });
    });
});
