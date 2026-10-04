import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { AGENTS, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { getSettings } from '@client/libs/api/settings';
import { useEffect, useState } from 'react';
import { styles } from './newSession.styles';
import type { NewSessionProps } from './newSession.types';

export function NewSession({ projectName, onClose, onStarted }: NewSessionProps) {
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
                    setError(err instanceof Error ? err.message : 'Failed to load settings');
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

    function handleStart() {
        const trimmedName = name.trim();
        if (!trimmedName || !agent) return;
        onStarted({ name: trimmedName, agent });
    }

    const canStart = !loading && !error && name.trim().length > 0 && Boolean(agent);

    return (
        <div className={styles.root} role='dialog' aria-modal='true' aria-label='New session'>
            <PageHeader
                crumbs={[{ label: projectName, onClick: onClose }, { label: 'new session' }]}
                actions={
                    <IconButton label='Close' onClick={onClose}>
                        ×
                    </IconButton>
                }
            />
            <div className={styles.body}>
                {loading ? <p className={styles.loading}>Loading…</p> : null}

                {!loading ? (
                    <form
                        className={styles.form}
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleStart();
                        }}
                    >
                        <label className={styles.label}>
                            Name
                            <input
                                className={styles.input}
                                type='text'
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder='Session name'
                                autoComplete='off'
                                spellCheck={false}
                                autoFocus
                            />
                        </label>

                        <label className={styles.label}>
                            Agent
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
                                        {option.label}
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
                    Start
                </Button>
            </div>
        </div>
    );
}
