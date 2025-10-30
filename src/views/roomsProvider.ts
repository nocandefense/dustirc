import type * as vscode from 'vscode';

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
        // Return a minimal TreeItem-like object. Type assertion keeps the API shape
        const item: any = {
            label: element,
            collapsibleState: 0,
            contextValue: 'dustirc.room',
            iconPath: undefined
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

