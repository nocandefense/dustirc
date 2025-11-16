import * as assert from 'assert';
import { RoomsProvider } from '../src/views/roomsProvider';

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
});
