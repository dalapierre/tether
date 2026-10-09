/** Return path for route-level panels (settings, new session) opened via `navigate(..., { state: { from } })`. */
export function getPanelReturnPath(state: unknown, fallback = '/'): string {
    const from = (state as { from?: unknown } | null)?.from;
    if (typeof from === 'string' && from.length > 0) {
        return from;
    }
    return fallback;
}

export function panelLocationState(pathname: string, search = ''): { from: string } {
    return { from: `${pathname}${search}` };
}
