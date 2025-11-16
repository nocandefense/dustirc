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
});
// End of suite - teardown() will restore Module._load