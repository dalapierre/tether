import { connectSessionShell, killSessionShell, MAX_SESSION_SHELLS } from '@ui/libs/api/sessions';
import { getShellRoster, setShellRoster } from '@ui/libs/layout/reviewLayoutPreferences';
import { ShellSplitPanel, type ShellSplitPanelApi } from '@ui/modules/shell-split-panel';
import { useCallback, type CSSProperties, type MutableRefObject } from 'react';

export type SessionShellPanelApi = ShellSplitPanelApi;

export type SessionShellPanelProps = {
    sessionId: string;
    className: string;
    style?: CSSProperties;
    'aria-hidden'?: boolean;
    isDesktop: boolean;
    fullscreen: boolean;
    visible: boolean;
    onToggleFullscreen?: () => void;
    /** Close the whole terminal panel (kills remaining shells). */
    onClose: () => void;
    apiRef?: MutableRefObject<SessionShellPanelApi | null>;
    /** Highlighted shell text → explain via the open session harness. */
    onExplain?: (errorMessage: string, command: string) => void;
};

export function SessionShellPanel({
    sessionId,
    className,
    style,
    'aria-hidden': ariaHidden,
    isDesktop,
    fullscreen,
    visible,
    onToggleFullscreen,
    onClose,
    apiRef,
    onExplain,
}: SessionShellPanelProps) {
    const getRoster = useCallback(() => getShellRoster(sessionId), [sessionId]);
    const setRoster = useCallback(
        (state: Parameters<typeof setShellRoster>[1]) => setShellRoster(sessionId, state),
        [sessionId],
    );
    const connect = useCallback((shellId: string) => connectSessionShell(sessionId, shellId), [sessionId]);
    const killShell = useCallback((shellId: string) => killSessionShell(sessionId, shellId), [sessionId]);

    return (
        <ShellSplitPanel
            scopeKey={sessionId}
            maxShells={MAX_SESSION_SHELLS}
            getRoster={getRoster}
            setRoster={setRoster}
            connect={connect}
            killShell={killShell}
            onClose={onClose}
            className={className}
            style={style}
            aria-hidden={ariaHidden}
            isDesktop={isDesktop}
            fullscreen={fullscreen}
            visible={visible}
            onToggleFullscreen={onToggleFullscreen}
            apiRef={apiRef}
            onExplain={onExplain}
        />
    );
}
