import { SegmentedControl } from '@client/components/segmented-control';
import {
    DEFAULT_KEYBINDS,
    KEYBIND_ACTIONS_BY_CATEGORY,
    chordFromKeyboardEvent,
    formatKeybind,
    withSuperModifier,
    type HomeKeybindAction,
    type KeybindCategory,
    type Keybinds,
    type SessionKeybindAction,
} from '@client/libs/keybinds';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './settings.messages';
import { styles } from './settings.styles';

type KeybindsPanelProps = {
    keybinds: Keybinds;
    onChange: (keybinds: Keybinds) => void;
    disabled?: boolean;
};

type RecordingTarget = {
    category: KeybindCategory;
    action: string;
} | null;

function actionLabel(
    category: KeybindCategory,
    action: string,
    formatMessage: ReturnType<typeof useIntl>['formatMessage'],
): string {
    switch (category) {
        case 'home':
            switch (action as HomeKeybindAction) {
                case 'newSession':
                    return formatMessage(messages.keybindNewSession);
                case 'openSettings':
                    return formatMessage(messages.keybindOpenSettings);
                case 'focusSearch':
                    return formatMessage(messages.keybindFocusSearch);
                case 'previousSession':
                    return formatMessage(messages.keybindPreviousSession);
                case 'nextSession':
                    return formatMessage(messages.keybindNextSession);
                case 'deleteSession':
                    return formatMessage(messages.keybindDeleteSession);
                case 'restartSession':
                    return formatMessage(messages.keybindRestartSession);
            }
            break;
        case 'session':
            switch (action as SessionKeybindAction) {
                case 'goBack':
                    return formatMessage(messages.keybindGoBack);
                case 'toggleReview':
                    return formatMessage(messages.keybindToggleReview);
                case 'toggleTerminal':
                    return formatMessage(messages.keybindToggleTerminal);
                case 'toggleAgentInsert':
                    return formatMessage(messages.keybindToggleAgentInsert);
                case 'enterShellInsert':
                    return formatMessage(messages.keybindEnterShellInsert);
                case 'nextFile':
                    return formatMessage(messages.keybindNextFile);
                case 'previousFile':
                    return formatMessage(messages.keybindPreviousFile);
                case 'discardFile':
                    return formatMessage(messages.keybindDiscardFile);
                case 'scrollFileUp':
                    return formatMessage(messages.keybindScrollFileUp);
                case 'scrollFileDown':
                    return formatMessage(messages.keybindScrollFileDown);
                case 'scrollSpeedModifier':
                    return formatMessage(messages.keybindScrollSpeedModifier);
                case 'toggleMarkdownPreview':
                    return formatMessage(messages.keybindToggleMarkdownPreview);
            }
            break;
    }
    return action;
}

function actionsForCategory(category: KeybindCategory): readonly string[] {
    return KEYBIND_ACTIONS_BY_CATEGORY[category];
}

/** Enter chord plus Alt/⌘+key exit when those differ. */
function formatSessionInsertKeybind(chord: string): string {
    const enterLabel = formatKeybind(chord);
    if (!enterLabel) return '';
    const exitChord = withSuperModifier(chord);
    if (exitChord === chord.trim().toLowerCase()) return enterLabel;
    const exitLabel = formatKeybind(exitChord);
    return exitLabel ? `${enterLabel} / ${exitLabel}` : enterLabel;
}

function formatActionKeybind(category: KeybindCategory, action: string, chord: string): string {
    if (category === 'session' && action === 'toggleAgentInsert') {
        return formatSessionInsertKeybind(chord);
    }
    return formatKeybind(chord);
}

function categoryDiffersFromDefault(keybinds: Keybinds, category: KeybindCategory): boolean {
    const current = keybinds[category];
    const defaults = DEFAULT_KEYBINDS[category];
    return actionsForCategory(category).some(
        (action) => (current[action as never] as string) !== (defaults[action as never] as string),
    );
}

export function KeybindsPanel({ keybinds, onChange, disabled }: KeybindsPanelProps) {
    const intl = useIntl();
    const [tab, setTab] = useState<KeybindCategory>('home');
    const [recording, setRecording] = useState<RecordingTarget>(null);

    const conflictActions = useMemo(() => {
        const chords = new Map<string, string[]>();
        for (const action of actionsForCategory(tab)) {
            const chord = keybinds[tab][action as never] as string;
            if (!chord.trim()) continue;
            const list = chords.get(chord) ?? [];
            list.push(action);
            chords.set(chord, list);
        }
        const conflicts = new Set<string>();
        for (const list of chords.values()) {
            if (list.length > 1) {
                for (const action of list) conflicts.add(action);
            }
        }
        return conflicts;
    }, [keybinds, tab]);

    useEffect(() => {
        if (!recording) return;
        const target = recording;

        function onKeyDown(event: KeyboardEvent) {
            event.preventDefault();
            event.stopPropagation();

            if (event.key === 'Escape') {
                setRecording(null);
                return;
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
                const { category, action } = target;
                onChange({
                    ...keybinds,
                    [category]: {
                        ...keybinds[category],
                        [action]: '',
                    },
                });
                setRecording(null);
                return;
            }

            const chord = chordFromKeyboardEvent(event);
            if (!chord) return;

            const { category, action } = target;
            onChange({
                ...keybinds,
                [category]: {
                    ...keybinds[category],
                    [action]: chord,
                },
            });
            setRecording(null);
        }

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [keybinds, onChange, recording]);

    function resetCategory() {
        onChange({
            ...keybinds,
            [tab]: { ...DEFAULT_KEYBINDS[tab] },
        });
        setRecording(null);
    }

    const tabLabel = (category: KeybindCategory) => {
        switch (category) {
            case 'home':
                return intl.formatMessage(messages.keybindsTabHome);
            case 'session':
                return intl.formatMessage(messages.keybindsTabSession);
        }
    };

    return (
        <div className={styles.fields}>
            <SegmentedControl
                ariaLabel={intl.formatMessage(messages.keybindsTabsLabel)}
                value={tab}
                onChange={(next) => {
                    setTab(next);
                    setRecording(null);
                }}
                options={[
                    { value: 'home', label: tabLabel('home') },
                    { value: 'session', label: tabLabel('session') },
                ]}
            />

            <p className={styles.hint}>{intl.formatMessage(messages.keybindsHint)}</p>

            <div className={styles.keybindList}>
                {actionsForCategory(tab).map((action) => {
                    const chord = keybinds[tab][action as never] as string;
                    const isRecording = recording?.category === tab && recording.action === action;
                    const conflict = conflictActions.has(action);
                    return (
                        <div key={action} className={styles.keybindRow}>
                            <div className={styles.keybindText}>
                                <span className={styles.keybindLabel}>
                                    {actionLabel(tab, action, intl.formatMessage)}
                                </span>
                                {conflict ? (
                                    <span className={styles.keybindConflict}>
                                        {intl.formatMessage(messages.keybindConflict)}
                                    </span>
                                ) : null}
                            </div>
                            <button
                                type='button'
                                className={
                                    isRecording
                                        ? styles.keybindButtonRecording
                                        : conflict
                                          ? styles.keybindButtonConflict
                                          : styles.keybindButton
                                }
                                disabled={disabled}
                                onClick={() => setRecording(isRecording ? null : { category: tab, action })}
                            >
                                {isRecording
                                    ? intl.formatMessage(messages.keybindRecording)
                                    : chord
                                      ? formatActionKeybind(tab, action, chord)
                                      : intl.formatMessage(messages.keybindUnbound)}
                            </button>
                        </div>
                    );
                })}
            </div>

            {categoryDiffersFromDefault(keybinds, tab) ? (
                <button type='button' className={styles.keybindReset} disabled={disabled} onClick={resetCategory}>
                    {intl.formatMessage(messages.keybindsResetCategory)}
                </button>
            ) : null}
        </div>
    );
}
