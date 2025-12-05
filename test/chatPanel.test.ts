import * as assert from 'assert';
import * as vscode from 'vscode';
import { ChatPanel } from '../src/views/chatPanel';
import { IrcConnection } from '../src/irc/connection';

suite('ChatPanel Test Suite', () => {
    let connection: IrcConnection;
    let extensionUri: vscode.Uri;

    setup(() => {
        connection = new IrcConnection();
        extensionUri = vscode.Uri.file(__dirname);
    });

    teardown(() => {
        // Clean up any panels
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.dispose();
        }
    });

    test('createOrShow creates a new panel if none exists', () => {
        assert.strictEqual(ChatPanel.currentPanel, undefined);
        ChatPanel.createOrShow(extensionUri, connection);
        assert.notStrictEqual(ChatPanel.currentPanel, undefined);
    });

    test('createOrShow reuses existing panel', () => {
        ChatPanel.createOrShow(extensionUri, connection);
        const firstPanel = ChatPanel.currentPanel;

        ChatPanel.createOrShow(extensionUri, connection);
        const secondPanel = ChatPanel.currentPanel;

        assert.strictEqual(firstPanel, secondPanel, 'Should reuse the same panel');
    });

    test('dispose clears currentPanel reference', () => {
        ChatPanel.createOrShow(extensionUri, connection);
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
});
