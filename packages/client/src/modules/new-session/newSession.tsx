import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { AGENTS, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { createSession } from '@client/libs/api/sessions';
import { getSettings } from '@client/libs/api/settings';
import { showToast } from '@client/modules/toast';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './newSession.messages';
import { styles } from './newSession.styles';
import type { NewSessionProps } from './newSession.types';

export function NewSession({ onClose, onStarted }: NewSessionProps) {
    const intl = useIntl();
    const [name, setName] = useState('');
    const [repositoryId, setRepositoryId] = useState('');
    const [branch, setBranch] = useState('');
    const [agent, setAgent] = useState<AgentId>('cursor');
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listRepositories()])
            .then(([settings, items]) => {
                if (cancelled) return;
                setAgent(isAgentId(settings.agent) ? settings.agent : 'cursor');
                setRepositories(items);
                if (items.length === 1) {
                    setRepositoryId(items[0].id);
                }
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
        if (!trimmedName || !repositoryId || !agent || starting) return;

        setStarting(true);
        try {
            const trimmedBranch = branch.trim();
            const session = await createSession({
                repositoryId,
                name: trimmedName,
                agent,
                ...(trimmedBranch ? { branch: trimmedBranch } : {}),
            });
            onStarted(session);
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.startFailed));
            setStarting(false);
        }
    }

    const canStart = !loading && !starting && name.trim().length > 0 && Boolean(repositoryId) && Boolean(agent);

    return (
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
        >
            <PageHeader
                crumbs={[
                    { label: intl.formatMessage(messages.sessionsCrumb), onClick: onClose },
                    { label: intl.formatMessage(messages.crumb) },
                ]}
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
                            {intl.formatMessage(messages.projectLabel)}
                            <select
                                className={styles.select}
                                value={repositoryId}
                                disabled={starting || repositories.length === 0}
                                onChange={(event) => setRepositoryId(event.target.value)}
                            >
                                <option value='' disabled>
                                    {intl.formatMessage(
                                        repositories.length === 0
                                            ? messages.projectsEmpty
                                            : messages.projectPlaceholder,
                                    )}
                                </option>
                                {repositories.map((repository) => (
                                    <option key={repository.id} value={repository.id}>
                                        {repository.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.label}>
                            {intl.formatMessage(messages.branchLabel)}
                            <input
                                className={styles.input}
                                type='text'
                                value={branch}
                                onChange={(event) => setBranch(event.target.value)}
                                placeholder={intl.formatMessage(messages.branchPlaceholder)}
                                autoComplete='off'
                                spellCheck={false}
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
