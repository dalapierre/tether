import type { HubClient } from '@tether/core';
import type { WebSocket } from 'ws';

/** Adapt a `ws` WebSocket into the core HubClient shape. */
export function asHubClient(socket: WebSocket): HubClient {
    return socket as unknown as HubClient;
}
