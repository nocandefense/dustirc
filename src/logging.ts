import * as fs from 'fs';
import * as path from 'path';

export function appendOutgoingMessage(workspaceRoot: string | undefined, text: string): void {
    if (!workspaceRoot) { return; }
    try {
        const logDir = path.join(workspaceRoot, '.vscode');
        if (!fs.existsSync(logDir)) { fs.mkdirSync(logDir, { recursive: true }); }
        const file = path.join(logDir, 'dust-outgoing.log');
        fs.appendFileSync(file, `${new Date().toISOString()} ${text}\n`, { encoding: 'utf8' });
    } catch {
        // swallow errors for now — best-effort logging
    }
}

export default { appendOutgoingMessage };
