// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IrcConnection } from './irc/connection';

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

	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBar.text = 'Dust: disconnected';
	statusBar.show();

	connection.on('connect', () => {
		statusBar.text = 'Dust: connected';
	});

	connection.on('disconnect', () => {
		statusBar.text = 'Dust: disconnected';
	});

	connection.on('message', (m: any) => {
		output.appendLine(`${m.from}: ${m.text}`);
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
		} catch (err: any) {
			vscode.window.showErrorMessage(`Send failed: ${err?.message ?? err}`);
		}
	});

	const openOutputDisposable = vscode.commands.registerCommand('dustirc.openOutput', () => {
		output.show(true);
	});

	context.subscriptions.push(connectDisposable);
	context.subscriptions.push(sayDisposable);
	context.subscriptions.push(openOutputDisposable);

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
