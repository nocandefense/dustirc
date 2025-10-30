import * as vscode from 'vscode';

export class RoomsProvider implements vscode.TreeDataProvider<string> {
    private _onDidChangeTreeData: vscode.EventEmitter<string | void | null> = new vscode.EventEmitter<string | void | null>();
    readonly onDidChangeTreeData: vscode.Event<string | void | null> = this._onDidChangeTreeData.event;

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
        const item = new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
        item.contextValue = 'dustirc.room';
        item.iconPath = new vscode.ThemeIcon('comment-discussion');
        return item;
    }

    getChildren(): Thenable<string[]> {
        const list = Array.from(this.rooms).sort((a, b) => a.localeCompare(b));
        return Promise.resolve(list);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
