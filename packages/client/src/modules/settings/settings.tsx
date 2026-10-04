import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { AGENTS, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { ApiError } from '@client/libs/api/client';
import { getSettings, updateSettings } from '@client/libs/api/settings';
import { clearAccessToken } from '@client/libs/auth/session';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './settings.messages';
import { styles } from './settings.styles';
import type { SettingsProps } from './settings.types';

export function Settings({ onClose }: SettingsProps) {
    const intl = useIntl();
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

    async function handleSave() {
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
            setSavedMessage(intl.formatMessage(messages.saved));
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError(err instanceof Error ? err.message : intl.formatMessage(messages.saveFailed));
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
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
        >
            <PageHeader
                crumbs={[{ label: intl.formatMessage(messages.crumb) }]}
                showSettings={false}
                actions={
                    <IconButton label={intl.formatMessage(messages.close)} onClick={onClose}>
                        ×
                    </IconButton>
                }
            />
            <div className={styles.body}>
                <p className={styles.intro}>{intl.formatMessage(messages.intro)}</p>

                {loading ? <p className={styles.loading}>{intl.formatMessage(messages.loading)}</p> : null}

                {!loading ? (
                    <>
                        <div className={styles.fields}>
                            <label className={styles.label}>
                                {intl.formatMessage(messages.devDirLabel)}
                                <input
                                    className={styles.input}
                                    type='text'
                                    value={devDir}
                                    onChange={(event) => setDevDir(event.target.value)}
                                    placeholder={intl.formatMessage(messages.devDirPlaceholder)}
                                    autoComplete='off'
                                    spellCheck={false}
                                />
                            </label>
                            <p className={styles.hint}>{intl.formatMessage(messages.devDirHint)}</p>

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
                            {savedMessage ? <p className={styles.success}>{savedMessage}</p> : null}
                        </div>

                        <div className={styles.actions}>
                            <Button type='button' variant='secondary' onClick={onSignOut}>
                                {intl.formatMessage(messages.signOut)}
                            </Button>
                        </div>
                    </>
                ) : null}
            </div>
            {!loading ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={handleSave} disabled={saving}>
                        {saving ? intl.formatMessage(messages.saving) : intl.formatMessage(messages.save)}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
