import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { styles } from './searchSelect.styles';
import type { SearchSelectOption, SearchSelectProps } from './searchSelect.types';

export function SearchSelect<T extends string>({
    options,
    onSelect,
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
    const [activeIndex, setActiveIndex] = useState(0);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return options;
        return options.filter((option) => option.label.toLowerCase().includes(normalized));
    }, [options, query]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query, options]);

    useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        window.addEventListener('mousedown', onPointerDown);
        return () => {
            window.removeEventListener('mousedown', onPointerDown);
        };
    }, []);

    function selectOption(option: SearchSelectOption<T>) {
        onSelect(option);
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (disabled) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            if (filtered.length === 0) return;
            setActiveIndex((current) => (current + 1) % filtered.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            if (filtered.length === 0) return;
            setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length);
            return;
        }

        if (event.key === 'Enter') {
            if (!open || filtered.length === 0) return;
            event.preventDefault();
            const option = filtered[activeIndex];
            if (option) {
                selectOption(option);
            }
            return;
        }

        if (event.key === 'Escape') {
            if (!open) return;
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
        }
    }

    const showDropdown = open && !disabled && !loading;
    const activeOptionId = showDropdown && filtered.length > 0 ? `${listboxId}-option-${activeIndex}` : undefined;

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
                value={query}
                placeholder={placeholder}
                disabled={disabled || loading}
                autoComplete='off'
                spellCheck={false}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onClick={() => setOpen(true)}
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
                                    aria-selected={active}
                                    className={`${styles.option}${active ? ` ${styles.optionActive}` : ''}`}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseDown={(event) => {
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
