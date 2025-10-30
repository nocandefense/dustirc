// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IrcConnection } from './irc/connection';
import type { IrcMessage } from './irc/types';

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

	const output = vscode.window.createOutputChannel('Dust IRC');

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;


	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBar.text = 'Dust: disconnected';
	statusBar.show();

	connection.on('connect', () => {
		statusBar.text = 'Dust: connected';
	});

	connection.on('disconnect', () => {
		statusBar.text = 'Dust: disconnected';

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

	// Listen for configuration changes so users can toggle autoReconnect
	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration && (e.affectsConfiguration('dustirc.autoReconnect'))) {
			// no-op for now; behavior reads configuration on disconnect
		}
	});

	// legacy message event (immediate UI feedback)
	connection.on('message', (m: any) => {
		output.appendLine(`${m.from}: ${m.text}`);
	});

	// typed events from the new IRC core
	connection.on('privmsg', (m: IrcMessage) => {
		const target = m.params[0] ?? '';
		output.appendLine(`[${target}] ${m.from}: ${m.trailing}`);
	});

	connection.on('join', (m: IrcMessage) => {
		const target = m.params[0] ?? '';
		output.appendLine(`${m.from} joined ${target}`);
	});

	connection.on('part', (m: IrcMessage) => {
		const target = m.params[0] ?? '';
		output.appendLine(`${m.from} left ${target}`);
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

		try {
			await connection.connect(host, port, nick || 'dust');
			vscode.window.showInformationMessage(`Connected to ${host}:${port} as ${nick}`);
		} catch (err: any) {
			vscode.window.showErrorMessage(`Connection failed: ${err?.message ?? err}`);
		}
	});

	const sayDisposable = vscode.commands.registerCommand('dustirc.say', async () => {
		const text = await vscode.window.showInputBox({ prompt: 'Message to send' });
		if (!text) { return; }
		try {
			connection.sendMessage(text);
			// Log outgoing message to workspace
			import('./logging.js').then((m) => m.appendOutgoingMessage(workspaceRoot, text));
		} catch (err: any) {
			vscode.window.showErrorMessage(`Send failed: ${err?.message ?? err}`);
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

	const openOutputDisposable = vscode.commands.registerCommand('dustirc.openOutput', () => {
		output.show(true);
	});

	context.subscriptions.push(connectDisposable);
	context.subscriptions.push(sayDisposable);
	context.subscriptions.push(pingDisposable);
	context.subscriptions.push(reconnectDisposable);
	context.subscriptions.push(openOutputDisposable);

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
