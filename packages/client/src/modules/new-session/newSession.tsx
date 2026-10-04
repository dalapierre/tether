import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { AGENTS, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { getSettings } from '@client/libs/api/settings';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './newSession.messages';
import { styles } from './newSession.styles';
import type { NewSessionProps } from './newSession.types';

export function NewSession({ projectName, onClose, onStarted }: NewSessionProps) {
    const intl = useIntl();
    const [name, setName] = useState('');
    const [agent, setAgent] = useState<AgentId>('cursor');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        getSettings()
            .then((settings) => {
                if (cancelled) return;
                setAgent(isAgentId(settings.agent) ? settings.agent : 'cursor');
                setError(null);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
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

    function handleStart() {
        const trimmedName = name.trim();
        if (!trimmedName || !agent) return;
        onStarted({ name: trimmedName, agent });
    }

    const canStart = !loading && !error && name.trim().length > 0 && Boolean(agent);

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
                    <IconButton label={intl.formatMessage(messages.close)} onClick={onClose}>
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
                            handleStart();
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
                            />
                        </label>

                        <label className={styles.label}>
                            {intl.formatMessage(messages.agentLabel)}
                            <select
                                className={styles.select}
                                value={agent}
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

                        {error ? <p className={styles.error}>{error}</p> : null}
                    </form>
                ) : null}
            </div>
            <div className={styles.footer}>
                <Button type='button' onClick={handleStart} disabled={!canStart}>
                    {intl.formatMessage(messages.start)}
                </Button>
            </div>
        </div>
    );
}
