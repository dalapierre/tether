import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { AGENTS, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { createSession } from '@client/libs/api/sessions';
import { getSettings } from '@client/libs/api/settings';
import { showToast } from '@client/modules/toast';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './newSession.messages';
import { styles } from './newSession.styles';
import type { NewSessionProps } from './newSession.types';

export function NewSession({ projectName, repositoryId, onClose, onStarted }: NewSessionProps) {
    const intl = useIntl();
    const [name, setName] = useState('');
    const [agent, setAgent] = useState<AgentId>('cursor');
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getSettings()
            .then((settings) => {
                if (cancelled) return;
                setAgent(isAgentId(settings.agent) ? settings.agent : 'cursor');
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                    );
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
    }, [intl]);

    async function handleStart() {
        const trimmedName = name.trim();
        if (!trimmedName || !agent || starting) return;

        setStarting(true);
        try {
            const session = await createSession({
                repositoryId,
                name: trimmedName,
                agent,
            });
            onStarted(session);
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.startFailed));
            setStarting(false);
        }
    }

    const canStart = !loading && !starting && name.trim().length > 0 && Boolean(agent);

    return (
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
        >
            <PageHeader
                crumbs={[{ label: projectName, onClick: onClose }, { label: intl.formatMessage(messages.crumb) }]}
                showSettings={false}
                actions={
                    <IconButton label={intl.formatMessage(messages.close)} onClick={onClose} disabled={starting}>
                        ×
                    </IconButton>
                }
            />
            <div className={styles.body}>
                {loading ? <p className={styles.loading}>{intl.formatMessage(messages.loading)}</p> : null}

                {!loading ? (
                    <form
                        className={styles.form}
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleStart();
                        }}
                    >
                        <label className={styles.label}>
                            {intl.formatMessage(messages.nameLabel)}
                            <input
                                className={styles.input}
                                type='text'
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder={intl.formatMessage(messages.namePlaceholder)}
                                autoComplete='off'
                                spellCheck={false}
                                autoFocus
                                disabled={starting}
                            />
                        </label>

                        <label className={styles.label}>
                            {intl.formatMessage(messages.agentLabel)}
                            <select
                                className={styles.select}
                                value={agent}
                                disabled={starting}
                                onChange={(event) => {
                                    const next = event.target.value;
                                    if (isAgentId(next)) {
                                        setAgent(next);
                                    }
                                }}
                            >
                                {AGENTS.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {intl.formatMessage(option.labelMessage)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </form>
                ) : null}
            </div>
            <div className={styles.footer}>
                <Button type='button' onClick={() => void handleStart()} disabled={!canStart}>
                    {intl.formatMessage(starting ? messages.starting : messages.start)}
                </Button>
            </div>
        </div>
    );
}
