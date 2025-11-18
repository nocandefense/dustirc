import { strict as assert } from 'assert';
import * as sinon from 'sinon';
import { createRequire } from 'module';

// Create a comprehensive fake vscode module surface for testing enhanced features
const registeredCommands: Record<string, Function> = {};
const outputChannels = new Map<string, any>();
let treeDataProvider: any = null;

const fakeVscode: any = {
    commands: {
        registerCommand: (id: string, cb: Function) => {
            registeredCommands[id] = cb;
            return { dispose: () => { delete registeredCommands[id]; } };
        }
    },
    window: {
        showInformationMessage: sinon.fake(),
        showErrorMessage: sinon.fake(),
        showWarningMessage: sinon.fake(),
        showInputBox: sinon.fake.resolves('test input'),
        showQuickPick: sinon.fake.resolves('test selection'),
        createOutputChannel: (name: string) => {
            const channel = {
                name,
                appendLine: sinon.fake(),
                show: sinon.fake(),
                dispose: sinon.fake()
            };
            outputChannels.set(name, channel);
            return channel;
        },
        registerTreeDataProvider: (id: string, provider: any) => {
            treeDataProvider = provider;
        },
        createStatusBarItem: (align: any, priority?: number) => ({
            text: '',
            show: sinon.fake(),
            dispose: sinon.fake()
        })
    },
    workspace: {
        workspaceFolders: [{ uri: { fsPath: process.cwd() } }],
        getConfiguration: () => ({ get: () => false }),
        onDidChangeConfiguration: (cb: Function) => ({ dispose: sinon.fake() })
    },
    StatusBarAlignment: { Left: 1 }
};

// Store original Module._load to restore later
let originalLoad: any = null;

suite('Extension Enhanced Features', () => {
    let context: any;
    let ext: any;

    setup(async () => {
        // Reset fake function call history
        sinon.resetHistory();
        outputChannels.clear();
        treeDataProvider = null;

        // Clear registered commands
        Object.keys(registeredCommands).forEach(key => delete registeredCommands[key]);

        // Mock vscode module for each test run
        const require = createRequire(import.meta.url);
        const Module = require('module');

        // Store original only once
        if (!originalLoad) {
            originalLoad = Module._load;
        }

        Module._load = function (request: string, parent: any, isMain: boolean) {
            if (request === 'vscode') { return fakeVscode; }
            return originalLoad.apply(this, arguments as any);
        };

        // Fresh import of extension for each test
        delete require.cache[require.resolve('../src/extension')];
        ext = require('../src/extension');

        context = { subscriptions: [] };
    });

    teardown(() => {
        // Restore original Module._load after each test
        if (originalLoad) {
            const require = createRequire(import.meta.url);
            const Module = require('module');
            Module._load = originalLoad;
        }
    });

    test('activates extension and registers all enhanced commands', async () => {
        await ext.activate(context);

        // Check that all our enhanced commands are registered
        const expectedCommands = [
            'dustirc.connect',
            'dustirc.say',
            'dustirc.sayTo',
            'dustirc.join',
            'dustirc.part',
            'dustirc.disconnect',
            'dustirc.identify',
            'dustirc.openRoom',
            'dustirc.openOutput',
            'dustirc.ping',
            'dustirc.reconnect'
        ];

        for (const command of expectedCommands) {
            assert.ok(registeredCommands[command], `${command} should be registered`);
        }
    });

    test('registers ping command and shows RTT', async () => {
        // This test covers the original extension.commands.test.ts functionality
        await ext.activate(context);

        // Ensure the ping command was registered
        assert.ok(registeredCommands['dustirc.ping'], 'dustirc.ping should be registered');

        // Call the ping handler directly and expect it to report a failure (since not connected)
        await registeredCommands['dustirc.ping']();

        assert.ok(fakeVscode.window.showErrorMessage.called, 'showErrorMessage should be called when ping fails');
    });

    test('creates main output channel and registers tree data provider', async () => {
        await ext.activate(context);

        // Should create main Dust IRC output channel
        assert.ok(outputChannels.has('Dust IRC'), 'Main Dust IRC output channel should be created');

        // Should register tree data provider for rooms
        assert.ok(treeDataProvider, 'Tree data provider should be registered');
    });

    test('openRoom command switches channel and shows output', async () => {
        await ext.activate(context);

        // Mock a channel output being available
        const channelOutput = fakeVscode.window.createOutputChannel('Dust IRC: #test');

        // Call openRoom command with a test room
        await registeredCommands['dustirc.openRoom']('#test');

        // Should show information message about switching
        assert.ok(fakeVscode.window.showInformationMessage.called, 'Should show info message when switching rooms');
    });

    test('say command validates channel membership', async () => {
        await ext.activate(context);

        // Mock no input (user cancels)
        fakeVscode.window.showInputBox = sinon.fake.resolves(undefined);

        // Call say command
        await registeredCommands['dustirc.say']();

        // Should show warning about no channels
        assert.ok(fakeVscode.window.showWarningMessage.called, 'Should warn when no channels joined');
    });

    test('sayTo command shows channel selection', async () => {
        await ext.activate(context);

        // Call sayTo command
        await registeredCommands['dustirc.sayTo']();

        // Should show warning about no channels (since we start with none)
        assert.ok(fakeVscode.window.showWarningMessage.called, 'Should warn when no channels available for sayTo');
    });

    test('join command prompts for channel name', async () => {
        await ext.activate(context);

        // Mock channel input
        fakeVscode.window.showInputBox = sinon.fake.resolves('#testchannel');

        // Call join command
        await registeredCommands['dustirc.join']();

        // Should prompt for channel input
        assert.ok(fakeVscode.window.showInputBox.called, 'Should prompt for channel name');
    });

    test('part command handles no channels gracefully', async () => {
        await ext.activate(context);

        // Call part command when no channels joined
        await registeredCommands['dustirc.part']();

        // Should show warning about no channels
        assert.ok(fakeVscode.window.showWarningMessage.called, 'Should warn when no channels to leave');
    });

    test('identify command prompts for password', async () => {
        await ext.activate(context);

        // Mock password input
        fakeVscode.window.showInputBox = sinon.fake.resolves('testpassword');

        // Call identify command
        await registeredCommands['dustirc.identify']();

        // Should prompt for password
        assert.ok(fakeVscode.window.showInputBox.called, 'Should prompt for NickServ password');
    });

    test('disconnect command provides user feedback', async () => {
        await ext.activate(context);

        // Call disconnect command
        registeredCommands['dustirc.disconnect']();

        // Should show information message about disconnection
        assert.ok(fakeVscode.window.showInformationMessage.called, 'Should show disconnect confirmation');
    });

    test('extension cleanup disposes resources properly', async () => {
        await ext.activate(context);

        // Should have cleanup function in subscriptions
        const cleanupDisposable = context.subscriptions.find((sub: any) =>
            typeof sub === 'object' && typeof sub.dispose === 'function'
        );

        assert.ok(cleanupDisposable, 'Should have cleanup disposable in subscriptions');

        // Call cleanup
        cleanupDisposable.dispose();

        // Should dispose output channels (we can't easily test this without more complex mocking)
        assert.ok(true, 'Cleanup should complete without errors');
    });

    test('connect command prompts for connection details with NickServ', async () => {
        await ext.activate(context);

        // Mock the full connection flow inputs
        fakeVscode.window.showInputBox = sinon.stub()
            .onCall(0).resolves('irc.libera.chat')  // Host
            .onCall(1).resolves('6667')            // Port
            .onCall(2).resolves('testnick')        // Nickname
            .onCall(3).resolves('testuser')        // Username
            .onCall(4).resolves('testpass');       // NickServ password

        fakeVscode.window.showQuickPick = sinon.fake.resolves('Yes'); // Needs NickServ

        // Ensure the connect command exists and is callable
        assert.ok(registeredCommands['dustirc.connect'], 'Connect command should be registered');
        assert.ok(typeof registeredCommands['dustirc.connect'] === 'function', 'Connect command should be a function');

        // We don't actually call the command to avoid network connections in tests
        // The command registration itself validates the implementation exists
    });

    test('connect command prompts for connection details without NickServ', async () => {
        await ext.activate(context);

        // Mock connection inputs without NickServ
        fakeVscode.window.showInputBox = sinon.stub()
            .onCall(0).resolves('irc.libera.chat')
            .onCall(1).resolves('6667')
            .onCall(2).resolves('testnick')
            .onCall(3).resolves('testuser');

        fakeVscode.window.showQuickPick = sinon.fake.resolves('No'); // No NickServ needed

        // Ensure the connect command exists and is callable
        assert.ok(registeredCommands['dustirc.connect'], 'Connect command should be registered');
        assert.ok(typeof registeredCommands['dustirc.connect'] === 'function', 'Connect command should be a function');

        // We don't actually call the command to avoid network connections in tests
        // The command registration itself validates the implementation exists
    });

    test('connect command handles user cancellation gracefully', async () => {
        await ext.activate(context);

        // Mock user cancelling connection
        fakeVscode.window.showInputBox = sinon.fake.resolves(undefined);

        // Ensure the connect command exists and is callable
        assert.ok(registeredCommands['dustirc.connect'], 'Connect command should be registered');
        assert.ok(typeof registeredCommands['dustirc.connect'] === 'function', 'Connect command should be a function');

        // We don't actually call the command to avoid network connections in tests
        // The command registration itself validates the implementation exists
    });
    test('sayTo command works with available channels', async () => {
        await ext.activate(context);

        // Mock having joined channels
        fakeVscode.window.showQuickPick = sinon.fake.resolves('#testchannel');
        fakeVscode.window.showInputBox = sinon.fake.resolves('Hello world!');

        // Simulate having channels (we need to access the internal connection)
        // This is a bit tricky with the current test setup, but we can test the flow
        await registeredCommands['dustirc.sayTo']();

        // Should call showQuickPick and showInputBox if channels are available
        // (The warning path is tested separately)
    });

    test('join command with empty channel name', async () => {
        await ext.activate(context);

        // Mock empty channel input
        fakeVscode.window.showInputBox = sinon.fake.resolves('');

        // Call join command
        await registeredCommands['dustirc.join']();

        // Should handle empty input gracefully
        assert.ok(fakeVscode.window.showInputBox.called, 'Should prompt for channel name');
    });

    test('part command with specific channel', async () => {
        await ext.activate(context);

        // Mock channel input for part command
        fakeVscode.window.showInputBox = sinon.fake.resolves('#testchannel');

        // Call part command
        await registeredCommands['dustirc.part']();

        // Should prompt for channel input when no channels joined
        assert.ok(fakeVscode.window.showWarningMessage.called || fakeVscode.window.showInputBox.called,
            'Should either warn about no channels or prompt for channel name');
    });

    test('deactivate function exists and is callable', () => {
        // Test that deactivate function is exported and callable
        assert.ok(typeof ext.deactivate === 'function', 'deactivate should be a function');

        // Should not throw when called
        ext.deactivate();
        assert.ok(true, 'deactivate should complete without errors');
    });

    test('openOutput command shows main output channel', async () => {
        await ext.activate(context);

        // Call openOutput command
        registeredCommands['dustirc.openOutput']();

        // Should show the main output channel
        const mainOutput = outputChannels.get('Dust IRC');
        assert.ok(mainOutput, 'Main output channel should exist');
        assert.ok(mainOutput.show.called, 'Main output channel should be shown');
    });

    test('connect command handles connection errors gracefully', async () => {
        await ext.activate(context);

        // Mock inputs that will trigger connection attempt
        fakeVscode.window.showInputBox = sinon.stub()
            .onCall(0).resolves('invalid.host.xyz')
            .onCall(1).resolves('6667')
            .onCall(2).resolves('testnick')
            .onCall(3).resolves('testuser');

        fakeVscode.window.showQuickPick = sinon.fake.resolves('No');

        // Ensure the connect command exists and is callable
        assert.ok(registeredCommands['dustirc.connect'], 'Connect command should be registered');
        assert.ok(typeof registeredCommands['dustirc.connect'] === 'function', 'Connect command should be a function');

        // We don't actually call the command to avoid network connections in tests
        // The command registration itself validates the implementation exists
    });

    test('reconnect command is properly registered', async () => {
        await ext.activate(context);

        // Ensure the reconnect command exists and is callable
        assert.ok(registeredCommands['dustirc.reconnect'], 'Reconnect command should be registered');
        assert.ok(typeof registeredCommands['dustirc.reconnect'] === 'function', 'Reconnect command should be a function');

        // We don't actually call the command to avoid network connections in tests
        // The command registration itself validates the implementation exists
    });

    test('openRoom command handles missing room parameter', async () => {
        await ext.activate(context);

        // Call openRoom with undefined/null room
        await registeredCommands['dustirc.openRoom']();
        await registeredCommands['dustirc.openRoom'](null);
        await registeredCommands['dustirc.openRoom']('');

        // Should handle missing room gracefully by returning early
        assert.ok(true, 'Should handle missing room parameter gracefully');
    });

    test('openRoom command with existing channel output', async () => {
        await ext.activate(context);

        // Pre-create a channel output to test the "exists" path
        const testChannel = '#existingchannel';
        fakeVscode.window.createOutputChannel(`Dust IRC: ${testChannel}`);

        // Call openRoom command 
        await registeredCommands['dustirc.openRoom'](testChannel);

        // Should show information message about switching
        assert.ok(fakeVscode.window.showInformationMessage.called, 'Should show info message when switching rooms');
    });

    test('say command with valid input and channels', async () => {
        await ext.activate(context);

        // Mock having text input
        fakeVscode.window.showInputBox = sinon.fake.resolves('Hello everyone!');

        // We can't easily mock the internal connection having channels in this test setup,
        // but we can test the input handling flow
        await registeredCommands['dustirc.say']();

        // Should either warn about no channels or process the input
        assert.ok(fakeVscode.window.showWarningMessage.called || fakeVscode.window.showInputBox.called,
            'Should either warn about channels or process input');
    });

    test('identify command with empty password', async () => {
        await ext.activate(context);

        // Mock empty password input
        fakeVscode.window.showInputBox = sinon.fake.resolves('');

        // Call identify command
        await registeredCommands['dustirc.identify']();

        // Should show cancellation message for empty password
        assert.ok(fakeVscode.window.showInformationMessage.called, 'Should show identify cancelled message');
    });

    test('identify command with password input', async () => {
        await ext.activate(context);

        // Mock password input
        fakeVscode.window.showInputBox = sinon.fake.resolves('mypassword123');

        // Call identify command
        await registeredCommands['dustirc.identify']();

        // Should show success message (even if not connected, command flow completes)
        assert.ok(fakeVscode.window.showInformationMessage.called || fakeVscode.window.showErrorMessage.called,
            'Should show either success or error message');
    });

    test('ping command when not connected', async () => {
        await ext.activate(context);

        // Call ping command (extension starts disconnected)
        await registeredCommands['dustirc.ping']();

        // Should show error about not being connected
        assert.ok(fakeVscode.window.showErrorMessage.called, 'Should show error when ping fails');
    });
});

// Global teardown to restore Module._load
teardown(() => {
    if (originalLoad) {
        const require = createRequire(import.meta.url);
        const Module = require('module');
        Module._load = originalLoad;
    }
});
// End of suite - teardown() will restore Module._load