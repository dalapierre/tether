import { login } from '@client/libs/api/auth';
import { ApiError } from '@client/libs/api/client';
import { isAuthenticated } from '@client/libs/auth/session';
import { showToast } from '@client/modules/toast';
import { useState, type FormEvent } from 'react';
import { useIntl } from 'react-intl';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { messages } from './loginPage.messages';
import { styles } from './loginPage.styles';

export function LoginPage() {
    const intl = useIntl();
    const navigate = useNavigate();
    const location = useLocation();
    const [accessKey, setAccessKey] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (isAuthenticated()) {
        return <Navigate to='/' replace />;
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);

        try {
            await login(accessKey.trim());
            const from = (location.state as { from?: string } | null)?.from ?? '/';
            navigate(from, { replace: true });
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                showToast('generic-error', err.message);
            } else {
                showToast(
                    'generic-error',
                    err instanceof Error ? err.message : intl.formatMessage(messages.loginFailed),
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className={styles.main}>
            <div className={styles.panel}>
                <h1 className={styles.title}>{intl.formatMessage(messages.title)}</h1>
                <form className={styles.form} onSubmit={onSubmit}>
                    <label className={styles.label}>
                        {intl.formatMessage(messages.accessKeyLabel)}
                        <input
                            className={styles.input}
                            type='password'
                            autoComplete='current-password'
                            autoCapitalize='off'
                            autoCorrect='off'
                            value={accessKey}
                            onChange={(event) => setAccessKey(event.target.value)}
                            required
                        />
                    </label>
                    <button className={styles.button} type='submit' disabled={submitting || !accessKey.trim()}>
                        {submitting ? intl.formatMessage(messages.signingIn) : intl.formatMessage(messages.signIn)}
                    </button>
                </form>
            </div>
        </main>
    );
}
