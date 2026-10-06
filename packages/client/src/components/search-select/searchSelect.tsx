import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { styles } from './searchSelect.styles';
import type { SearchSelectOption, SearchSelectProps } from './searchSelect.types';

export function SearchSelect<T extends string>({
    options,
    onSelect,
    value = null,
    allowCustom = false,
    onChange,
    placeholder,
    emptyMessage,
    noResultsMessage,
    disabled = false,
    loading = false,
    ariaLabel,
}: SearchSelectProps<T>) {
    const listboxId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    /** -1 means no option highlighted (creatable: Enter submits typed text). */
    const [activeIndex, setActiveIndex] = useState(allowCustom ? -1 : 0);

    const selectedOption = useMemo(
        () => (value ? (options.find((option) => option.value === value) ?? null) : null),
        [options, value],
    );

    const filterSource = allowCustom ? (value ?? '') : query;

    const filtered = useMemo(() => {
        const normalized = filterSource.trim().toLowerCase();
        if (!normalized) return options;
        return options.filter((option) => option.label.toLowerCase().includes(normalized));
    }, [options, filterSource]);

    // While open, show the filter query; while closed, show the selected label.
    const inputValue = allowCustom ? (value ?? '') : open ? query : selectedOption?.label || '';

    useEffect(() => {
        setActiveIndex(allowCustom ? -1 : 0);
    }, [filterSource, options, allowCustom]);

    useEffect(() => {
        if (!open || activeIndex < 0) return;
        const option = document.getElementById(`${listboxId}-option-${activeIndex}`);
        option?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, listboxId, open]);

    useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
                if (!allowCustom) {
                    setQuery('');
                }
            }
        }

        window.addEventListener('mousedown', onPointerDown);
        return () => {
            window.removeEventListener('mousedown', onPointerDown);
        };
    }, [allowCustom]);

    function closeDropdown() {
        setOpen(false);
        if (!allowCustom) {
            setQuery('');
        }
    }

    function selectOption(option: SearchSelectOption<T>) {
        onSelect(option);
        if (allowCustom) {
            onChange?.(option.value);
        } else {
            setQuery('');
        }
        setOpen(false);
        // Keep focus so the user can Tab to the next field.
        inputRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (disabled) return;

        if (event.key === 'ArrowDown') {
            // Arrows only navigate after Enter (or click/type) opens the list.
            if (!open) return;
            event.preventDefault();
            if (filtered.length === 0) return;
            setActiveIndex((current) => {
                if (allowCustom && current < 0) return 0;
                return (current + 1) % filtered.length;
            });
            return;
        }

        if (event.key === 'ArrowUp') {
            if (!open) return;
            event.preventDefault();
            if (filtered.length === 0) return;
            setActiveIndex((current) => {
                if (allowCustom && current < 0) return filtered.length - 1;
                return (current - 1 + filtered.length) % filtered.length;
            });
            return;
        }

        if (event.key === 'Enter') {
            if (!open) {
                // Enter activates the control so arrows can change the value.
                event.preventDefault();
                setOpen(true);
                return;
            }

            if (filtered.length === 0) {
                if (allowCustom) {
                    // Nothing to pick — let the form submit with the typed value.
                    setOpen(false);
                }
                return;
            }

            if (allowCustom) {
                const typed = (value ?? '').trim();
                const exact = filtered.find((option) => option.value === typed);
                if (exact && activeIndex < 0) {
                    event.preventDefault();
                    selectOption(exact);
                    return;
                }
                if (activeIndex < 0) {
                    // Let the form submit with the free-typed value.
                    setOpen(false);
                    return;
                }
            }

            event.preventDefault();
            const option = filtered[activeIndex];
            if (option) {
                selectOption(option);
            }
            return;
        }

        if (event.key === 'Tab') {
            if (open) {
                closeDropdown();
            }
            return;
        }

        if (event.key === 'Escape') {
            if (!open) return;
            event.preventDefault();
            event.stopPropagation();
            closeDropdown();
        }
    }

    // Creatable inputs hide the list when nothing matches (free text = create new).
    const showDropdown = open && !disabled && !loading && (!allowCustom || filtered.length > 0);
    const activeOptionId =
        showDropdown && activeIndex >= 0 && filtered.length > 0 ? `${listboxId}-option-${activeIndex}` : undefined;

    return (
        <div ref={rootRef} className={styles.root}>
            <input
                ref={inputRef}
                className={styles.input}
                type='text'
                role='combobox'
                aria-expanded={showDropdown}
                aria-controls={listboxId}
                aria-autocomplete='list'
                aria-activedescendant={activeOptionId}
                aria-label={ariaLabel}
                value={inputValue}
                placeholder={placeholder}
                disabled={disabled || loading}
                autoComplete='off'
                autoCapitalize='off'
                autoCorrect='off'
                spellCheck={false}
                onChange={(event) => {
                    const next = event.target.value;
                    if (allowCustom) {
                        onChange?.(next);
                    } else {
                        setQuery(next);
                    }
                    setOpen(true);
                }}
                onFocus={() => {
                    if (!allowCustom) {
                        setQuery('');
                    }
                }}
                onBlur={(event) => {
                    const next = event.relatedTarget as Node | null;
                    if (rootRef.current?.contains(next)) return;
                    closeDropdown();
                }}
                onClick={() => {
                    if (!disabled && !loading) {
                        setOpen(true);
                    }
                }}
                onKeyDown={handleKeyDown}
            />
            {showDropdown ? (
                <div id={listboxId} className={styles.dropdown} role='listbox' aria-label={ariaLabel}>
                    {options.length === 0 ? (
                        <p className={styles.status}>{emptyMessage}</p>
                    ) : filtered.length === 0 ? (
                        <p className={styles.status}>{noResultsMessage}</p>
                    ) : (
                        filtered.map((option, index) => {
                            const active = index === activeIndex;
                            return (
                                <button
                                    key={option.value}
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
                                        selectOption(option);
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })
                    )}
                </div>
            ) : null}
        </div>
    );
}
