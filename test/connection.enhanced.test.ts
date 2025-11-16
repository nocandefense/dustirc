import { strict as assert } from 'assert';
import * as sinon from 'sinon';
import { IrcConnection } from '../src/irc/connection';

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
});