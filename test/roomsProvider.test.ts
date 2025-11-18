import * as assert from 'assert';
import { RoomsProvider } from '../src/views/roomsProvider';

// Mock IrcConnection for testing
const mockConnection = {
    getCurrentChannel: () => '#foo',
    setCurrentChannel: (channel: string | null) => { },
    getJoinedChannels: () => ['#foo', '#bar']
};

suite('RoomsProvider', function () {
    test('adds, removes and clears rooms', async () => {
        const p = new RoomsProvider();
        p.addRoom('#foo');
        p.addRoom('#bar');
        let children = await p.getChildren();
        // order is sorted alphabetically
        assert.deepStrictEqual(children, ['#bar', '#foo']);

        p.removeRoom('#foo');
        children = await p.getChildren();
        assert.deepStrictEqual(children, ['#bar']);

        p.clear();
        children = await p.getChildren();
        assert.deepStrictEqual(children, []);
    });

    test('getTreeItem shows current channel indicator', () => {
        const p = new RoomsProvider(mockConnection as any);

        // Test current channel shows with bullet
        const currentItem = p.getTreeItem('#foo');
        const currentLabel = currentItem.label as string;
        assert.ok(currentLabel?.includes('●'), 'Current channel should show bullet indicator');
        assert.ok((currentItem.tooltip as string)?.includes('current channel'), 'Current channel should have tooltip');

        // Test non-current channel shows without bullet
        const normalItem = p.getTreeItem('#bar');
        const normalLabel = normalItem.label as string;
        assert.ok(!normalLabel?.includes('●'), 'Non-current channel should not show bullet');
        assert.strictEqual(normalItem.tooltip, '#bar', 'Non-current channel should have simple tooltip');
    }); test('getTreeItem includes click command', () => {
        const p = new RoomsProvider(mockConnection as any);

        const item = p.getTreeItem('#test');
        assert.ok(item.command, 'Tree item should have command');
        assert.strictEqual(item.command.command, 'dustirc.openRoom', 'Should have openRoom command');
        assert.deepStrictEqual(item.command.arguments, ['#test'], 'Should pass room name as argument');
    });

    test('setConnection updates connection reference', () => {
        const p = new RoomsProvider();
        const newMockConnection = {
            getCurrentChannel: () => '#newcurrent',
            setCurrentChannel: (channel: string | null) => { },
            getJoinedChannels: () => ['#newcurrent']
        };

        p.setConnection(newMockConnection as any);

        const item = p.getTreeItem('#newcurrent');
        const itemLabel = item.label as string;
        assert.ok(itemLabel?.includes('●'), 'Should use new connection for current channel detection');
    });

    test('handles empty room name gracefully', async () => {
        const p = new RoomsProvider();

        p.addRoom('');
        p.removeRoom('');

        // Should not crash and should have no rooms
        const children = await p.getChildren();
        assert.deepStrictEqual(children, []);
    });

    test('refresh method works correctly', () => {
        const p = new RoomsProvider();

        // Should not throw when calling refresh
        p.refresh();
        assert.ok(true, 'Refresh should complete without errors');
    });

    test('addRoom with duplicate names', async () => {
        const p = new RoomsProvider();

        p.addRoom('#test');
        p.addRoom('#test'); // Duplicate

        const children = await p.getChildren();
        // Should only have one instance
        assert.strictEqual(children.length, 1, 'Should not have duplicate rooms');
        assert.strictEqual(children[0], '#test', 'Should have the test room');
    });

    test('removeRoom with non-existent room', async () => {
        const p = new RoomsProvider();

        p.addRoom('#test');
        p.removeRoom('#nonexistent'); // Remove non-existent room

        const children = await p.getChildren();
        // Should still have the original room
        assert.strictEqual(children.length, 1, 'Should still have original room');
        assert.strictEqual(children[0], '#test', 'Should have the test room');
    });

    test('getTreeItem with null connection', () => {
        const p = new RoomsProvider(); // No connection provided

        const item = p.getTreeItem('#test');

        // Should not crash and should return basic item
        assert.ok(item, 'Should return tree item');
        assert.strictEqual(item.label, '#test', 'Should have correct label without bullet');
        assert.ok(item.command, 'Should have click command');
    });

    test('getTreeItem with connection returning null current channel', () => {
        const mockConnection = {
            getCurrentChannel: () => null, // No current channel
            setCurrentChannel: (channel: string | null) => { },
            getJoinedChannels: () => ['#foo', '#bar']
        };

        const p = new RoomsProvider(mockConnection as any);

        const item = p.getTreeItem('#test');

        // Should handle null current channel
        assert.ok(item, 'Should return tree item');
        assert.strictEqual(item.label, '#test', 'Should have correct label without bullet');
        assert.strictEqual(item.tooltip, '#test', 'Should have simple tooltip');
    });

    test('large number of rooms handling', async () => {
        const p = new RoomsProvider();

        // Add many rooms
        for (let i = 0; i < 100; i++) {
            p.addRoom(`#channel${i}`);
        }

        const children = await p.getChildren();
        assert.strictEqual(children.length, 100, 'Should handle 100 rooms');

        // Remove some rooms
        for (let i = 0; i < 50; i++) {
            p.removeRoom(`#channel${i}`);
        }

        const remainingChildren = await p.getChildren();
        assert.strictEqual(remainingChildren.length, 50, 'Should have 50 rooms remaining');
    });

    test('room names with special characters', async () => {
        const p = new RoomsProvider();

        const specialRooms = [
            '#café',
            '#общий',
            '#频道',
            '#test-room',
            '#test_room',
            '#room.with.dots',
            '#123numbers'
        ];

        specialRooms.forEach(room => p.addRoom(room));

        const children = await p.getChildren();
        assert.strictEqual(children.length, specialRooms.length, 'Should handle special characters');

        // Test that all rooms are present
        specialRooms.forEach(room => {
            assert.ok(children.includes(room), `Should include ${room}`);
        });
    });

    test('setConnection with different connection instances', () => {
        const p = new RoomsProvider();

        const connection1 = {
            getCurrentChannel: () => '#first',
            setCurrentChannel: (channel: string | null) => { },
            getJoinedChannels: () => ['#first']
        };

        const connection2 = {
            getCurrentChannel: () => '#second',
            setCurrentChannel: (channel: string | null) => { },
            getJoinedChannels: () => ['#second']
        };

        // Set first connection
        p.setConnection(connection1 as any);
        let item = p.getTreeItem('#first');
        assert.ok((item.label as string)?.includes('●'), 'Should show first as current');

        // Switch to second connection
        p.setConnection(connection2 as any);
        item = p.getTreeItem('#second');
        assert.ok((item.label as string)?.includes('●'), 'Should show second as current');

        item = p.getTreeItem('#first');
        assert.ok(!(item.label as string)?.includes('●'), 'Should not show first as current');
    });
});
