import * as vscode from 'vscode';
import { IrcConnection } from '../irc/connection';
import type { IrcMessage } from '../irc/types';

// Message types sent to webview
interface WebviewMessage {
    type: 'message' | 'join' | 'part' | 'channelList' | 'channelSwitched' | 'disconnected';
    channel?: string;
    nick?: string;
    text?: string;
    timestamp?: string;
    own?: boolean;
    channels?: string[];
    current?: string;
}

// Messages received from webview
interface WebviewCommand {
    command: 'sendMessage' | 'switchChannel';
    text?: string;
    channel?: string;
}

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _connection: IrcConnection;
    private _currentChannel: string = '';
    private _channels: Set<string> = new Set();

    // Store IRC event listeners for cleanup
    private _ircListeners: Map<string, (...args: any[]) => void> = new Map();

    // Rate limiting
    private _msgTimestamps: number[] = [];
    private readonly _maxBurst = 5;
    private readonly _burstWindowMs = 2000;
    private readonly _minIntervalMs = 200;

    public static createOrShow(extensionUri: vscode.Uri, connection: IrcConnection) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'dustircChat',
            'Dust IRC',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, connection);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, connection: IrcConnection) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._connection = connection;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            (message: WebviewCommand) => {
                switch (message.command) {
                    case 'sendMessage':
                        if (message.text && message.channel) {
                            this._handleSendMessage(message.text, message.channel);
                        }
                        return;
                    case 'switchChannel':
                        if (message.channel) {
                            this._handleSwitchChannel(message.channel);
                        }
                        return;
                }
            },
            null,
            this._disposables
        );

        // Listen for IRC events
        this._setupIrcListeners();
    }

    private _setupIrcListeners() {
        // Handle incoming messages
        const privmsgHandler = (msg: IrcMessage) => {
            const channel = msg.params[0] || '';
            const nick = msg.from || msg.prefix?.split('!')[0] || 'unknown';
            const text = msg.trailing || '';

            this._sendToWebview({
                type: 'message',
                channel,
                nick,
                text,
                timestamp: new Date().toISOString()
            });
        };
        this._connection.on('privmsg', privmsgHandler);
        this._ircListeners.set('privmsg', privmsgHandler);

        // Handle joins
        const joinHandler = (msg: IrcMessage) => {
            const channel = msg.params[0] || msg.trailing || '';
            const nick = msg.from || msg.prefix?.split('!')[0] || 'unknown';

            this._channels.add(channel);
            if (!this._currentChannel) {
                this._currentChannel = channel;
            }

            this._sendToWebview({
                type: 'join',
                channel,
                nick,
                timestamp: new Date().toISOString()
            });

            // Update channel list
            this._sendToWebview({
                type: 'channelList',
                channels: Array.from(this._channels),
                current: this._currentChannel
            });
        };
        this._connection.on('join', joinHandler);
        this._ircListeners.set('join', joinHandler);

        // Handle parts
        const partHandler = (msg: IrcMessage) => {
            const channel = msg.params[0] || '';
            const nick = msg.from || msg.prefix?.split('!')[0] || 'unknown';

            this._sendToWebview({
                type: 'part',
                channel,
                nick,
                timestamp: new Date().toISOString()
            });
        };
        this._connection.on('part', partHandler);
        this._ircListeners.set('part', partHandler);

        // Handle disconnect
        const disconnectHandler = () => {
            this._sendToWebview({
                type: 'disconnected'
            });
        };
        this._connection.on('disconnect', disconnectHandler);
        this._ircListeners.set('disconnect', disconnectHandler);
    }

    private _handleSendMessage(text: string, channel: string) {
        const trimmedText = text.trim();
        if (!trimmedText || !channel) {
            return;
        }

        if (this._isRateLimited()) {
            return;
        }

        const safeText = trimmedText.substring(0, 450);
        try {
            // Send via IRC connection
            this._connection.sendMessage(safeText, channel);

            // Echo to webview (for immediate feedback)
            this._sendToWebview({
                type: 'message',
                channel,
                nick: this._connection.getNick() || 'you',
                text: safeText,
                timestamp: new Date().toISOString(),
                own: true
            });
        } catch (err) {
            console.error('[ChatPanel] Failed to send message:', err);
        }
    }

    private _isRateLimited(): boolean {
        const now = Date.now();
        this._msgTimestamps = this._msgTimestamps.filter(t => now - t < this._burstWindowMs);

        if (this._msgTimestamps.length >= this._maxBurst) {
            if (now - this._msgTimestamps[0] < this._burstWindowMs) { return true; }
        }

        if (this._msgTimestamps.length > 0) {
            const last = this._msgTimestamps[this._msgTimestamps.length - 1];
            if (now - last < this._minIntervalMs) { return true; }
        }

        this._msgTimestamps.push(now);
        return false;
    }

    private _handleSwitchChannel(channel: string) {
        this._currentChannel = channel;
        this._sendToWebview({
            type: 'channelSwitched',
            channel
        });
    }

    private _sendToWebview(message: WebviewMessage) {
        try {
            this._panel.webview.postMessage(message);
        } catch (err) {
            console.error('[ChatPanel] Failed to send message to webview:', err);
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Dust IRC</title>
	<style>
		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			display: flex;
			flex-direction: column;
			height: 100vh;
			overflow: hidden;
		}
		#header {
			padding: 8px 12px;
			background-color: var(--vscode-titleBar-activeBackground);
			border-bottom: 1px solid var(--vscode-panel-border);
			display: flex;
			align-items: center;
			gap: 8px;
		}
		#channelTabs {
			display: flex;
			gap: 4px;
			flex-wrap: wrap;
		}
		.channel-tab {
			padding: 4px 12px;
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			border: none;
			border-radius: 3px;
			cursor: pointer;
			font-size: 13px;
		}
		.channel-tab:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
		}
		.channel-tab.active {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}
		#messages {
			flex: 1;
			overflow-y: auto;
			padding: 12px;
			scroll-behavior: smooth;
		}
		.message {
			padding: 4px 0;
			line-height: 1.5;
		}
		.message-system {
			color: var(--vscode-descriptionForeground);
			font-style: italic;
		}
		.message-timestamp {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			margin-right: 8px;
		}
		.message-nick {
			font-weight: 600;
			margin-right: 8px;
		}
		.message-own .message-nick {
			color: var(--vscode-textLink-foreground);
		}
		.message-text {
			word-wrap: break-word;
		}
		#inputArea {
			padding: 12px;
			background-color: var(--vscode-input-background);
			border-top: 1px solid var(--vscode-panel-border);
			display: flex;
			gap: 8px;
		}
		#messageInput {
			flex: 1;
			padding: 8px 12px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 3px;
			font-family: inherit;
			font-size: 13px;
		}
		#messageInput:focus {
			outline: 1px solid var(--vscode-focusBorder);
		}
		#sendButton {
			padding: 8px 20px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 3px;
			cursor: pointer;
			font-size: 13px;
		}
		#sendButton:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		#sendButton:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.status-disconnected {
			color: var(--vscode-errorForeground);
			font-size: 11px;
			margin-left: auto;
		}
	</style>
</head>
<body>
	<div id="header">
		<div id="channelTabs"></div>
		<span id="statusIndicator"></span>
	</div>
	<div id="messages"></div>
	<div id="inputArea">
		<input type="text" id="messageInput" placeholder="Type a message..." />
		<button id="sendButton">Send</button>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		let currentChannel = '';
		let channels = [];

		const messagesDiv = document.getElementById('messages');
		const inputField = document.getElementById('messageInput');
		const sendButton = document.getElementById('sendButton');
		const channelTabsDiv = document.getElementById('channelTabs');
		const statusIndicator = document.getElementById('statusIndicator');

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			
			switch (message.type) {
				case 'message':
					addMessage(message);
					break;
				case 'join':
					addSystemMessage(message.channel, \`\${message.nick} joined\`, message.timestamp);
					break;
				case 'part':
					addSystemMessage(message.channel, \`\${message.nick} left\`, message.timestamp);
					break;
				case 'channelList':
					channels = message.channels;
					currentChannel = message.current;
					updateChannelTabs();
					break;
				case 'channelSwitched':
					currentChannel = message.channel;
					updateChannelTabs();
					filterMessages();
					break;
				case 'disconnected':
					statusIndicator.textContent = 'Disconnected';
					statusIndicator.className = 'status-disconnected';
					inputField.disabled = true;
					sendButton.disabled = true;
					break;
			}
		});

		function addMessage(msg) {
			const messageEl = document.createElement('div');
			messageEl.className = 'message' + (msg.own ? ' message-own' : '');
			messageEl.dataset.channel = msg.channel;
			
			const timestamp = new Date(msg.timestamp).toLocaleTimeString();
			messageEl.innerHTML = \`
				<span class="message-timestamp">\${timestamp}</span>
				<span class="message-nick">\${escapeHtml(msg.nick)}:</span>
				<span class="message-text">\${escapeHtml(msg.text)}</span>
			\`;
			
			messagesDiv.appendChild(messageEl);
			
			// Only show if current channel
			if (msg.channel !== currentChannel) {
				messageEl.style.display = 'none';
			}
			
			scrollToBottom();
		}

		function addSystemMessage(channel, text, timestamp) {
			const messageEl = document.createElement('div');
			messageEl.className = 'message message-system';
			messageEl.dataset.channel = channel;
			
			const time = new Date(timestamp).toLocaleTimeString();
			messageEl.innerHTML = \`
				<span class="message-timestamp">\${time}</span>
				<span class="message-text">\${escapeHtml(text)}</span>
			\`;
			
			messagesDiv.appendChild(messageEl);
			
			if (channel !== currentChannel) {
				messageEl.style.display = 'none';
			}
			
			scrollToBottom();
		}

		function updateChannelTabs() {
			channelTabsDiv.innerHTML = '';
			channels.forEach(channel => {
				const tab = document.createElement('button');
				tab.className = 'channel-tab' + (channel === currentChannel ? ' active' : '');
				tab.textContent = channel;
				tab.addEventListener('click', () => {
					vscode.postMessage({
						command: 'switchChannel',
						channel: channel
					});
				});
				channelTabsDiv.appendChild(tab);
			});
		}

		function filterMessages() {
			const allMessages = messagesDiv.querySelectorAll('.message');
			allMessages.forEach(msg => {
				if (msg.dataset.channel === currentChannel) {
					msg.style.display = '';
				} else {
					msg.style.display = 'none';
				}
			});
			scrollToBottom();
		}

		let lastSend = 0;
		const cooldownMs = 300;
		
		function sendMessage() {
			const text = inputField.value.trim();
			const now = Date.now();
			if (!text || !currentChannel || now - lastSend < cooldownMs) return;
			
			lastSend = now;
			sendButton.disabled = true;
			setTimeout(() => sendButton.disabled = false, cooldownMs);
			
			vscode.postMessage({
				command: 'sendMessage',
				text: text,
				channel: currentChannel
			});
			
			inputField.value = '';
		}

		function scrollToBottom() {
			messagesDiv.scrollTop = messagesDiv.scrollHeight;
		}

		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}

		// Event listeners
		sendButton.addEventListener('click', sendMessage);
		inputField.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				sendMessage();
			}
		});
	</script>
</body>
</html>`;
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

        // Remove IRC event listeners to prevent memory leaks
        for (const [event, handler] of this._ircListeners) {
            this._connection.removeListener(event as any, handler);
        }
        this._ircListeners.clear();

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
