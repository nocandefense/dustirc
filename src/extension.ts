// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IrcConnection } from './irc/connection';
import type { IrcMessage } from './irc/types';
import { RoomsProvider } from './views/roomsProvider';
import { ChatPanel } from './views/chatPanel';

// Settings helper functions
function getConfig() {
	return vscode.workspace.getConfiguration('dustirc');
}

function getConnectionDefaults() {
	const config = getConfig();
	return {
		host: config.get<string>('connection.defaultHost', ''),
		port: config.get<number>('connection.defaultPort', 6697),
		nickname: config.get<string>('connection.defaultNickname', ''),
		username: config.get<string>('connection.defaultUsername', ''),
		timeout: config.get<number>('connection.timeout', 10000),
		forceTLS: config.get<boolean>('connection.forceTLS', false)
	};
}

function getReconnectSettings() {
	const config = getConfig();
	return {
		maxAttempts: config.get<number>('reconnect.maxAttempts', 5),
		delay: config.get<number>('reconnect.delay', 5000)
	};
}

function getUISettings() {
	const config = getConfig();
	return {
		showInStatusBar: config.get<boolean>('ui.showInStatusBar', true),
		createOutputChannels: config.get<boolean>('ui.createOutputChannels', true),
		autoOpenOutput: config.get<boolean>('ui.autoOpenOutput', true),
		useWebview: config.get<boolean>('ui.useWebview', true)
	};
}

function getMessagingSettings() {
	const config = getConfig();
	return {
		logToFile: config.get<boolean>('messaging.logToFile', true),
		sendRateLimit: config.get<number>('messaging.sendRateLimit', 200)
	};
}

function getAutoJoinChannels(): string[] {
	const config = getConfig();
	return config.get<string[]>('channels.autoJoin', []);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dustirc" is now active!');

	const connection = new IrcConnection();

	// Main output channel for server messages, notices, and general IRC events
	const output = vscode.window.createOutputChannel('Dust IRC');

	// Map to track output channels for individual rooms/channels
	const channelOutputs = new Map<string, vscode.OutputChannel>();

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;


	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBar.text = 'Dust: disconnected';
	// Show status bar based on settings
	const uiSettings = getUISettings();
	if (uiSettings.showInStatusBar) {
		statusBar.show();
	}

	// Rooms side panel (guarded so tests running in Node won't fail)
	const roomsProvider = new RoomsProvider(connection);
	if (typeof vscode.window.registerTreeDataProvider === 'function') {
		vscode.window.registerTreeDataProvider('dustirc.rooms', roomsProvider);
	}

	const openRoomDisposable = vscode.commands.registerCommand('dustirc.openRoom', async (room?: string) => {
		if (!room) { return; }

		// Set this room as the current channel for messaging
		connection.setCurrentChannel(room);

		// Update status bar to reflect the new current channel
		statusBar.text = `Dust: ${room}`;

		// Refresh rooms panel to show current channel indicator
		roomsProvider.refresh();

		// Show the specific channel's output if it exists, otherwise show main output
		const channelOutput = channelOutputs.get(room);
		if (channelOutput) {
			channelOutput.show(true);
		} else {
			output.show(true);
			output.appendLine(`Opened room: ${room} (no messages yet)`);
		}

		// Provide user feedback
		vscode.window.showInformationMessage(`Switched to ${room} - messages will now be sent here`);
	});

	context.subscriptions.push(openRoomDisposable);

	// Helper function to get or create channel-specific output channel
	const getOrCreateChannelOutput = (channel: string): vscode.OutputChannel => {
		console.log('[DEBUG] getOrCreateChannelOutput called for:', channel);
		const uiSettings = getUISettings();
		if (!uiSettings.createOutputChannels) {
			console.log('[DEBUG] createOutputChannels disabled, returning main output');
			// Return main output if separate channel outputs are disabled
			return output;
		}

		let channelOutput = channelOutputs.get(channel);
		if (!channelOutput) {
			console.log('[DEBUG] Creating new output channel for:', channel);
			channelOutput = vscode.window.createOutputChannel(`Dust IRC: ${channel}`);
			channelOutputs.set(channel, channelOutput);
		} else {
			console.log('[DEBUG] Reusing existing output channel for:', channel);
		}
		return channelOutput;
	};

	// Debug: Log ALL raw IRC lines from server
	connection.on('raw', (line: string) => {
		if (line.includes('PRIVMSG')) {
			console.log('[DEBUG] RAW PRIVMSG LINE:', line);
		}
	});

	// Automatically respond to server PINGs with PONG
	connection.on('ping', (m: IrcMessage) => {
		const server = m.params[0] || m.trailing || '';
		console.log('[DEBUG] Received PING from server, responding with PONG:', server);
		connection.enqueueRaw(`PONG :${server}`);
	});

	connection.on('disconnect', () => {
		const uiSettings = getUISettings();
		if (uiSettings.showInStatusBar) {
			statusBar.text = 'Dust: disconnected';
		}
		roomsProvider.clear();

		// Clean up all channel output channels
		for (const [channel, channelOutput] of channelOutputs) {
			channelOutput.dispose();
		}
		channelOutputs.clear();

		// Auto-reconnect if enabled in settings
		const config = getConfig();
		const auto = config.get<boolean>('autoReconnect', true);
		if (auto) {
			const reconnectSettings = getReconnectSettings();
			// Implement retry logic with delay and max attempts
			let attempts = 0;
			const attemptReconnect = () => {
				if (reconnectSettings.maxAttempts > 0 && attempts >= reconnectSettings.maxAttempts) {
					vscode.window.showWarningMessage(`Couldn't reconnect after ${attempts} attempts`);
					return;
				}
				attempts++;
				setTimeout(() => {
					connection.reconnect().then((ok) => {
						if (ok) {
							vscode.window.showInformationMessage(`Reconnected (auto, attempt ${attempts})`);
							attempts = 0; // Reset on successful reconnect
						} else {
							attemptReconnect(); // Try again
						}
					}).catch(() => {
						attemptReconnect(); // Try again on error
					});
				}, reconnectSettings.delay);
			};
			attemptReconnect();
		}
	});





	// Listen for configuration changes so users can toggle autoReconnect
	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration && (e.affectsConfiguration('dustirc.autoReconnect'))) {
			// no-op for now; behavior reads configuration on disconnect
		}
	});

	// Handle our own sent messages (immediate feedback)
	connection.on('message', (m: any) => {
		const target = m.target || 'unknown';
		const nick = m.from || 'me';
		console.log('[DEBUG] Own message event:', { target, from: nick, text: m.text });

		const uiSettings = getUISettings();
		// Route to appropriate output channel
		if (target.startsWith('#')) {
			// Channel message - route to channel-specific output
			const channelOutput = getOrCreateChannelOutput(target);
			channelOutput.appendLine(`${nick}: ${m.text}`);

			// Auto-open output if enabled
			if (uiSettings.autoOpenOutput) {
				channelOutput.show(true);
			}
		} else {
			// Private message - route to main output
			output.appendLine(`[SENT] ${nick} → ${target}: ${m.text}`);

			if (uiSettings.autoOpenOutput) {
				output.show(true);
			}
		}
	});

	// Handle incoming messages from IRC (from others)
	connection.on('privmsg', (m: IrcMessage) => {
		const target = m.params[0] ?? '';
		const nick = m.from || m.prefix?.split('!')[0] || 'unknown';
		console.log('[DEBUG] PRIVMSG event received:', { target, from: nick, message: m.trailing, params: m.params, prefix: m.prefix });

		const uiSettings = getUISettings();
		console.log('[DEBUG] UI Settings:', { createOutputChannels: uiSettings.createOutputChannels, autoOpenOutput: uiSettings.autoOpenOutput });

		// Route to appropriate output channel
		if (target.startsWith('#')) {
			// Channel message - route to channel-specific output
			console.log('[DEBUG] Routing to channel-specific output for:', target);
			const channelOutput = getOrCreateChannelOutput(target);
			console.log('[DEBUG] Got output channel, appending message');
			channelOutput.appendLine(`${nick}: ${m.trailing}`);

			// Auto-open output if enabled
			if (uiSettings.autoOpenOutput) {
				channelOutput.show(true);
			}
		} else {
			// Private message - route to main output with special formatting
			output.appendLine(`[PRIVATE] ${nick}: ${m.trailing}`);

			// Auto-open output if enabled
			if (uiSettings.autoOpenOutput) {
				output.show(true);
			}
		}
	});

	connection.on('join', (m: IrcMessage) => {
		const target = m.params[0] ?? '';
		const nick = m.from || m.prefix?.split('!')[0] || 'unknown';

		// Log join event to main output and channel-specific output
		const joinMessage = `${nick} joined ${target}`;
		output.appendLine(joinMessage);

		// Also log to the channel-specific output if it's a channel
		if (target.startsWith('#')) {
			const channelOutput = getOrCreateChannelOutput(target);
			channelOutput.appendLine(joinMessage);
		}

		roomsProvider.addRoom(target);

		// Update status bar if it was us who joined
		if (nick === connection.getInfo().nick) {
			const uiSettings = getUISettings();
			if (uiSettings.showInStatusBar) {
				statusBar.text = `Dust: ${target}`;
			}
			// Refresh rooms panel to update current channel indicator
			roomsProvider.refresh();
		}
	});

	connection.on('part', (m: IrcMessage) => {
		const target = m.params[0] ?? '';
		const nick = m.from || m.prefix?.split('!')[0] || 'unknown';

		// Log part event to main output and channel-specific output
		const partMessage = `${nick} left ${target}`;
		output.appendLine(partMessage);

		// Also log to the channel-specific output if it's a channel
		if (target.startsWith('#')) {
			const channelOutput = channelOutputs.get(target);
			if (channelOutput) {
				channelOutput.appendLine(partMessage);

				// Clean up channel output if we left the channel
				if (nick === connection.getInfo().nick) {
					channelOutput.dispose();
					channelOutputs.delete(target);
				}
			}
		}

		roomsProvider.removeRoom(target);

		// Update status bar if it was us who left
		if (nick === connection.getInfo().nick) {
			const currentChannel = connection.getCurrentChannel();
			if (currentChannel) {
				statusBar.text = `Dust: ${currentChannel}`;
			} else {
				statusBar.text = 'Dust: connected';
			}
			// Refresh rooms panel to update current channel indicator
			roomsProvider.refresh();
		}
	});

	connection.on('connect', () => {
		// Update status bar
		const uiSettings = getUISettings();
		if (uiSettings.showInStatusBar) {
			statusBar.text = 'Dust: connected';
		}

		// Open webview chat panel if enabled
		if (uiSettings.useWebview) {
			ChatPanel.createOrShow(context.extensionUri, connection);
		}

		// Clear state from previous connection
		roomsProvider.clear();
		for (const [channel, channelOutput] of channelOutputs) {
			channelOutput.dispose();
		}
		channelOutputs.clear();

		// Auto-join channels after connection
		const autoJoinChannels = getAutoJoinChannels();
		if (autoJoinChannels.length > 0) {
			// Limit auto-join to prevent server flooding
			const safeChannels = autoJoinChannels.slice(0, 10); // Max 10 auto-join channels
			if (autoJoinChannels.length > 10) {
				output.appendLine(`Warning: Limited auto-join to first 10 channels (${autoJoinChannels.length} configured)`);
			}

			// Stagger joins to prevent burst
			let delay = 2000; // Start after 2 seconds
			safeChannels.forEach((channel, index) => {
				setTimeout(() => {
					try {
						connection.sendJoin(channel);
						output.appendLine(`Auto-joining ${channel}`);
					} catch (err: any) {
						output.appendLine(`Failed to auto-join ${channel}: ${err?.message ?? err}`);
					}
				}, delay + (index * 1000)); // 1 second between each join
			});
		}
	});

	connection.on('notice', (m: IrcMessage) => {
		output.appendLine(`[NOTICE] ${m.from}: ${m.trailing}`);
	});

	connection.on('numeric', (m: IrcMessage) => {
		output.appendLine(`[${m.numeric}] ${m.trailing ?? ''}`);
	});

	const connectDisposable = vscode.commands.registerCommand('dustirc.connect', async () => {
		const defaults = getConnectionDefaults();

		const host = await vscode.window.showInputBox({
			prompt: 'Enter IRC server address',
			placeHolder: 'irc.libera.chat',
			value: defaults.host,
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Please enter a server address';
				}
				if (value.includes(' ') || /[\r\n\t]/.test(value)) {
					return 'Server address cannot contain spaces';
				}
				return null;
			}
		});
		if (!host) {
			vscode.window.showInformationMessage('Connection cancelled');
			return;
		}

		const portInput = await vscode.window.showInputBox({
			prompt: 'Port (6697 for TLS, 6667 for plain)',
			placeHolder: defaults.port.toString(),
			value: defaults.port.toString(),
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value) { return null; } // Allow empty for default
				const port = parseInt(value, 10);
				if (isNaN(port) || port < 1 || port > 65535) {
					return 'Please enter a valid port number';
				}
				return null;
			}
		});
		const port = portInput ? Math.max(1, Math.min(65535, parseInt(portInput, 10))) : defaults.port;

		const nick = await vscode.window.showInputBox({
			prompt: 'Choose your nickname',
			placeHolder: 'mynick',
			value: defaults.nickname || 'dust',
			ignoreFocusOut: true
		});

		const user = await vscode.window.showInputBox({
			prompt: 'Username (usually same as nickname)',
			placeHolder: nick || 'myusername',
			value: defaults.username || nick || 'dust',
			ignoreFocusOut: true
		});

		// Optional: Ask for NickServ password (leave blank if not registered)
		const nickServPassword = await vscode.window.showInputBox({
			prompt: 'NickServ password (leave blank if not registered)',
			placeHolder: 'Leave blank to skip',
			password: true,
			ignoreFocusOut: true
		});

		try {
			// Use real network connections with auto-registration
			const useTls = defaults.forceTLS || port === 6697 || port === 6670; // Common SSL ports or force TLS
			await connection.connect(host, port, nick || 'dust', {
				real: true,
				tls: useTls,
				autoRegister: true,
				user: user || nick || 'dust',
				realname: `Dust IRC User`,
				timeout: defaults.timeout,
				rateLimitMs: getMessagingSettings().sendRateLimit
			});

			// Auto-identify with NickServ if password was provided
			if (nickServPassword) {
				// Small delay to ensure connection is fully established
				setTimeout(() => {
					try {
						connection.sendIdentify(nickServPassword);
						output.appendLine('Sent IDENTIFY to NickServ');
					} catch (err: any) {
						output.appendLine(`Auto-identify failed: ${err?.message ?? err}`);
					}
				}, 2000);
			}

			vscode.window.showInformationMessage(`Connected to ${host}:${port} as ${nick}${useTls ? ' (TLS)' : ''}`);
		} catch (err: any) {
			// Sanitize error messages to prevent information leakage
			const errorMsg = err?.message?.includes('connect') || err?.message?.includes('timeout')
				? 'Connection failed. Please check host and port settings.'
				: 'Connection failed. Please try again.';
			vscode.window.showErrorMessage(errorMsg);
		}
	});

	const sayDisposable = vscode.commands.registerCommand('dustirc.say', async () => {
		const currentChannel = connection.getCurrentChannel();
		const joinedChannels = connection.getJoinedChannels();

		if (joinedChannels.length === 0) {
			vscode.window.showWarningMessage('Not joined to any channels. Use "Dust: Join Channel" first.');
			return;
		}

		const text = await vscode.window.showInputBox({
			prompt: currentChannel ? `Send message to ${currentChannel}` : 'Send message',
			placeHolder: 'Type your message...',
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value) { return null; } // Allow empty to cancel
				if (value.length > 450) {
					return 'Message is too long';
				}
				return null;
			}
		});
		if (!text) { return; }
		try {
			connection.sendMessage(text);
			// Log outgoing message to workspace if enabled
			const messagingSettings = getMessagingSettings();
			if (messagingSettings.logToFile) {
				import('./logging.js').then((m) => m.appendOutgoingMessage(workspaceRoot, text));
			}
		} catch (err: any) {
			vscode.window.showErrorMessage(`Send failed: ${err?.message ?? err}`);
		}
	});

	const sayToDisposable = vscode.commands.registerCommand('dustirc.sayTo', async () => {
		const joinedChannels = connection.getJoinedChannels();

		if (joinedChannels.length === 0) {
			vscode.window.showWarningMessage('Join a channel first to send messages');
			return;
		}

		// Let user pick which channel to send to
		const targetChannel = await vscode.window.showQuickPick(joinedChannels, {
			placeHolder: 'Choose a channel',
			ignoreFocusOut: true
		});

		if (!targetChannel) { return; }

		const text = await vscode.window.showInputBox({
			prompt: `Send to ${targetChannel}`,
			placeHolder: 'Type your message...',
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value) { return null; } // Allow empty to cancel
				if (value.length > 450) {
					return 'Message is too long';
				}
				return null;
			}
		});

		if (!text) { return; }

		try {
			connection.sendMessage(text, targetChannel);
			// Log outgoing message to workspace if enabled
			const messagingSettings = getMessagingSettings();
			if (messagingSettings.logToFile) {
				import('./logging.js').then((m) => m.appendOutgoingMessage(workspaceRoot, text));
			}
		} catch (err: any) {
			vscode.window.showErrorMessage('Failed to send message. Please check your connection.');
		}
	});

	const joinDisposable = vscode.commands.registerCommand('dustirc.join', async () => {
		const channel = await vscode.window.showInputBox({
			prompt: 'Join a channel',
			placeHolder: '#channel-name',
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value) { return null; } // Allow empty to cancel
				if (value.includes(' ') || /[\r\n\t\x00]/.test(value)) {
					return 'Channel name cannot contain spaces';
				}
				if (value.length > 50) {
					return 'Channel name is too long';
				}
				return null;
			}
		});
		if (!channel) { return; }
		try {
			connection.sendJoin(channel);
			vscode.window.showInformationMessage(`Joining ${channel}...`);
		} catch (err: any) {
			vscode.window.showErrorMessage('Failed to join channel. Please check the channel name and try again.');
		}
	});

	const partDisposable = vscode.commands.registerCommand('dustirc.part', async () => {
		const currentChannel = connection.getCurrentChannel();
		const joinedChannels = connection.getJoinedChannels();

		let channelToLeave: string | undefined;

		if (joinedChannels.length === 0) {
			vscode.window.showWarningMessage('You haven\'t joined any channels yet');
			return;
		} else if (joinedChannels.length === 1) {
			channelToLeave = joinedChannels[0];
		} else {
			// Show quick pick if multiple channels
			channelToLeave = await vscode.window.showQuickPick(joinedChannels, {
				placeHolder: currentChannel ? `Leave channel (current: ${currentChannel})` : 'Select channel to leave'
			});
		}

		if (!channelToLeave) { return; }

		try {
			connection.sendPart(channelToLeave);
			vscode.window.showInformationMessage(`Left ${channelToLeave}`);
		} catch (err: any) {
			vscode.window.showErrorMessage(`Part failed: ${err?.message ?? err}`);
		}
	});

	const openChatDisposable = vscode.commands.registerCommand('dustirc.openChat', () => {
		ChatPanel.createOrShow(context.extensionUri, connection);
	});

	const pingDisposable = vscode.commands.registerCommand('dustirc.ping', async () => {
		try {
			const rtt = await connection.ping();
			vscode.window.showInformationMessage(`Ping RTT: ${rtt}ms`);
		} catch (err: any) {
			vscode.window.showErrorMessage(`Ping failed: ${err?.message ?? err}`);
		}
	});

	const reconnectDisposable = vscode.commands.registerCommand('dustirc.reconnect', async () => {
		try {
			const ok = await connection.reconnect();
			if (ok) { vscode.window.showInformationMessage('Reconnected'); }
			else { vscode.window.showWarningMessage('Couldn\'t reconnect to server'); }
		} catch (err: any) {
			vscode.window.showErrorMessage(`Reconnect failed: ${err?.message ?? err}`);
		}
	});

	const disconnectDisposable = vscode.commands.registerCommand('dustirc.disconnect', () => {
		try {
			connection.disconnect();
			vscode.window.showInformationMessage('Disconnected from IRC');
		} catch (err: any) {
			vscode.window.showErrorMessage(`Disconnect failed: ${err?.message ?? err}`);
		}
	});

	const identifyDisposable = vscode.commands.registerCommand('dustirc.identify', async () => {
		const password = await vscode.window.showInputBox({
			prompt: 'Authenticate with NickServ',
			placeHolder: 'Password',
			password: true,
			ignoreFocusOut: true
		});
		if (!password) {
			vscode.window.showInformationMessage('Identify cancelled');
			return;
		}
		try {
			connection.sendIdentify(password);
			vscode.window.showInformationMessage('Sent IDENTIFY to NickServ');
		} catch (err: any) {
			vscode.window.showErrorMessage(`Identify failed: ${err?.message ?? err}`);
		}
	});

	const openOutputDisposable = vscode.commands.registerCommand('dustirc.openOutput', () => {
		output.show(true);
	});

	context.subscriptions.push(connectDisposable);
	context.subscriptions.push(sayDisposable);
	context.subscriptions.push(sayToDisposable);
	context.subscriptions.push(openChatDisposable);
	context.subscriptions.push(joinDisposable);
	context.subscriptions.push(partDisposable);
	context.subscriptions.push(pingDisposable);
	context.subscriptions.push(reconnectDisposable);
	context.subscriptions.push(disconnectDisposable);
	context.subscriptions.push(identifyDisposable);
	context.subscriptions.push(openOutputDisposable);

	// Add cleanup for output channels on extension deactivation
	context.subscriptions.push({
		dispose: () => {
			output.dispose();
			for (const [channel, channelOutput] of channelOutputs) {
				channelOutput.dispose();
			}
			channelOutputs.clear();
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Extension cleanup is handled via context.subscriptions
	// All output channels and disposables are automatically cleaned up
}
