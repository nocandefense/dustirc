"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const connection_1 = __importDefault(require("../src/irc/connection"));
suite('IrcConnection', () => {
    test('connect and disconnect', async () => {
        const c = new connection_1.default();
        assert.strictEqual(c.isConnected(), false);
        await c.connect('irc.example.org', 6667, 'tester');
        assert.strictEqual(c.isConnected(), true);
        const info = c.getInfo();
        assert.strictEqual(info.host, 'irc.example.org');
        assert.strictEqual(info.port, 6667);
        assert.strictEqual(info.nick, 'tester');
        c.disconnect();
        assert.strictEqual(c.isConnected(), false);
    });
    test('invalid host throws', async () => {
        const c = new connection_1.default();
        await assert.rejects(async () => {
            // @ts-ignore
            await c.connect('', 6667);
        }, /Host is required/);
    });
    test('invalid port throws', async () => {
        const c = new connection_1.default();
        await assert.rejects(async () => {
            await c.connect('irc.example.org', 70000);
        }, /Port out of range/);
    });
    test('double connect throws', async () => {
        const c = new connection_1.default();
        await c.connect('irc.example.org');
        await assert.rejects(async () => {
            await c.connect('irc.example.org');
        }, /Already connected/);
        c.disconnect();
    });
    test('reconnect uses stored info', async () => {
        const c = new connection_1.default();
        await c.connect('irc.example.org', 6667, 'reconnect-test');
        // simulate disconnect without clearing info (disconnect clears info, so we'll set again)
        const info = c.getInfo();
        // Reset but keep host/port for reconnect test
        c.host = info.host;
        c.port = info.port;
        c.nick = info.nick;
        c.connected = false;
        const ok = await c.reconnect(2, 10);
        assert.strictEqual(ok, true);
        assert.strictEqual(c.isConnected(), true);
        c.disconnect();
    });
});
//# sourceMappingURL=connection.test.js.map