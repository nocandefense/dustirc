import * as assert from 'assert';
import { parseLine } from '../src/irc/parser';

suite('IRC parser', () => {
    test('parses PING', () => {
        const m = parseLine('PING :irc.example.com');
        assert.strictEqual(m.type, 'ping');
        assert.strictEqual(m.trailing, 'irc.example.com');
        assert.strictEqual(m.command.toUpperCase(), 'PING');
    });

    test('parses PRIVMSG with prefix and trailing', () => {
        const line = ':nick!user@host PRIVMSG #chan :hello world';
        const m = parseLine(line);
        assert.strictEqual(m.type, 'privmsg');
        assert.strictEqual(m.from, 'nick');
        assert.strictEqual(m.params[0], '#chan');
        assert.strictEqual(m.trailing, 'hello world');
    });

    test('parses numeric reply', () => {
        const line = ':server 001 nick :Welcome to IRC';
        const m = parseLine(line);
        assert.strictEqual(m.type, 'numeric');
        assert.strictEqual(m.numeric, 1);
        assert.strictEqual(m.params[0], 'nick');
        assert.strictEqual(m.trailing, 'Welcome to IRC');
    });

    test('parses tags', () => {
        const line = '@tag=value;flag :nick!u@h PRIVMSG #c :hi';
        const m = parseLine(line);
        assert.ok(m.tags);
        assert.strictEqual((m.tags as any).tag, 'value');
        assert.strictEqual((m.tags as any).flag, true);
    });
});
