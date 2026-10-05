import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { SearchSelect } from '@client/components/search-select';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { createSession } from '@client/libs/api/sessions';
import { getSettings, type AgentProfile } from '@client/libs/api/settings';
import { isValidBranchName } from '@client/libs/git/branchName';
import { showToast } from '@client/modules/toast';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './newSession.messages';
import { styles } from './newSession.styles';
import type { NewSessionProps } from './newSession.types';

export function NewSession({ onClose, onStarted }: NewSessionProps) {
    const intl = useIntl();
    const [name, setName] = useState('');
    const [profileId, setProfileId] = useState('');
    const [repositoryId, setRepositoryId] = useState('');
    const [branch, setBranch] = useState('');
    const [profiles, setProfiles] = useState<AgentProfile[]>([]);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listRepositories()])
            .then(([settings, items]) => {
                if (cancelled) return;
                setProfiles(settings.profiles);
                setProfileId(settings.defaultProfileId);
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

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !starting) {
                onClose();
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose, starting]);

    const selectedProfile = useMemo(
        () => profiles.find((profile) => profile.id === profileId) ?? null,
        [profiles, profileId],
    );

    const profileOptions = useMemo(
        () => profiles.map((profile) => ({ value: profile.id, label: profile.name })),
        [profiles],
    );

    const isCoding = selectedProfile?.type === 'coding';
    const usesWorktrees = isCoding && selectedProfile?.useWorktrees !== false;

    async function handleStart() {
        const trimmedName = name.trim();
        if (!trimmedName || !profileId || !selectedProfile || starting) return;

        if (selectedProfile.type === 'coding') {
            if (!repositoryId) return;

            if (usesWorktrees) {
                const trimmedBranch = branch.trim();
                if (!trimmedBranch) return;
                if (!isValidBranchName(trimmedBranch)) {
                    showToast('invalid-branch-name');
                    return;
                }

                setStarting(true);
                try {
                    const session = await createSession({
                        profileId,
                        name: trimmedName,
                        repositoryId,
                        branch: trimmedBranch,
                    });
                    onStarted(session);
                } catch (err: unknown) {
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.startFailed),
                    );
                    setStarting(false);
                }
                return;
            }

            setStarting(true);
            try {
                const session = await createSession({
                    profileId,
                    name: trimmedName,
                    repositoryId,
                });
                onStarted(session);
            } catch (err: unknown) {
                showToast(
                    'generic-error',
                    err instanceof Error ? err.message : intl.formatMessage(messages.startFailed),
                );
                setStarting(false);
            }
            return;
        }

        setStarting(true);
        try {
            const session = await createSession({
                profileId,
                name: trimmedName,
            });
            onStarted(session);
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.startFailed));
            setStarting(false);
        }
    }

    const canStart =
        !loading &&
        !starting &&
        name.trim().length > 0 &&
        Boolean(profileId) &&
        Boolean(selectedProfile) &&
        (selectedProfile?.type === 'conversation' ||
            (Boolean(repositoryId) && (!usesWorktrees || branch.trim().length > 0)));

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

                        <div>
                            <p className={styles.label}>{intl.formatMessage(messages.profileLabel)}</p>
                            <SearchSelect
                                options={profileOptions}
                                value={profileId || null}
                                onSelect={(option) => setProfileId(option.value)}
                                placeholder={intl.formatMessage(messages.profilePlaceholder)}
                                emptyMessage={intl.formatMessage(messages.profilesEmpty)}
                                noResultsMessage={intl.formatMessage(messages.profileNoResults)}
                                disabled={starting}
                                ariaLabel={intl.formatMessage(messages.profileLabel)}
                            />
                        </div>

                        {isCoding ? (
                            <>
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

                                {usesWorktrees ? (
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
                                            required
                                            disabled={starting}
                                        />
                                    </label>
                                ) : null}
                            </>
                        ) : null}
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
