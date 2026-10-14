import { Button } from '@ui/components/button';
import { RoutePanel } from '@ui/components/route-panel';
import { Spinner } from '@ui/components/spinner';
import { ApiError } from '@ui/libs/api/client';
import {
    createQuickPrompt,
    isQuickPromptInputType,
    isValidQuickPromptInputName,
    MAX_QUICK_PROMPT_DESCRIPTION_LENGTH,
    MAX_QUICK_PROMPT_INPUTS,
    notifyQuickPromptsChanged,
    sanitizeQuickPromptInputName,
    type QuickPromptInputType,
} from '@ui/libs/api/quickPrompts';
import { showToast } from '@ui/modules/toast';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './newQuickPrompt.messages';
import { styles } from './newQuickPrompt.styles';
import type { NewQuickPromptProps } from './newQuickPrompt.types';

type DraftInput = {
    name: string;
    type: QuickPromptInputType;
};

type InputNameError = 'required' | 'invalid' | 'duplicate';

function RemoveIcon() {
    return (
        <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4' aria-hidden>
            <path strokeLinecap='round' d='M5 5l10 10M15 5L5 15' />
        </svg>
    );
}

function normalizeInputName(value: string): string {
    return value.replace(/^-+|-+$/g, '');
}

function inputNameError(name: string, index: number, inputs: DraftInput[]): InputNameError | null {
    const normalized = normalizeInputName(name);
    if (!normalized) {
        return 'required';
    }
    if (!isValidQuickPromptInputName(normalized)) {
        return 'invalid';
    }
    const duplicate = inputs.some((input, i) => i !== index && normalizeInputName(input.name) === normalized);
    return duplicate ? 'duplicate' : null;
}

export function NewQuickPrompt({ onClose, onCreated }: NewQuickPromptProps) {
    const intl = useIntl();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [prompt, setPrompt] = useState('');
    const [inputs, setInputs] = useState<DraftInput[]>([]);
    const [creating, setCreating] = useState(false);
    const [showInputErrors, setShowInputErrors] = useState(false);

    const inputErrors = useMemo(
        () => inputs.map((input, index) => inputNameError(input.name, index, inputs)),
        [inputs],
    );
    const inputsValid = inputErrors.every((error) => error === null);
    const formReady = !creating && name.trim().length > 0 && prompt.trim().length > 0;

    function addInput() {
        if (inputs.length >= MAX_QUICK_PROMPT_INPUTS) return;
        setInputs((current) => [...current, { name: '', type: 'string' }]);
        setShowInputErrors(false);
    }

    function removeInput(index: number) {
        setInputs((current) => current.filter((_, i) => i !== index));
    }

    function updateInput(index: number, patch: Partial<DraftInput>) {
        setInputs((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    function errorMessage(error: InputNameError): string {
        switch (error) {
            case 'required':
                return intl.formatMessage(messages.inputNameRequired);
            case 'duplicate':
                return intl.formatMessage(messages.duplicateInputName);
            case 'invalid':
                return intl.formatMessage(messages.invalidInputName);
        }
    }

    async function handleCreate() {
        if (!formReady) return;

        if (!inputsValid) {
            setShowInputErrors(true);
            return;
        }

        const normalizedInputs = inputs.map((input) => ({
            name: normalizeInputName(input.name),
            type: input.type,
        }));

        setCreating(true);
        try {
            await createQuickPrompt({
                name: name.trim(),
                description: description.trim(),
                prompt: prompt.trim(),
                inputs: normalizedInputs,
            });
            notifyQuickPromptsChanged();
            onCreated?.();
            onClose();
        } catch (err: unknown) {
            showToast(
                'generic-error',
                err instanceof ApiError || err instanceof Error
                    ? err.message
                    : intl.formatMessage(messages.createFailed),
            );
            setCreating(false);
        }
    }

    return (
        <form
            className={styles.form}
            onSubmit={(event) => {
                event.preventDefault();
                void handleCreate();
            }}
        >
            <RoutePanel
                title={intl.formatMessage(messages.title)}
                onClose={onClose}
                closeLabel={intl.formatMessage(messages.close)}
                closeDisabled={creating}
                hideToolbar
                aria-label={intl.formatMessage(messages.ariaLabel)}
                footer={
                    <div className={styles.footer}>
                        <Button type='submit' disabled={!formReady}>
                            {intl.formatMessage(creating ? messages.creating : messages.create)}
                        </Button>
                    </div>
                }
                overlay={
                    creating ? (
                        <div className={styles.creatingOverlay}>
                            <Spinner
                                size='lg'
                                label={intl.formatMessage(messages.creating)}
                                className={styles.creatingSpinner}
                            />
                            <p className={styles.creatingLabel}>{intl.formatMessage(messages.creating)}</p>
                        </div>
                    ) : null
                }
            >
                <div>
                    <h2 className={styles.sectionTitle}>{intl.formatMessage(messages.title)}</h2>
                </div>

                <div className={styles.fields}>
                    <label className={styles.label}>
                        {intl.formatMessage(messages.nameLabel)}
                        <input
                            className={styles.input}
                            type='text'
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={intl.formatMessage(messages.namePlaceholder)}
                            autoComplete='off'
                            autoCapitalize='off'
                            autoCorrect='off'
                            spellCheck={false}
                            autoFocus
                            disabled={creating}
                        />
                    </label>

                    <label className={styles.label}>
                        {intl.formatMessage(messages.descriptionLabel)}
                        <input
                            className={styles.input}
                            type='text'
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder={intl.formatMessage(messages.descriptionPlaceholder)}
                            maxLength={MAX_QUICK_PROMPT_DESCRIPTION_LENGTH}
                            autoComplete='off'
                            autoCapitalize='off'
                            autoCorrect='off'
                            spellCheck={false}
                            disabled={creating}
                        />
                        <span className={styles.fieldMeta}>
                            {description.length}/{MAX_QUICK_PROMPT_DESCRIPTION_LENGTH}
                        </span>
                    </label>

                    <label className={styles.label}>
                        {intl.formatMessage(messages.promptLabel)}
                        <span className={styles.fieldHint}>
                            {intl.formatMessage(messages.promptHint, { example: '<my-cool-input>' })}
                        </span>
                        <textarea
                            className={styles.textarea}
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            placeholder={intl.formatMessage(messages.promptPlaceholder)}
                            autoComplete='off'
                            autoCapitalize='off'
                            autoCorrect='off'
                            spellCheck={false}
                            disabled={creating}
                        />
                    </label>

                    <div className={styles.inputsSection}>
                        {inputs.length > 0 ? (
                            <p className={styles.inputNameHint}>{intl.formatMessage(messages.inputNameHint)}</p>
                        ) : null}

                        {inputs.map((input, index) => {
                            const error = inputErrors[index] ?? null;
                            const showError =
                                error !== null &&
                                (error !== 'required' || showInputErrors || normalizeInputName(input.name).length > 0);
                            return (
                                <div key={index} className={styles.inputRowWrap}>
                                    <div className={styles.inputRow}>
                                        <input
                                            className={showError ? styles.inputRowFieldError : styles.inputRowField}
                                            type='text'
                                            value={input.name}
                                            onChange={(event) =>
                                                updateInput(index, {
                                                    name: sanitizeQuickPromptInputName(event.target.value),
                                                })
                                            }
                                            onBlur={() => {
                                                const trimmed = normalizeInputName(input.name);
                                                if (trimmed !== input.name) {
                                                    updateInput(index, { name: trimmed });
                                                }
                                                setShowInputErrors(true);
                                            }}
                                            placeholder={intl.formatMessage(messages.inputNamePlaceholder)}
                                            aria-label={intl.formatMessage(messages.inputNamePlaceholder)}
                                            aria-invalid={showError}
                                            autoComplete='off'
                                            autoCapitalize='off'
                                            autoCorrect='off'
                                            spellCheck={false}
                                            disabled={creating}
                                        />
                                        <select
                                            className={styles.inputRowSelect}
                                            value={input.type}
                                            aria-label={intl.formatMessage(messages.inputTypeLabel)}
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                if (isQuickPromptInputType(next)) {
                                                    updateInput(index, { type: next });
                                                }
                                            }}
                                            disabled={creating}
                                        >
                                            <option value='string'>{intl.formatMessage(messages.typeString)}</option>
                                            <option value='number'>{intl.formatMessage(messages.typeNumber)}</option>
                                            <option value='boolean'>{intl.formatMessage(messages.typeBoolean)}</option>
                                        </select>
                                        <button
                                            type='button'
                                            className={styles.removeInput}
                                            aria-label={intl.formatMessage(messages.removeInput)}
                                            onClick={() => removeInput(index)}
                                            disabled={creating}
                                        >
                                            <RemoveIcon />
                                        </button>
                                    </div>
                                    {showError && error ? (
                                        <p className={styles.inputError}>{errorMessage(error)}</p>
                                    ) : null}
                                </div>
                            );
                        })}

                        {inputs.length < MAX_QUICK_PROMPT_INPUTS ? (
                            <div className={styles.addInputWrap}>
                                <Button
                                    type='button'
                                    variant='secondary'
                                    fullWidth={false}
                                    onClick={addInput}
                                    disabled={creating}
                                >
                                    {intl.formatMessage(messages.addInput)}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </RoutePanel>
        </form>
    );
}
