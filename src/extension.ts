// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IrcConnection } from './irc/connection';
import type { IrcMessage } from './irc/types';
import { RoomsProvider } from './views/roomsProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dustirc" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('dustirc.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from dust!');
	});

	const connection = new IrcConnection();

	// Main output channel for server messages, notices, and general IRC events
	const output = vscode.window.createOutputChannel('Dust IRC');

	// Map to track output channels for individual rooms/channels
	const channelOutputs = new Map<string, vscode.OutputChannel>();

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;


	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBar.text = 'Dust: disconnected';
	statusBar.show();

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
		let channelOutput = channelOutputs.get(channel);
		if (!channelOutput) {
			channelOutput = vscode.window.createOutputChannel(`Dust IRC: ${channel}`);
			channelOutputs.set(channel, channelOutput);
		}
		return channelOutput;
	};

	connection.on('connect', () => {
		statusBar.text = 'Dust: connected';
	});

	connection.on('disconnect', () => {
		statusBar.text = 'Dust: disconnected';
		roomsProvider.clear();

		// Clean up all channel output channels
		for (const [channel, channelOutput] of channelOutputs) {
			channelOutput.dispose();
		}
		channelOutputs.clear();

		// Auto-reconnect if enabled in settings
		const cfg = vscode.workspace.getConfiguration();
		const auto = !!cfg.get('dustirc.autoReconnect');
		if (auto) {
			// fire-and-forget
			connection.reconnect().then((ok) => {
				if (ok) { vscode.window.showInformationMessage('Reconnected (auto)'); }
			}).catch(() => { });
		}
	});

	// Update status bar when joining/leaving channels
	connection.on('join', (m: IrcMessage) => {
		if (m.from === connection.getInfo().nick) {
			const channel = m.params[0];
			statusBar.text = `Dust: ${channel}`;
			// Refresh rooms panel to update current channel indicator
			roomsProvider.refresh();
		}
	});

	connection.on('part', (m: IrcMessage) => {
		if (m.from === connection.getInfo().nick) {
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

	// Listen for configuration changes so users can toggle autoReconnect
	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration && (e.affectsConfiguration('dustirc.autoReconnect'))) {
			// no-op for now; behavior reads configuration on disconnect
		}
	});

	// Handle your own sent messages (immediate feedback)
	connection.on('message', (m: any) => {
		console.log('[DEBUG] Legacy message event:', m);
		const target = m.target || 'unknown';

		// Route to appropriate output channel
		if (target.startsWith('#')) {
			// Channel message - route to channel-specific output
			const channelOutput = getOrCreateChannelOutput(target);
			channelOutput.appendLine(`${m.from}: ${m.text}`);
		} else {
			// Private message or unknown target - route to main output
			output.appendLine(`[${target}] ${m.from}: ${m.text}`);
		}
	});

	// Handle incoming messages from others
	connection.on('privmsg', (m: IrcMessage) => {
		const target = m.params[0] ?? '';
		console.log('[DEBUG] PRIVMSG event:', { target, from: m.from, message: m.trailing });

		// Route to appropriate output channel
		if (target.startsWith('#')) {
			// Channel message - route to channel-specific output
			const channelOutput = getOrCreateChannelOutput(target);
			channelOutput.appendLine(`${m.from}: ${m.trailing}`);
		} else {
			// Private message - route to main output with special formatting
			output.appendLine(`[PRIVATE] ${m.from}: ${m.trailing}`);
		}
	});

	connection.on('join', (m: IrcMessage) => {
		const target = m.params[0] ?? '';

		// Log join event to main output and channel-specific output
		const joinMessage = `${m.from} joined ${target}`;
		output.appendLine(joinMessage);

		// Also log to the channel-specific output if it's a channel
		if (target.startsWith('#')) {
			const channelOutput = getOrCreateChannelOutput(target);
			channelOutput.appendLine(joinMessage);
		}

		roomsProvider.addRoom(target);
	});

	connection.on('part', (m: IrcMessage) => {
		const target = m.params[0] ?? '';

		// Log part event to main output and channel-specific output
		const partMessage = `${m.from} left ${target}`;
		output.appendLine(partMessage);

		// Also log to the channel-specific output if it's a channel
		if (target.startsWith('#')) {
			const channelOutput = channelOutputs.get(target);
			if (channelOutput) {
				channelOutput.appendLine(partMessage);

				// Clean up channel output if we left the channel
				if (m.from === connection.getInfo().nick) {
					channelOutput.dispose();
					channelOutputs.delete(target);
				}
			}
		}

		roomsProvider.removeRoom(target);
	});

	connection.on('connect', () => {
		roomsProvider.clear();
		// Clear all channel outputs on new connection
		for (const [channel, channelOutput] of channelOutputs) {
			channelOutput.dispose();
		}
		channelOutputs.clear();
	});

	connection.on('notice', (m: IrcMessage) => {
		output.appendLine(`[NOTICE] ${m.from}: ${m.trailing}`);
	});

	connection.on('numeric', (m: IrcMessage) => {
		output.appendLine(`[${m.numeric}] ${m.trailing ?? ''}`);
	});

	const connectDisposable = vscode.commands.registerCommand('dustirc.connect', async () => {
		const host = await vscode.window.showInputBox({ prompt: 'IRC host', placeHolder: 'irc.example.com' });
		if (!host) {
			vscode.window.showInformationMessage('Connection cancelled');
			return;
		}
		const portInput = await vscode.window.showInputBox({ prompt: 'Port', value: '6667' });
		const port = portInput ? parseInt(portInput, 10) : 6667;
		const nick = await vscode.window.showInputBox({ prompt: 'Nickname', value: 'dust' });
		const user = await vscode.window.showInputBox({ prompt: 'Username', value: nick || 'dust' });

		// Optional: Ask for NickServ password for registered nicks
		const needsPassword = await vscode.window.showQuickPick(
			['No', 'Yes'],
			{
				placeHolder: 'Is this a registered nickname that needs NickServ authentication?',
				ignoreFocusOut: true
			}
		);

		let nickServPassword: string | undefined;
		if (needsPassword === 'Yes') {
			nickServPassword = await vscode.window.showInputBox({
				prompt: 'NickServ password',
				placeHolder: 'Enter your registered nickname password',
				password: true
			});
			if (nickServPassword === undefined) {
				vscode.window.showInformationMessage('Connection cancelled');
				return;
			}
		}

		try {
			// Use real network connections with auto-registration
			const useTls = port === 6697 || port === 6670; // Common SSL ports
			await connection.connect(host, port, nick || 'dust', {
				real: true,
				tls: useTls,
				autoRegister: true,
				user: user || nick || 'dust',
				realname: `Dust IRC User`
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
			vscode.window.showErrorMessage(`Connection failed: ${err?.message ?? err}`);
		}
	});

	const sayDisposable = vscode.commands.registerCommand('dustirc.say', async () => {
		const currentChannel = connection.getCurrentChannel();
		const joinedChannels = connection.getJoinedChannels();

		if (joinedChannels.length === 0) {
			vscode.window.showWarningMessage('Not joined to any channels. Use "Dust: Join Channel" first.');
			return;
		}

		const promptText = currentChannel
			? `Message to send to ${currentChannel}`
			: 'Message to send (no current channel)';

		const text = await vscode.window.showInputBox({ prompt: promptText });
		if (!text) { return; }
		try {
			connection.sendMessage(text);
			// Log outgoing message to workspace
			import('./logging.js').then((m) => m.appendOutgoingMessage(workspaceRoot, text));
		} catch (err: any) {
			vscode.window.showErrorMessage(`Send failed: ${err?.message ?? err}`);
		}
	});

	const sayToDisposable = vscode.commands.registerCommand('dustirc.sayTo', async () => {
		const joinedChannels = connection.getJoinedChannels();

		if (joinedChannels.length === 0) {
			vscode.window.showWarningMessage('Not joined to any channels. Use "Dust: Join Channel" first.');
			return;
		}

		// Let user pick which channel to send to
		const targetChannel = await vscode.window.showQuickPick(joinedChannels, {
			placeHolder: 'Select channel to send message to',
			ignoreFocusOut: true
		});

		if (!targetChannel) { return; }

		const text = await vscode.window.showInputBox({
			prompt: `Message to send to ${targetChannel}`,
			ignoreFocusOut: true
		});

		if (!text) { return; }

		try {
			connection.sendMessage(text, targetChannel);
			// Log outgoing message to workspace
			import('./logging.js').then((m) => m.appendOutgoingMessage(workspaceRoot, text));
		} catch (err: any) {
			vscode.window.showErrorMessage(`Send failed: ${err?.message ?? err}`);
		}
	});

	const joinDisposable = vscode.commands.registerCommand('dustirc.join', async () => {
		const channel = await vscode.window.showInputBox({
			prompt: 'Channel to join',
			placeHolder: '#example'
		});
		if (!channel) { return; }
		try {
			connection.sendJoin(channel);
			vscode.window.showInformationMessage(`Joining ${channel}...`);
		} catch (err: any) {
			vscode.window.showErrorMessage(`Join failed: ${err?.message ?? err}`);
		}
	});

	const partDisposable = vscode.commands.registerCommand('dustirc.part', async () => {
		const currentChannel = connection.getCurrentChannel();
		const joinedChannels = connection.getJoinedChannels();

		let channelToLeave: string | undefined;

		if (joinedChannels.length === 0) {
			vscode.window.showWarningMessage('Not joined to any channels');
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
			else { vscode.window.showWarningMessage('Reconnect failed'); }
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
			prompt: 'NickServ password',
			placeHolder: 'Enter your registered nickname password',
			password: true
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
	context.subscriptions.push(joinDisposable);
	context.subscriptions.push(partDisposable);
	context.subscriptions.push(pingDisposable);
	context.subscriptions.push(reconnectDisposable);
	context.subscriptions.push(disconnectDisposable);
	context.subscriptions.push(identifyDisposable);
	context.subscriptions.push(openOutputDisposable);
	context.subscriptions.push(disposable);

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
