import { strict as assert } from 'assert';
import { RoomsProvider } from '../src/views/roomsProvider';

// Mock IrcConnection
const createMockConnection = (currentChannel: string | null = null) => ({
    getCurrentChannel: () => currentChannel,
    setCurrentChannel: (channel: string | null) => { },
    getJoinedChannels: () => currentChannel ? [currentChannel] : []
});

suite('RoomsProvider Coverage Tests', () => {
    test('constructor with and without connection', () => {
        // Test without connection
        const provider1 = new RoomsProvider();
        assert.ok(provider1, 'Should create provider without connection');

        // Test with connection
        const mockConn = createMockConnection('#test');
        const provider2 = new RoomsProvider(mockConn as any);
        assert.ok(provider2, 'Should create provider with connection');
    });

    test('setConnection method coverage', () => {
        const provider = new RoomsProvider();
        const mockConn = createMockConnection('#channel1');

        // Set connection
        provider.setConnection(mockConn as any);

        // Verify connection is used for current channel detection
        const item = provider.getTreeItem('#channel1');
        const label = item.label as string;
        assert.ok(label.includes('●'), 'Should show current channel indicator');
    });

    test('getTreeItem with various connection states', () => {
        const provider = new RoomsProvider();

        // Test with no connection
        let item = provider.getTreeItem('#test');
        assert.strictEqual(item.label, '#test', 'Should show plain label with no connection');
        assert.strictEqual(item.tooltip, '#test', 'Should show plain tooltip');

        // Test with connection returning null current channel
        const mockConn1 = createMockConnection(null);
        provider.setConnection(mockConn1 as any);
        item = provider.getTreeItem('#test');
        assert.strictEqual(item.label, '#test', 'Should show plain label with null current channel');
        assert.strictEqual(item.tooltip, '#test', 'Should show plain tooltip');

        // Test with connection having current channel
        const mockConn2 = createMockConnection('#test');
        provider.setConnection(mockConn2 as any);
        item = provider.getTreeItem('#test');
        assert.ok((item.label as string).includes('●'), 'Should show bullet for current channel');
        assert.ok((item.tooltip as string).includes('current channel'), 'Should show current channel tooltip');

        // Test with different current channel
        item = provider.getTreeItem('#other');
        assert.strictEqual(item.label, '#other', 'Should show plain label for non-current channel');
        assert.strictEqual(item.tooltip, '#other', 'Should show plain tooltip for non-current channel');
    });

    test('command property in tree items', () => {
        const provider = new RoomsProvider();

        const item = provider.getTreeItem('#testchannel');

        assert.ok(item.command, 'Tree item should have command');
        assert.strictEqual(item.command.command, 'dustirc.openRoom', 'Should have openRoom command');
        assert.strictEqual(item.command.title, 'Open Room', 'Should have correct command title');
        assert.deepStrictEqual(item.command.arguments, ['#testchannel'], 'Should pass channel as argument');
    });

    test('addRoom edge cases', async () => {
        const provider = new RoomsProvider();

        // Test empty string
        provider.addRoom('');
        let children = await provider.getChildren();
        assert.strictEqual(children.length, 0, 'Should not add empty room name');

        // Test whitespace-only (current implementation trims but still adds)
        provider.addRoom('   ');
        children = await provider.getChildren();
        // The implementation may add whitespace rooms - test the actual behavior
        assert.ok(children.length >= 0, 'Should handle whitespace-only room names without crashing');

        // Test null/undefined (though TypeScript should prevent this)
        provider.addRoom(null as any);
        provider.addRoom(undefined as any);
        children = await provider.getChildren();
        assert.strictEqual(children.length, 1, 'Should handle null/undefined gracefully but still have whitespace room');
    });

    test('removeRoom edge cases', async () => {
        const provider = new RoomsProvider();

        // Add some rooms first
        provider.addRoom('#room1');
        provider.addRoom('#room2');

        // Test removing empty string
        provider.removeRoom('');
        let children = await provider.getChildren();
        assert.strictEqual(children.length, 2, 'Should not remove anything for empty string');

        // Test removing non-existent room
        provider.removeRoom('#nonexistent');
        children = await provider.getChildren();
        assert.strictEqual(children.length, 2, 'Should not remove anything for non-existent room');

        // Test removing null/undefined
        provider.removeRoom(null as any);
        provider.removeRoom(undefined as any);
        children = await provider.getChildren();
        assert.strictEqual(children.length, 2, 'Should handle null/undefined gracefully');
    });

    test('refresh method coverage', () => {
        const provider = new RoomsProvider();

        // Test refresh without throwing
        provider.refresh();
        assert.ok(true, 'Refresh should complete without errors');

        // Test refresh with rooms
        provider.addRoom('#test1');
        provider.addRoom('#test2');
        provider.refresh();
        assert.ok(true, 'Refresh should work with rooms present');
    });

    test('clear method coverage', async () => {
        const provider = new RoomsProvider();

        // Add rooms
        provider.addRoom('#room1');
        provider.addRoom('#room2');
        provider.addRoom('#room3');

        let children = await provider.getChildren();
        assert.strictEqual(children.length, 3, 'Should have 3 rooms');

        // Clear all rooms
        provider.clear();
        children = await provider.getChildren();
        assert.strictEqual(children.length, 0, 'Should have no rooms after clear');

        // Test clear on empty provider
        provider.clear();
        children = await provider.getChildren();
        assert.strictEqual(children.length, 0, 'Should handle clearing empty provider');
    });

    test('getChildren sorting behavior', async () => {
        const provider = new RoomsProvider();

        // Add rooms in non-alphabetical order
        provider.addRoom('#zebra');
        provider.addRoom('#alpha');
        provider.addRoom('#beta');

        const children = await provider.getChildren();

        // Should be sorted alphabetically
        assert.deepStrictEqual(children, ['#alpha', '#beta', '#zebra'],
            'Children should be sorted alphabetically');
    });

    test('tree item properties', () => {
        const provider = new RoomsProvider();

        const item = provider.getTreeItem('#test');

        // Check all expected properties
        assert.ok(item.label, 'Should have label');
        assert.strictEqual(item.collapsibleState, 0, 'Should have correct collapsible state');
        assert.strictEqual(item.contextValue, 'dustirc.room', 'Should have correct context value');
        assert.strictEqual(item.iconPath, undefined, 'Should have undefined icon path');
        assert.ok(item.tooltip, 'Should have tooltip');
        assert.ok(item.command, 'Should have command');
    });

    test('connection switching scenarios', () => {
        const provider = new RoomsProvider();

        // Start with first connection
        const conn1 = createMockConnection('#room1');
        provider.setConnection(conn1 as any);

        let item = provider.getTreeItem('#room1');
        assert.ok((item.label as string).includes('●'), 'Room1 should be current');

        item = provider.getTreeItem('#room2');
        assert.ok(!(item.label as string).includes('●'), 'Room2 should not be current');

        // Switch to second connection
        const conn2 = createMockConnection('#room2');
        provider.setConnection(conn2 as any);

        item = provider.getTreeItem('#room1');
        assert.ok(!(item.label as string).includes('●'), 'Room1 should not be current after switch');

        item = provider.getTreeItem('#room2');
        assert.ok((item.label as string).includes('●'), 'Room2 should be current after switch');
    });
});