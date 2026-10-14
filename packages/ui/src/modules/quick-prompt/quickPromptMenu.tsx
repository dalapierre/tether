import { Button } from '@ui/components/button';
import { fillQuickPrompt, listQuickPrompts, type QuickPrompt, type QuickPromptInput } from '@ui/libs/api/quickPrompts';
import { eventMatchesKeybind, useKeybinds } from '@ui/libs/keybinds';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './quickPrompt.messages';
import { styles } from './quickPrompt.styles';

export type QuickPromptMenuProps = {
    onClose: () => void;
    onSelect?: (resolvedPrompt: string) => void;
};

type InputValues = Record<string, string>;

function initialValuesFor(inputs: QuickPromptInput[]): InputValues {
    const values: InputValues = {};
    for (const input of inputs) {
        values[input.name] = input.type === 'boolean' ? 'false' : '';
    }
    return values;
}

function isValidInputValue(input: QuickPromptInput, raw: string): boolean {
    if (input.type === 'string') {
        return raw.length > 0;
    }
    if (input.type === 'number') {
        if (!raw.trim()) return false;
        const n = Number(raw);
        return Number.isFinite(n);
    }
    return raw === 'true' || raw === 'false';
}

export function QuickPromptMenu({ onClose, onSelect }: QuickPromptMenuProps) {
    const intl = useIntl();
    const { keybinds } = useKeybinds();
    const listboxId = useId();
    const searchRef = useRef<HTMLInputElement | null>(null);
    const firstFillRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [prompts, setPrompts] = useState<QuickPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [selected, setSelected] = useState<QuickPrompt | null>(null);
    const [values, setValues] = useState<InputValues>({});

    useEffect(() => {
        let cancelled = false;
        listQuickPrompts()
            .then((items) => {
                if (!cancelled) {
                    setPrompts(items);
                    setLoadError(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError(true);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return prompts;
        return prompts.filter(
            (prompt) =>
                prompt.name.toLowerCase().includes(normalized) ||
                prompt.description.toLowerCase().includes(normalized) ||
                prompt.prompt.toLowerCase().includes(normalized),
        );
    }, [prompts, query]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        if (selected) {
            firstFillRef.current?.focus();
            return;
        }
        searchRef.current?.focus();
    }, [selected]);

    useEffect(() => {
        if (selected || activeIndex < 0 || filtered.length === 0) return;
        const option = document.getElementById(`${listboxId}-option-${activeIndex}`);
        option?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, filtered.length, listboxId, selected]);

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

    function finishPrompt(prompt: QuickPrompt, nextValues: InputValues) {
        const resolved = fillQuickPrompt(prompt.prompt, nextValues);
        onSelect?.(resolved);
        onClose();
    }

    function selectPrompt(prompt: QuickPrompt) {
        if (prompt.inputs.length === 0) {
            finishPrompt(prompt, {});
            return;
        }
        setSelected(prompt);
        setValues(initialValuesFor(prompt.inputs));
    }

    function goBack() {
        setSelected(null);
        setValues({});
    }

    function handleSubmitInputs(event?: FormEvent) {
        event?.preventDefault();
        if (!selected) return;
        if (!selected.inputs.every((input) => isValidInputValue(input, values[input.name] ?? ''))) {
            return;
        }
        finishPrompt(selected, values);
    }

    function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
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

    function handleFillKeyDown(event: KeyboardEvent<HTMLFormElement>) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            goBack();
        }
    }

    const activeOptionId = filtered.length > 0 && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
    const canSubmitInputs =
        selected !== null && selected.inputs.every((input) => isValidInputValue(input, values[input.name] ?? ''));

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
                {selected ? (
                    <form onSubmit={handleSubmitInputs} onKeyDown={handleFillKeyDown}>
                        <div className={styles.fillHeader}>
                            <p className={styles.fillTitle}>{intl.formatMessage(messages.fillTitle)}</p>
                            <p className={styles.fillPromptName}>{selected.name}</p>
                            <p className={styles.fillHint}>{intl.formatMessage(messages.fillHint)}</p>
                        </div>
                        <div className={styles.fillBody}>
                            {selected.inputs.map((input, index) => {
                                const value = values[input.name] ?? '';
                                const invalidNumber =
                                    input.type === 'number' &&
                                    value.trim().length > 0 &&
                                    !Number.isFinite(Number(value));
                                return (
                                    <label key={input.name} className={styles.fillField}>
                                        <span className={styles.fillLabel}>{input.name}</span>
                                        {input.type === 'boolean' ? (
                                            <select
                                                ref={index === 0 ? firstFillRef : undefined}
                                                className={styles.fillSelect}
                                                value={value === 'true' ? 'true' : 'false'}
                                                onChange={(event) =>
                                                    setValues((current) => ({
                                                        ...current,
                                                        [input.name]: event.target.value,
                                                    }))
                                                }
                                            >
                                                <option value='false'>
                                                    {intl.formatMessage(messages.booleanFalse)}
                                                </option>
                                                <option value='true'>{intl.formatMessage(messages.booleanTrue)}</option>
                                            </select>
                                        ) : (
                                            <input
                                                ref={index === 0 ? firstFillRef : undefined}
                                                className={styles.fillInput}
                                                type={input.type === 'number' ? 'number' : 'text'}
                                                inputMode={input.type === 'number' ? 'decimal' : undefined}
                                                value={value}
                                                placeholder={intl.formatMessage(messages.inputValuePlaceholder)}
                                                autoComplete='off'
                                                autoCapitalize='off'
                                                autoCorrect='off'
                                                spellCheck={false}
                                                onChange={(event) =>
                                                    setValues((current) => ({
                                                        ...current,
                                                        [input.name]: event.target.value,
                                                    }))
                                                }
                                            />
                                        )}
                                        {invalidNumber ? (
                                            <span className={styles.fillError}>
                                                {intl.formatMessage(messages.invalidNumber)}
                                            </span>
                                        ) : null}
                                    </label>
                                );
                            })}
                        </div>
                        <div className={styles.fillActions}>
                            <Button type='button' variant='secondary' fullWidth={false} onClick={goBack}>
                                {intl.formatMessage(messages.back)}
                            </Button>
                            <Button type='submit' fullWidth={false} disabled={!canSubmitInputs}>
                                {intl.formatMessage(messages.submit)}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <>
                        <input
                            ref={searchRef}
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
                            onKeyDown={handleSearchKeyDown}
                        />
                        <div
                            id={listboxId}
                            className={styles.list}
                            role='listbox'
                            aria-label={intl.formatMessage(messages.ariaLabel)}
                        >
                            {loading ? (
                                <p className={styles.status}>{intl.formatMessage(messages.loading)}</p>
                            ) : loadError ? (
                                <p className={styles.status}>{intl.formatMessage(messages.loadFailed)}</p>
                            ) : prompts.length === 0 ? (
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
                                            <span className={styles.optionName}>{prompt.name}</span>
                                            {prompt.description ? (
                                                <span className={styles.optionDescription}>{prompt.description}</span>
                                            ) : null}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
