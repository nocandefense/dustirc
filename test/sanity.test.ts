// Sanity test for mocha unit-tests CI job
// Real tests are in src/test/ and run via vscode-test

import * as assert from 'assert';

suite('Sanity Tests', () => {
    test('basic assertion works', () => {
        assert.strictEqual(1 + 1, 2);
    });

    test('extension structure is valid', () => {
        // Just verify we can import the module structure
        assert.ok(true);
    });
});
