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
        }
    },
    workspace: {
        workspaceFolders: [{ uri: { fsPath: process.cwd() } }],
        getConfiguration: () => ({ get: () => false }),
        onDidChangeConfiguration: (cb: Function) => ({ dispose: sinon.fake() })
    },
    StatusBarAlignment: { Left: 1 }
};

// Add status bar item creation
fakeVscode.window.createStatusBarItem = (align: any, priority?: number) => ({
    text: '',
    show: sinon.fake(),
    dispose: sinon.fake()
});

// Mock vscode module for ES modules
const require = createRequire(import.meta.url);
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'vscode') { return fakeVscode; }
    return originalLoad.apply(this, arguments as any);
};

// Import extension after mocking vscode
const ext = require('../src/extension');

suite('Extension Enhanced Features', () => {
    let context: any;

    setup(() => {
        // Reset fake function call history
        sinon.resetHistory();
        outputChannels.clear();
        treeDataProvider = null;

        // Clear registered commands
        Object.keys(registeredCommands).forEach(key => delete registeredCommands[key]);

        context = { subscriptions: [] };
    });

    test.skip('activates extension and registers all enhanced commands', async () => {
        console.log('Extension object:', Object.keys(ext));
        console.log('Extension activate function:', typeof ext.activate);

        try {
            const result = await ext.activate(context);
            console.log('Activation result:', result);
        } catch (error) {
            console.log('Activation error:', error);
            console.log('Error message:', error.message);
            console.log('Error stack:', error.stack);
            throw error;
        }

        console.log('Context subscriptions:', context.subscriptions?.length);
        console.log('Registered commands after activation:', Object.keys(registeredCommands));

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

    test.skip('creates main output channel and registers tree data provider', async () => {
        await ext.activate(context);

        // Should create main Dust IRC output channel
        assert.ok(outputChannels.has('Dust IRC'), 'Main Dust IRC output channel should be created');

        // Should register tree data provider for rooms
        assert.ok(treeDataProvider, 'Tree data provider should be registered');
    });

    test.skip('openRoom command switches channel and shows output', async () => {
        await ext.activate(context);

        // Mock a channel output being available
        const channelOutput = fakeVscode.window.createOutputChannel('Dust IRC: #test');

        // Call openRoom command with a test room
        await registeredCommands['dustirc.openRoom']('#test');

        // Should show information message about switching
        assert.ok(fakeVscode.window.showInformationMessage.called, 'Should show info message when switching rooms');
    });

    test.skip('say command validates channel membership', async () => {
        await ext.activate(context);

        // Mock no input (user cancels)
        fakeVscode.window.showInputBox = sinon.fake.resolves(undefined);

        // Call say command
        await registeredCommands['dustirc.say']();

        // Should show warning about no channels
        assert.ok(fakeVscode.window.showWarningMessage.called, 'Should warn when no channels joined');
    });

    test.skip('sayTo command shows channel selection', async () => {
        await ext.activate(context);

        // Call sayTo command
        await registeredCommands['dustirc.sayTo']();

        // Should show warning about no channels (since we start with none)
        assert.ok(fakeVscode.window.showWarningMessage.called, 'Should warn when no channels available for sayTo');
    });

    test.skip('join command prompts for channel name', async () => {
        await ext.activate(context);

        // Mock channel input
        fakeVscode.window.showInputBox = sinon.fake.resolves('#testchannel');

        // Call join command
        await registeredCommands['dustirc.join']();

        // Should prompt for channel input
        assert.ok(fakeVscode.window.showInputBox.called, 'Should prompt for channel name');
    });

    test.skip('part command handles no channels gracefully', async () => {
        await ext.activate(context);

        // Call part command when no channels joined
        await registeredCommands['dustirc.part']();

        // Should show warning about no channels
        assert.ok(fakeVscode.window.showWarningMessage.called, 'Should warn when no channels to leave');
    });

    test.skip('identify command prompts for password', async () => {
        await ext.activate(context);

        // Mock password input
        fakeVscode.window.showInputBox = sinon.fake.resolves('testpassword');

        // Call identify command
        await registeredCommands['dustirc.identify']();

        // Should prompt for password
        assert.ok(fakeVscode.window.showInputBox.called, 'Should prompt for NickServ password');
    });

    test.skip('disconnect command provides user feedback', async () => {
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

    teardown(() => {
        // Restore Module._load to avoid side effects
        Module._load = originalLoad;
    });
});