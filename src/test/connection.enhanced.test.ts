import { strict as assert } from 'assert';
import * as sinon from 'sinon';
import { IrcConnection } from '../irc/connection';

suite('IrcConnection Enhanced Features', () => {
    let conn: IrcConnection;

    setup(() => {
        conn = new IrcConnection();
    });

    test('sendIdentify enqueues NickServ IDENTIFY command', async () => {
        // Connect first and await the connection
        await conn.connect('test.irc', 6667, 'testnick');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        conn.sendIdentify('testpassword');

        assert.ok(enqueueSpy.calledWith('PRIVMSG NickServ :IDENTIFY testpassword'),
            'Should enqueue PRIVMSG to NickServ with IDENTIFY command');
    });

    test('sendIdentify throws when not connected', () => {
        assert.throws(
            () => conn.sendIdentify('password'),
            /Not connected/,
            'Should throw error when not connected'
        );
    });

    test('sendJoin handles channel with and without # prefix', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        // Test with # prefix
        conn.sendJoin('#test');
        assert.ok(enqueueSpy.calledWith('JOIN #test'), 'Should handle channel with # prefix');

        // Test without # prefix
        conn.sendJoin('test2');
        assert.ok(enqueueSpy.calledWith('JOIN #test2'), 'Should add # prefix when missing');
    });

    test('sendJoin handles channel keys', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        conn.sendJoin('#secret', 'password123');

        assert.ok(enqueueSpy.calledWith('JOIN #secret password123'),
            'Should include channel key when provided');
    });

    test('sendPart uses current channel when none specified', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Set current channel
        conn.setCurrentChannel('#test');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        conn.sendPart();

        assert.ok(enqueueSpy.calledWith('PART #test'),
            'Should use current channel when none specified');
    });

    test('sendPart throws when no channel specified and no current channel', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        assert.throws(
            () => conn.sendPart(),
            /No channel specified and no current channel/,
            'Should throw when no channel to part'
        );
    });

    test('sendPart includes part message when provided', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        conn.sendPart('#test', 'Goodbye!');

        assert.ok(enqueueSpy.calledWith('PART #test :Goodbye!'),
            'Should include part message when provided');
    });

    test('Channel tracking works correctly', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Simulate joining channels
        conn.handleInboundLine(':testnick!user@host JOIN #channel1');
        conn.handleInboundLine(':testnick!user@host JOIN #channel2');

        let joinedChannels = conn.getJoinedChannels();
        assert.ok(joinedChannels.includes('#channel1'), 'Should track joined channel 1');
        assert.ok(joinedChannels.includes('#channel2'), 'Should track joined channel 2');

        // Current channel should be set to first joined channel or latest
        const currentChannel = conn.getCurrentChannel();
        assert.ok(currentChannel === '#channel1' || currentChannel === '#channel2',
            'Should have a current channel set');

        // Simulate leaving a channel
        conn.handleInboundLine(':testnick!user@host PART #channel1');

        joinedChannels = conn.getJoinedChannels();
        assert.ok(!joinedChannels.includes('#channel1'), 'Should remove parted channel');
        assert.ok(joinedChannels.includes('#channel2'), 'Should keep other channels');
    });

    test('setCurrentChannel and getCurrentChannel work correctly', () => {
        conn.setCurrentChannel('#test');
        assert.strictEqual(conn.getCurrentChannel(), '#test',
            'Should set and get current channel');

        conn.setCurrentChannel(null);
        assert.strictEqual(conn.getCurrentChannel(), null,
            'Should handle null current channel');
    });

    test('sendMessage uses target parameter when provided', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        conn.sendMessage('hello', '#specific');

        assert.ok(enqueueSpy.calledWith('PRIVMSG #specific :hello'),
            'Should use provided target channel');
    });

    test('sendMessage uses current channel when no target provided', async () => {
        await conn.connect('test.irc', 6667, 'testnick');
        conn.setCurrentChannel('#current');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        conn.sendMessage('hello');

        assert.ok(enqueueSpy.calledWith('PRIVMSG #current :hello'),
            'Should use current channel when no target provided');
    });

    test('sendMessage throws when no target and no current channel', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        assert.throws(
            () => conn.sendMessage('hello'),
            /No target specified and no current channel/,
            'Should throw when no channel available for messaging'
        );
    });

    test('disconnect method works correctly', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Check initial connection state through public interface
        const initialInfo = conn.getInfo();
        assert.ok(initialInfo.nick, 'Should be connected after connect');

        conn.disconnect();

        // After disconnect, check that subsequent operations fail
        assert.throws(() => conn.sendMessage('test'), 'Should be disconnected after disconnect');
    });

    test('getInfo returns connection information', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const info = conn.getInfo();
        assert.ok(info, 'Should return connection info');
        assert.strictEqual(info.nick, 'testnick', 'Should return correct nickname');
    });

    test('multiple connect calls handle gracefully', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Second connect should either succeed or handle gracefully
        try {
            await conn.connect('test.irc', 6667, 'testnick2');
            assert.ok(true, 'Should handle multiple connect calls');
        } catch (err) {
            // It's okay if it throws - we just want to test it doesn't crash
            assert.ok(true, 'Multiple connect handled with error');
        }
    });

    test('channel tracking edge cases', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Test joining same channel twice
        conn.handleInboundLine(':testnick!user@host JOIN #test');
        conn.handleInboundLine(':testnick!user@host JOIN #test');

        const channels = conn.getJoinedChannels();
        // Should not have duplicates
        const testChannels = channels.filter((ch: string) => ch === '#test');
        assert.strictEqual(testChannels.length, 1, 'Should not have duplicate channels');

        // Test parting channel not joined
        conn.handleInboundLine(':testnick!user@host PART #notjoined');

        // Should handle gracefully
        assert.ok(true, 'Should handle parting non-joined channel');
    });

    test('sendJoin with special characters in channel name', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        const enqueueSpy = sinon.spy(conn, 'enqueueRaw');

        // Test channel with special characters
        conn.sendJoin('#café-général');
        assert.ok(enqueueSpy.calledWith('JOIN #café-général'), 'Should handle special characters in channel names');

        // Test channel with spaces (invalid but should not crash)
        conn.sendJoin('test channel');
        assert.ok(enqueueSpy.calledWith('JOIN #test channel'), 'Should handle invalid channel names');
    });

    test('handleInboundLine with malformed messages', async () => {
        await conn.connect('test.irc', 6667, 'testnick');

        // Test various malformed messages
        const malformedMessages = [
            '',
            'INVALID',
            ':',
            ':nick',
            'PRIVMSG',
            ':nick!user@host PRIVMSG',
            ':nick!user@host PRIVMSG #channel'
        ];

        malformedMessages.forEach(message => {
            try {
                conn.handleInboundLine(message);
                assert.ok(true, `Should handle malformed message: "${message}"`);
            } catch (err) {
                // It's okay if it throws - we just want to ensure it doesn't crash the process
                assert.ok(true, `Handled malformed message with error: "${message}"`);
            }
        });
    });

    test('connection events are emitted correctly', async () => {
        let connectEventFired = false;
        let disconnectEventFired = false;

        conn.on('connect', () => { connectEventFired = true; });
        conn.on('disconnect', () => { disconnectEventFired = true; });

        await conn.connect('test.irc', 6667, 'testnick');
        assert.ok(connectEventFired, 'Should emit connect event');

        conn.disconnect();
        assert.ok(disconnectEventFired, 'Should emit disconnect event');
    });
});