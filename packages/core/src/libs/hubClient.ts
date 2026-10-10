/**
 * Transport-agnostic subscriber used by session hubs.
 * Host adapters wrap WebSocket (or other) sockets into this shape.
 */
export type HubClient = {
    readonly readyState: number;
    readonly OPEN: number;
    send(data: string): void;
    close(): void;
    on(event: 'close' | 'error' | 'message', listener: (...args: unknown[]) => void): void;
};
