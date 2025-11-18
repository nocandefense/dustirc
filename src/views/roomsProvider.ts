import type * as vscode from 'vscode';
import type { IrcConnection } from '../irc/connection';

// Lightweight emitter so this module can be unit-tested outside of VS Code.
class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    readonly event = (listener: (e: T) => any) => {
        this.listeners.push(listener);
        return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
    };
    fire(e: T) {
        for (const l of this.listeners) { try { l(e); } catch (_) { /* ignore */ } }
    }
}

export class RoomsProvider implements vscode.TreeDataProvider<string> {
    private _onDidChangeTreeData = new Emitter<string | void | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private rooms: Set<string> = new Set();
    private connection: IrcConnection | null = null;

    constructor(connection?: IrcConnection) {
        if (connection) {
            this.connection = connection;
        }
    }

    setConnection(connection: IrcConnection) {
        this.connection = connection;
    }

    addRoom(name: string) {
        if (!name) { return; }
        this.rooms.add(name);
        this._onDidChangeTreeData.fire();
    }

    removeRoom(name: string) {
        if (!name) { return; }
        this.rooms.delete(name);
        this._onDidChangeTreeData.fire();
    }

    clear() {
        this.rooms.clear();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: string): vscode.TreeItem {
        const currentChannel = this.connection?.getCurrentChannel();
        const isCurrent = currentChannel === element;

        // Return a minimal TreeItem-like object. Type assertion keeps the API shape
        const item: any = {
            label: isCurrent ? `● ${element}` : element,
            collapsibleState: 0,
            contextValue: 'dustirc.room',
            iconPath: undefined,
            tooltip: isCurrent ? `${element} (current channel)` : element,
            command: {
                command: 'dustirc.openRoom',
                title: 'Open Room',
                arguments: [element]
            }
        };
        return item as vscode.TreeItem;
    }

    getChildren(): Thenable<string[]> {
        const list = Array.from(this.rooms).sort((a, b) => a.localeCompare(b));
        return Promise.resolve(list);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

