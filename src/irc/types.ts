export type IrcCommand = string;

export interface IrcMessage {
    raw: string;
    tags?: Record<string, string | true>;
    prefix?: string; // raw prefix (nick!user@host or server)
    from?: string; // nickname (if available)
    command: IrcCommand;
    params: string[];
    trailing?: string; // the last param after ':' that may contain spaces
    type: 'privmsg' | 'notice' | 'join' | 'part' | 'nick' | 'ping' | 'numeric' | 'other';
    numeric?: number;
}

export type ParseResult = IrcMessage;
