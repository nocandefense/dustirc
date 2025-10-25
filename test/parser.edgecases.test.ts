import * as assert from 'assert';
import { parseLine } from '../src/irc/parser';

suite('IRC parser edge cases', () => {
    test('decodes URL-encoded tag values', () => {
        const line = '@time=2025-10-25T12%3A34%3A56Z;flag :nick!u@h PRIVMSG #c :hi';
        const m = parseLine(line);
        assert.ok(m.tags);
        assert.strictEqual((m.tags as any).time, '2025-10-25T12:34:56Z');
        assert.strictEqual((m.tags as any).flag, true);
    });

    test('handles fragmented input (buffering simulation)', () => {
        // simulate receiving two fragments that together make one IRC line
        const frag1 = ':nick!user@host PRIVMSG #chan :hello';
        const frag2 = ' world\r\n';
        // naive buffer join until newline
        let buffer = '';
        buffer += frag1;
        let msg: any = null;
        // no newline yet
        if (buffer.indexOf('\n') !== -1) {
            msg = parseLine(buffer.replace(/\r?\n$/, ''));
        }
        assert.strictEqual(msg, null);

        buffer += frag2;
        if (buffer.indexOf('\n') !== -1) {
            msg = parseLine(buffer.replace(/\r?\n$/, ''));
        }
        assert.ok(msg, 'expected parsed message after fragments');
        assert.strictEqual(msg.type, 'privmsg');
        assert.strictEqual(msg.trailing, 'hello world');
    });

    test('malformed line without command yields UNKNOWN command', () => {
        const line = ':justprefixonly';
        const m = parseLine(line);
        assert.strictEqual(m.command, 'UNKNOWN');
        assert.strictEqual(m.type, 'other');
    });

    test('trailing empty string is allowed', () => {
        const line = ':nick!u@h PRIVMSG #chan :';
        const m = parseLine(line);
        assert.strictEqual(m.trailing, '');
        assert.strictEqual(m.type, 'privmsg');
    });
});
