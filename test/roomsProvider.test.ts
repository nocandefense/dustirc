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
});
