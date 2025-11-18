import { strict as assert } from 'assert';
import { parseLine } from '../src/irc/parser';

suite('Parser Additional Coverage Tests', () => {
    test('parseLine with IRC v3 tags edge cases', () => {
        // Test with tags but no space after
        const msgWithOnlyTags = '@key1=value1;key2=value2';
        const parsed1 = parseLine(msgWithOnlyTags);
        assert.ok(parsed1.tags, 'Should parse tags even with no command');
        assert.ok(parsed1.tags['key1'] === 'value1', 'Should parse tag with value');
        assert.ok(parsed1.tags['key2'] === 'value2', 'Should parse multiple tags');

        // Test with boolean tags (no value)
        const msgWithBoolTags = '@boolTag;key=value COMMAND';
        const parsed2 = parseLine(msgWithBoolTags);
        assert.strictEqual(parsed2.tags!['boolTag'], true, 'Should parse boolean tag');
        assert.strictEqual(parsed2.tags!['key'], 'value', 'Should parse regular tag alongside boolean');

        // Test with encoded tag values
        const msgWithEncodedTags = '@key=encoded%20value COMMAND';
        const parsed3 = parseLine(msgWithEncodedTags);
        assert.strictEqual(parsed3.tags!['key'], 'encoded value', 'Should decode URI-encoded tag values');

        // Test with empty tag string
        const msgWithEmptyTags = '@ COMMAND';
        const parsed4 = parseLine(msgWithEmptyTags);
        assert.ok(parsed4.tags && Object.keys(parsed4.tags).length === 0, 'Should handle empty tag string');
    });

    test('parseLine with prefix edge cases', () => {
        // Test with prefix but no space after
        const msgWithOnlyPrefix = ':nick!user@host';
        const parsed1 = parseLine(msgWithOnlyPrefix);
        assert.strictEqual(parsed1.prefix, 'nick!user@host', 'Should parse prefix even with no command');
        assert.strictEqual(parsed1.from, 'nick', 'Should extract nick from prefix');

        // Test with server prefix (no exclamation mark)
        const msgWithServerPrefix = ':irc.server.com NOTICE * :Server notice';
        const parsed2 = parseLine(msgWithServerPrefix);
        assert.strictEqual(parsed2.prefix, 'irc.server.com', 'Should parse server prefix');
        assert.ok(!parsed2.from, 'Should not extract "from" for server prefix');

        // Test with complex hostmask
        const msgWithComplexHost = ':nick!~user@some.long.hostname.example.com PRIVMSG #chan :hello';
        const parsed3 = parseLine(msgWithComplexHost);
        assert.strictEqual(parsed3.from, 'nick', 'Should extract nick from complex hostmask');
    });

    test('parseLine with trailing parameter edge cases', () => {
        // Test with empty trailing parameter
        const msgWithEmptyTrailing = 'COMMAND param1 :';
        const parsed1 = parseLine(msgWithEmptyTrailing);
        assert.strictEqual(parsed1.trailing, '', 'Should parse empty trailing parameter');
        assert.deepStrictEqual(parsed1.params, ['param1'], 'Should parse regular params before empty trailing');

        // Test with colon not at start of param (should be treated as normal param)
        const msgWithMidColon = 'COMMAND param:with:colons finalParam';
        const parsed2 = parseLine(msgWithMidColon);
        assert.deepStrictEqual(parsed2.params, ['param:with:colons', 'finalParam'], 'Should treat mid-colons as normal characters');
        assert.ok(!parsed2.trailing, 'Should not have trailing when colon not at start');

        // Test with multiple spaces between params
        const msgWithExtraSpaces = 'COMMAND   param1    param2   :trailing with spaces';
        const parsed3 = parseLine(msgWithExtraSpaces);
        assert.deepStrictEqual(parsed3.params, ['param1', 'param2'], 'Should ignore empty params from extra spaces');
        assert.strictEqual(parsed3.trailing, 'trailing with spaces', 'Should parse trailing correctly despite extra spaces');
    });

    test('parseLine command mapping coverage', () => {
        // Test QUIT command
        const quitMsg = ':user!host QUIT :Goodbye';
        const parsed1 = parseLine(quitMsg);
        assert.strictEqual(parsed1.type, 'quit', 'Should map QUIT to quit type');

        // Test NICK command
        const nickMsg = ':oldnick!user@host NICK newnick';
        const parsed2 = parseLine(nickMsg);
        assert.strictEqual(parsed2.type, 'nick', 'Should map NICK to nick type');

        // Test PONG command (mapped to ping type)
        const pongMsg = 'PONG :server.name';
        const parsed3 = parseLine(pongMsg);
        assert.strictEqual(parsed3.type, 'ping', 'Should map PONG to ping type for RTT handling');

        // Test numeric commands
        const welcomeMsg = ':server 001 nick :Welcome message';
        const parsed4 = parseLine(welcomeMsg);
        assert.strictEqual(parsed4.type, 'numeric', 'Should map numeric commands to numeric type');
        assert.strictEqual(parsed4.numeric, 1, 'Should parse numeric value');

        // Test three-digit numeric edge cases
        const numericMsg999 = ':server 999 nick :High numeric';
        const parsed5 = parseLine(numericMsg999);
        assert.strictEqual(parsed5.type, 'numeric', 'Should handle 999 numeric');
        assert.strictEqual(parsed5.numeric, 999, 'Should parse high numeric correctly');

        // Test unknown command
        const unknownMsg = 'UNKNOWN_COMMAND param';
        const parsed6 = parseLine(unknownMsg);
        assert.strictEqual(parsed6.type, 'other', 'Should default to "other" type for unknown commands');
    });

    test('parseLine with empty and minimal input', () => {
        // Test completely empty line
        const emptyMsg = '';
        const parsed1 = parseLine(emptyMsg);
        assert.strictEqual(parsed1.command, 'UNKNOWN', 'Should handle empty line with UNKNOWN command');
        assert.strictEqual(parsed1.type, 'other', 'Should have "other" type for empty line');

        // Test with just whitespace
        const whitespaceMsg = '   ';
        const parsed2 = parseLine(whitespaceMsg);
        assert.strictEqual(parsed2.command, 'UNKNOWN', 'Should handle whitespace-only line');

        // Test with just command
        const justCommand = 'PING';
        const parsed3 = parseLine(justCommand);
        assert.strictEqual(parsed3.command, 'PING', 'Should parse command-only line');
        assert.strictEqual(parsed3.type, 'ping', 'Should map PING correctly');
    });

    test('parseLine preserves raw line', () => {
        const testLines = [
            '@tags=value :prefix COMMAND param :trailing',
            'SIMPLE_COMMAND',
            ':server 001 nick :Welcome',
            '@a=b;c :nick!user@host PRIVMSG #chan :hello world'
        ];

        testLines.forEach(line => {
            const parsed = parseLine(line);
            assert.strictEqual(parsed.raw, line, `Should preserve raw line: ${line}`);
        });
    });

    test('parseLine with case sensitivity', () => {
        // Test lowercase commands
        const lowerMsg = 'privmsg #chan :hello';
        const parsed1 = parseLine(lowerMsg);
        assert.strictEqual(parsed1.type, 'privmsg', 'Should handle lowercase commands');

        // Test mixed case commands
        const mixedMsg = 'PrIvMsG #chan :hello';
        const parsed2 = parseLine(mixedMsg);
        assert.strictEqual(parsed2.type, 'privmsg', 'Should handle mixed case commands');
    });

    test('parseLine with complex real-world examples', () => {
        // Real PRIVMSG with IRCv3 tags
        const realPrivmsg = '@time=2023-01-01T12:00:00.000Z :nick!user@host.example.com PRIVMSG #channel :Hello, world!';
        const parsed1 = parseLine(realPrivmsg);
        assert.strictEqual(parsed1.type, 'privmsg', 'Should parse real PRIVMSG correctly');
        assert.strictEqual(parsed1.from, 'nick', 'Should extract nick from real message');
        assert.deepStrictEqual(parsed1.params, ['#channel'], 'Should parse target channel');
        assert.strictEqual(parsed1.trailing, 'Hello, world!', 'Should parse message text');

        // Server numeric with detailed info
        const serverNumeric = ':irc.libera.chat 353 mynick = #channel :@op +voice regular';
        const parsed2 = parseLine(serverNumeric);
        assert.strictEqual(parsed2.type, 'numeric', 'Should parse server numeric');
        assert.strictEqual(parsed2.numeric, 353, 'Should parse NAMES numeric');
        assert.deepStrictEqual(parsed2.params, ['mynick', '=', '#channel'], 'Should parse numeric params');

        // JOIN with no message
        const joinMsg = ':nick!user@host JOIN #channel';
        const parsed3 = parseLine(joinMsg);
        assert.strictEqual(parsed3.type, 'join', 'Should parse JOIN message');
        assert.deepStrictEqual(parsed3.params, ['#channel'], 'Should parse channel param');
        assert.ok(!parsed3.trailing, 'Should have no trailing for simple JOIN');
    });
});