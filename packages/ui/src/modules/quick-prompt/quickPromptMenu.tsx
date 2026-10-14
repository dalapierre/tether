import { eventMatchesKeybind, useKeybinds } from '@ui/libs/keybinds';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useIntl } from 'react-intl';
import { QUICK_PROMPTS, type QuickPrompt } from './prompts';
import { messages } from './quickPrompt.messages';
import { styles } from './quickPrompt.styles';

export type QuickPromptMenuProps = {
    onClose: () => void;
    onSelect?: (prompt: QuickPrompt) => void;
};

export function QuickPromptMenu({ onClose, onSelect }: QuickPromptMenuProps) {
    const intl = useIntl();
    const { keybinds } = useKeybinds();
    const listboxId = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return QUICK_PROMPTS;
        return QUICK_PROMPTS.filter(
            (prompt) =>
                prompt.label.toLowerCase().includes(normalized) || prompt.text.toLowerCase().includes(normalized),
        );
    }, [query]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (activeIndex < 0 || filtered.length === 0) return;
        const option = document.getElementById(`${listboxId}-option-${activeIndex}`);
        option?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, filtered.length, listboxId]);

    // Close on the open shortcut while modal (useKeybind skips aria-modal targets).
    useEffect(() => {
        const chord = keybinds.session.quickPrompt;
        if (!chord.trim()) return;

        function onKeyDown(event: globalThis.KeyboardEvent) {
            if (event.defaultPrevented || event.repeat) return;
            if (!eventMatchesKeybind(event, chord)) return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [keybinds.session.quickPrompt, onClose]);

    function selectPrompt(prompt: QuickPrompt) {
        onSelect?.(prompt);
        onClose();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (filtered.length === 0) return;
            setActiveIndex((current) => (current + 1) % filtered.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (filtered.length === 0) return;
            setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const prompt = filtered[activeIndex];
            if (prompt) {
                selectPrompt(prompt);
            }
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }
    }

    const activeOptionId = filtered.length > 0 && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

    return (
        <div
            className={styles.backdrop}
            role='presentation'
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className={styles.panel}
                role='dialog'
                aria-modal='true'
                aria-label={intl.formatMessage(messages.ariaLabel)}
            >
                <input
                    ref={inputRef}
                    className={styles.input}
                    type='text'
                    role='combobox'
                    aria-expanded='true'
                    aria-controls={listboxId}
                    aria-autocomplete='list'
                    aria-activedescendant={activeOptionId}
                    aria-label={intl.formatMessage(messages.ariaLabel)}
                    value={query}
                    placeholder={intl.formatMessage(messages.placeholder)}
                    autoComplete='off'
                    autoCapitalize='off'
                    autoCorrect='off'
                    spellCheck={false}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <div
                    id={listboxId}
                    className={styles.list}
                    role='listbox'
                    aria-label={intl.formatMessage(messages.ariaLabel)}
                >
                    {QUICK_PROMPTS.length === 0 ? (
                        <p className={styles.status}>{intl.formatMessage(messages.empty)}</p>
                    ) : filtered.length === 0 ? (
                        <p className={styles.status}>{intl.formatMessage(messages.noResults)}</p>
                    ) : (
                        filtered.map((prompt, index) => {
                            const active = index === activeIndex;
                            return (
                                <button
                                    key={prompt.id}
                                    id={`${listboxId}-option-${index}`}
                                    type='button'
                                    role='option'
                                    tabIndex={-1}
                                    aria-selected={active}
                                    className={`${styles.option}${active ? ` ${styles.optionActive}` : ''}`}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseDown={(event) => {
                                        // Keep focus on the input; selecting must not blur first.
                                        event.preventDefault();
                                        selectPrompt(prompt);
                                    }}
                                >
                                    {prompt.label}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
