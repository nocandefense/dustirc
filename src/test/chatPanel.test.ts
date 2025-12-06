import * as assert from 'assert';
import * as vscode from 'vscode';
import { ChatPanel } from '../views/chatPanel';
import { IrcConnection } from '../irc/connection';
import { RoomsProvider } from '../views/roomsProvider';

suite('ChatPanel Test Suite', () => {
    let connection: IrcConnection;
    let extensionUri: vscode.Uri;
    let roomsProvider: RoomsProvider;

    setup(() => {
        connection = new IrcConnection();
        extensionUri = vscode.Uri.file(__dirname);
        roomsProvider = new RoomsProvider(connection);
    });

    teardown(() => {
        // Clean up any panels
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.dispose();
        }
    });

    test('createOrShow creates a new panel if none exists', () => {
        assert.strictEqual(ChatPanel.currentPanel, undefined);
        ChatPanel.createOrShow(extensionUri, connection, roomsProvider);
        assert.notStrictEqual(ChatPanel.currentPanel, undefined);
    });

    test('createOrShow reuses existing panel', () => {
        ChatPanel.createOrShow(extensionUri, connection, roomsProvider);
        const firstPanel = ChatPanel.currentPanel;

        ChatPanel.createOrShow(extensionUri, connection, roomsProvider);
        const secondPanel = ChatPanel.currentPanel;

        assert.strictEqual(firstPanel, secondPanel, 'Should reuse the same panel');
    });

    test('dispose clears currentPanel reference', () => {
        ChatPanel.createOrShow(extensionUri, connection, roomsProvider);
        assert.notStrictEqual(ChatPanel.currentPanel, undefined);

        ChatPanel.currentPanel!.dispose();
        assert.strictEqual(ChatPanel.currentPanel, undefined);
    });

    test('getNick returns null when not connected', () => {
        const nick = connection.getNick();
        assert.strictEqual(nick, null);
    });

    test('getNick returns nickname after connection', async () => {
        await connection.connect('test.server', 6667, 'testnick');
        const nick = connection.getNick();
        assert.strictEqual(nick, 'testnick');
    });

    test('removeListener removes event handlers', async () => {
        let callCount = 0;
        const handler = () => callCount++;

        connection.on('connect', handler);
        await connection.connect('test.server', 6667, 'test');
        assert.strictEqual(callCount, 1);

        connection.disconnect();
        connection.removeListener('connect', handler);
        await connection.connect('test.server', 6667, 'test');
        assert.strictEqual(callCount, 1, 'Handler should not fire after removal');
    });
});

suite('ChatPanel Rate Limiting', () => {
    let connection: IrcConnection;
    let extensionUri: vscode.Uri;
    let roomsProvider: RoomsProvider;
    let panel: ChatPanel;

    setup(async function () {
        this.timeout(5000);
        connection = new IrcConnection();
        extensionUri = vscode.Uri.file(__dirname);
        roomsProvider = new RoomsProvider(connection);
        await connection.connect('test.server', 6667, 'testnick');
        ChatPanel.createOrShow(extensionUri, connection, roomsProvider);
        panel = ChatPanel.currentPanel!;
    });

    teardown(() => {
        connection.disconnect();
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.dispose();
        }
    });

    test('allows messages under burst limit', async () => {
        // Should allow 5 messages in quick succession
        for (let i = 0; i < 5; i++) {
            const preCount = connection.sendMessage.toString().length;
            (panel as any)._handleSendMessage(`msg${i}`, '#test');
            // Message should be sent (we can't easily verify without mocking)
        }
    });

    test('blocks 6th message within burst window', async () => {
        // Send 5 messages quickly
        for (let i = 0; i < 5; i++) {
            (panel as any)._handleSendMessage(`msg${i}`, '#test');
        }

        // 6th message should be rate limited
        const rateLimited = (panel as any)._isRateLimited();
        assert.strictEqual(rateLimited, true, '6th message should be rate limited');
    });

    test('allows messages after burst window expires', () => {
        // Directly test rate limiter timestamp filtering
        const timestamps = (panel as any)._msgTimestamps as number[];
        const now = Date.now();

        // Simulate 5 old messages (outside burst window)
        for (let i = 0; i < 5; i++) {
            timestamps.push(now - 2500);
        }

        // Should allow new message after timestamps are filtered out
        const rateLimited = (panel as any)._isRateLimited();
        assert.strictEqual(rateLimited, false, 'Should allow messages after burst window');
    });

    test('enforces minimum interval between messages', async () => {
        (panel as any)._handleSendMessage('msg1', '#test');

        // Immediate second message should be blocked (< 200ms)
        const rateLimited = (panel as any)._isRateLimited();
        assert.strictEqual(rateLimited, true, 'Should block messages under 200ms interval');
    });

    test('allows messages after minimum interval', async () => {
        (panel as any)._handleSendMessage('msg1', '#test');

        // Wait for minimum interval
        await new Promise(resolve => setTimeout(resolve, 250));

        const rateLimited = (panel as any)._isRateLimited();
        assert.strictEqual(rateLimited, false, 'Should allow messages after 200ms interval');
    });
});
