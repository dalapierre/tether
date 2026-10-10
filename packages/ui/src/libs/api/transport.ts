/**
 * Small transport façade for UI → host communication.
 * When served by @tether/host, the default is same-origin HTTP + WebSocket.
 */

export type TetherTransport = {
    fetch(path: string, init?: RequestInit): Promise<Response>;
    openWebSocket(path: string): WebSocket;
};

export function createHttpWsTransport(): TetherTransport {
    return {
        fetch(path, init) {
            return fetch(path, init);
        },
        openWebSocket(path) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return new WebSocket(`${protocol}//${window.location.host}${path}`);
        },
    };
}

let transport: TetherTransport = createHttpWsTransport();

export function setTransport(next: TetherTransport): void {
    transport = next;
}

export function getTransport(): TetherTransport {
    return transport;
}
