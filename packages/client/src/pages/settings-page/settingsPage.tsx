import { Button } from '@client/components/button';
import { PageHeader } from '@client/components/page-header';
import { AGENTS, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { ApiError } from '@client/libs/api/client';
import { getSettings, updateSettings } from '@client/libs/api/settings';
import { clearAccessToken } from '@client/libs/auth/session';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from './settingsPage.styles';

export function SettingsPage() {
    const navigate = useNavigate();
    const [devDir, setDevDir] = useState('');
    const [agent, setAgent] = useState<AgentId>('cursor');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        getSettings()
            .then((settings) => {
                if (!cancelled) {
                    setDevDir(settings.devDir);
                    setAgent(isAgentId(settings.agent) ? settings.agent : 'cursor');
                    setError(null);
                }
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

    async function onSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSavedMessage(null);
        setSaving(true);

        try {
            const settings = await updateSettings({
                devDir: devDir.trim(),
                agent,
            });
            setDevDir(settings.devDir);
            setAgent(settings.agent);
            setSavedMessage('Settings saved.');
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError(err instanceof Error ? err.message : 'Failed to save settings');
            }
        } finally {
            setSaving(false);
        }
    }

    function onSignOut() {
        clearAccessToken();
        navigate('/login', { replace: true });
    }

    return (
        <main className={styles.main}>
            <PageHeader crumbs={[{ label: 'settings' }]} />
            <div className={styles.body}>
                <p className={styles.intro}>Configure repositories and the agent for new sessions.</p>

                {loading ? <p className={styles.loading}>Loading settings…</p> : null}

                {!loading ? (
                    <form className={styles.form} onSubmit={onSave}>
                        <label className={styles.label}>
                            Development directory
                            <input
                                className={styles.input}
                                type='text'
                                value={devDir}
                                onChange={(event) => setDevDir(event.target.value)}
                                placeholder='/home/you/dev'
                                autoComplete='off'
                                spellCheck={false}
                            />
                        </label>
                        <p className={styles.hint}>Absolute path to the folder that contains your git repositories.</p>

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
                        {savedMessage ? <p className={styles.success}>{savedMessage}</p> : null}
                        <Button type='submit' disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </form>
                ) : null}

                <div className={styles.actions}>
                    <Button type='button' variant='secondary' onClick={onSignOut}>
                        Sign out
                    </Button>
                </div>
            </div>
        </main>
    );
}
