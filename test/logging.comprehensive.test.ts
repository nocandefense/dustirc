import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { appendOutgoingMessage } from '../src/logging';

suite('Logging Module Coverage Tests', () => {
    let tempDir: string;

    setup(() => {
        // Create a temporary directory for test workspace
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dust-test-'));
    });

    teardown(() => {
        // Clean up temp directory
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (err) {
                // Ignore cleanup errors
            }
        }
    });

    test('appendOutgoingMessage creates log file and directory', () => {
        const message = 'Test outgoing message';

        appendOutgoingMessage(tempDir, message);

        const logDir = path.join(tempDir, '.vscode');
        const logFile = path.join(logDir, 'dust-outgoing.log');

        assert.ok(fs.existsSync(logDir), 'Should create .vscode directory');
        assert.ok(fs.existsSync(logFile), 'Should create log file');

        const logContent = fs.readFileSync(logFile, 'utf8');
        assert.ok(logContent.includes(message), 'Should log the message');
        assert.ok(logContent.includes(new Date().getFullYear().toString()), 'Should include timestamp');
    });

    test('appendOutgoingMessage handles existing directory', () => {
        // Pre-create the .vscode directory
        const logDir = path.join(tempDir, '.vscode');
        fs.mkdirSync(logDir, { recursive: true });

        const message = 'Test with existing directory';
        appendOutgoingMessage(tempDir, message);

        const logFile = path.join(logDir, 'dust-outgoing.log');
        assert.ok(fs.existsSync(logFile), 'Should create log file in existing directory');

        const logContent = fs.readFileSync(logFile, 'utf8');
        assert.ok(logContent.includes(message), 'Should log message in existing directory');
    });

    test('appendOutgoingMessage appends to existing file', () => {
        const message1 = 'First message';
        const message2 = 'Second message';

        appendOutgoingMessage(tempDir, message1);
        appendOutgoingMessage(tempDir, message2);

        const logFile = path.join(tempDir, '.vscode', 'dust-outgoing.log');
        const logContent = fs.readFileSync(logFile, 'utf8');

        assert.ok(logContent.includes(message1), 'Should contain first message');
        assert.ok(logContent.includes(message2), 'Should contain second message');

        const lines = logContent.split('\n').filter(line => line.length > 0);
        assert.strictEqual(lines.length, 2, 'Should have two log entries');
    });

    test('appendOutgoingMessage handles undefined workspace root', () => {
        // Should not throw when workspace root is undefined
        appendOutgoingMessage(undefined, 'test message');
        assert.ok(true, 'Should handle undefined workspace root gracefully');
    });

    test('appendOutgoingMessage handles empty workspace root', () => {
        // Should not throw when workspace root is empty string
        appendOutgoingMessage('', 'test message');
        assert.ok(true, 'Should handle empty workspace root gracefully');
    });

    test('appendOutgoingMessage handles invalid workspace path', () => {
        // Test with a path that can't be written to
        const invalidPath = '/dev/null/invalid/path';

        // Should not throw due to try/catch error swallowing
        appendOutgoingMessage(invalidPath, 'test message');
        assert.ok(true, 'Should handle invalid path gracefully');
    });

    test('appendOutgoingMessage formats timestamp correctly', () => {
        const message = 'Timestamp test';
        appendOutgoingMessage(tempDir, message);

        const logFile = path.join(tempDir, '.vscode', 'dust-outgoing.log');
        const logContent = fs.readFileSync(logFile, 'utf8');

        // Check for ISO timestamp format
        const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
        assert.ok(isoRegex.test(logContent), 'Should use ISO timestamp format');
    });

    test('appendOutgoingMessage with special characters', () => {
        const messagesWithSpecialChars = [
            'Message with émojis 🚀',
            'Message with "quotes" and \'apostrophes\'',
            'Message\nwith\nnewlines',
            'Message\twith\ttabs',
            'Message with unicode: 你好世界'
        ];

        messagesWithSpecialChars.forEach((message, index) => {
            appendOutgoingMessage(tempDir, message);
        });

        const logFile = path.join(tempDir, '.vscode', 'dust-outgoing.log');
        const logContent = fs.readFileSync(logFile, 'utf8');

        messagesWithSpecialChars.forEach(message => {
            assert.ok(logContent.includes(message), `Should log message with special characters: ${message}`);
        });
    });

    test('appendOutgoingMessage with very long message', () => {
        // Test with a very long message
        const longMessage = 'A'.repeat(10000);

        appendOutgoingMessage(tempDir, longMessage);

        const logFile = path.join(tempDir, '.vscode', 'dust-outgoing.log');
        const logContent = fs.readFileSync(logFile, 'utf8');

        assert.ok(logContent.includes(longMessage), 'Should handle very long messages');
    });

    test('appendOutgoingMessage creates nested directories', () => {
        // Test with a deeper path
        const nestedPath = path.join(tempDir, 'nested', 'workspace');
        const message = 'Nested directory test';

        appendOutgoingMessage(nestedPath, message);

        const logDir = path.join(nestedPath, '.vscode');
        const logFile = path.join(logDir, 'dust-outgoing.log');

        assert.ok(fs.existsSync(logDir), 'Should create nested .vscode directory');
        assert.ok(fs.existsSync(logFile), 'Should create log file in nested structure');
    });
});