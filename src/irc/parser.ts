import { IrcMessage } from './types';

function parseTags(tagStr: string): Record<string, string | true> {
    const out: Record<string, string | true> = {};
    if (!tagStr) { return out; }
    // tags separated by ';'
    for (const pair of tagStr.split(';')) {
        if (pair.indexOf('=') === -1) {
            out[pair] = true;
        } else {
            const [k, v] = pair.split('=', 2);
            out[k] = decodeURIComponent(v);
        }
    }
    return out;
}

export function parseLine(line: string): IrcMessage {
    const raw = line;
    let rest = line;
    let tags: Record<string, string | true> | undefined;
    if (rest.startsWith('@')) {
        const i = rest.indexOf(' ');
        if (i === -1) {
            const tagStr = rest.slice(1);
            tags = parseTags(tagStr);
            rest = '';
        } else {
            const tagStr = rest.slice(1, i);
            tags = parseTags(tagStr);
            rest = rest.slice(i + 1);
        }
    }

    let prefix: string | undefined;
    if (rest.startsWith(':')) {
        const i = rest.indexOf(' ');
        if (i === -1) {
            prefix = rest.slice(1);
            rest = '';
        } else {
            prefix = rest.slice(1, i);
            rest = rest.slice(i + 1);
        }
    }

    // command
    const parts = rest.split(' ');
    const command = parts.shift() || '';

    let trailing: string | undefined;
    const params: string[] = [];
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.startsWith(':')) {
            trailing = parts.slice(i).join(' ').slice(1);
            break;
        } else if (p !== '') {
            params.push(p);
        }
    }

    const msg: IrcMessage = {
        raw,
        tags,
        prefix,
        command: command || 'UNKNOWN',
        params,
        trailing,
        type: 'other',
    };

    // derive some helpers
    if (prefix && prefix.indexOf('!') !== -1) {
        msg.from = prefix.split('!')[0];
    }

    // map command to type
    const cmd = (command || '').toUpperCase();
    if (cmd === 'PRIVMSG') {
        msg.type = 'privmsg';
    } else if (cmd === 'NOTICE') {
        msg.type = 'notice';
    } else if (cmd === 'PING') {
        msg.type = 'ping';
    } else if (cmd === 'JOIN') {
        msg.type = 'join';
    } else if (cmd === 'PART') {
        msg.type = 'part';
    } else if (cmd === 'NICK') {
        msg.type = 'nick';
    } else if (/^\d{3}$/.test(cmd)) {
        msg.type = 'numeric';
        msg.numeric = parseInt(cmd, 10);
    }

    return msg;
}

export default { parseLine };
