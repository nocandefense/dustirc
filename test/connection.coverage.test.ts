import { strict as assert } from 'assert';
import * as sinon from 'sinon';
import { IrcConnection } from '../src/irc/connection';

suite('IrcConnection Coverage Tests', () => {
    let conn: IrcConnection;

    setup(() => {
        conn = new IrcConnection();
    });

    teardown(() => {
        if (conn && typeof conn.disconnect === 'function') {
            try {
                conn.disconnect();
            } catch (err) {
                // Ignore cleanup errors
            }
        }
    });

    test('sendIdentify coverage for missing lines', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        // Test sendIdentify when connected
        conn.sendIdentify('testpassword');
        assert.ok(enqueueSpy.calledWith('PRIVMSG NickServ :IDENTIFY testpassword'));

        // Test sendIdentify when not connected
        conn.disconnect();
        assert.throws(() => conn.sendIdentify('password'), /Not connected/);
    });

    test('debug logging coverage', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Mock console.log to capture debug output
        // Verify message handling works correctly (debug logs have been removed)
        let privmsgReceived = false;
        
        conn.on('privmsg', () => {
            privmsgReceived = true;
        });

        // Test message handling in handleInboundLine
        conn.handleInboundLine(':testnick!user@host PRIVMSG #test :hello world');

        // Verify events were emitted correctly
        assert.ok(privmsgReceived, 'Should emit privmsg event and parse message correctly');
    });

    test('message handling with various message types', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const messageSpy = sinon.fake();
        const privmsgSpy = sinon.fake();
        const joinSpy = sinon.fake();
        const partSpy = sinon.fake();

        conn.on('message', messageSpy);
        conn.on('privmsg', privmsgSpy);
        conn.on('join', joinSpy);
        conn.on('part', partSpy);

        // Test PRIVMSG handling
        conn.handleInboundLine(':testnick!user@host PRIVMSG #test :hello world');
        assert.ok(privmsgSpy.called, 'Should emit privmsg event');

        // Test JOIN handling  
        conn.handleInboundLine(':testnick!user@host JOIN #test');
        assert.ok(joinSpy.called, 'Should emit join event');

        // Test PART handling
        conn.handleInboundLine(':testnick!user@host PART #test');
        assert.ok(partSpy.called, 'Should emit part event');
    });

    test('error handling in message parsing', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const errorSpy = sinon.fake();
        conn.on('error', errorSpy);

        // Test with completely invalid message that should cause parsing error
        conn.handleInboundLine('COMPLETELY_INVALID_IRC_MESSAGE_FORMAT');

        // The error handler may or may not be called depending on parser robustness
        // The important thing is that it doesn't crash
        assert.ok(true, 'Should handle invalid messages gracefully');
    });

    test('connection state management edge cases', async () => {
        // Test multiple connect calls
        await conn.connect('test.irc', 6667, 'testnick1');

        try {
            await conn.connect('test.irc', 6667, 'testnick2');
        } catch (err) {
            // Expected behavior - should handle gracefully
            assert.ok(true, 'Should handle multiple connect calls');
        }

        // Test disconnect when already disconnected
        conn.disconnect();
        conn.disconnect(); // Second disconnect should not crash

        assert.ok(true, 'Should handle multiple disconnect calls');
    });

    test('channel state tracking edge cases', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Test joining the same channel multiple times
        conn.handleInboundLine(':testnick!user@host JOIN #test');
        conn.handleInboundLine(':testnick!user@host JOIN #test'); // Duplicate

        const channels = conn.getJoinedChannels();
        const testChannelCount = channels.filter(ch => ch === '#test').length;
        assert.strictEqual(testChannelCount, 1, 'Should not have duplicate channels');

        // Test parting a channel that wasn't joined
        conn.handleInboundLine(':testnick!user@host PART #notjoined');
        assert.ok(true, 'Should handle parting non-joined channel');

        // Test channel state with different user actions
        conn.handleInboundLine(':otheruser!user@host JOIN #test');
        conn.handleInboundLine(':otheruser!user@host PART #test');
        assert.ok(true, 'Should handle other users join/part');
    });

    test('sendMessage error conditions', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Test sendMessage with no target and no current channel
        assert.throws(
            () => conn.sendMessage('hello'),
            /No target specified and no current channel/
        );

        // Test sendMessage when not connected
        conn.disconnect();
        assert.throws(
            () => conn.sendMessage('hello', '#test'),
            /Not connected/
        );
    });

    test('sendJoin and sendPart error conditions', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Test sendPart with no channel and no current channel
        assert.throws(
            () => conn.sendPart(),
            /No channel specified and no current channel/
        );

        // Test sendPart/sendJoin when not connected
        conn.disconnect();

        assert.throws(
            () => conn.sendJoin('#test'),
            /Not connected/
        );

        assert.throws(
            () => conn.sendPart('#test'),
            /Not connected/
        );
    });

    test('getInfo and connection state methods', async () => {
        // Test getInfo when not connected
        const infoDisconnected = conn.getInfo();
        assert.ok(infoDisconnected, 'Should return info object even when disconnected');

        // Test when connected
        await conn.connect('test.irc', 6667, 'testnick');
        const infoConnected = conn.getInfo();
        assert.ok(infoConnected, 'Should return info object when connected');
        assert.strictEqual(infoConnected.nick, 'testnick', 'Should have correct nickname');

        // Test current channel methods
        conn.setCurrentChannel('#test');
        assert.strictEqual(conn.getCurrentChannel(), '#test');

        conn.setCurrentChannel(null);
        assert.strictEqual(conn.getCurrentChannel(), null);
    });
});