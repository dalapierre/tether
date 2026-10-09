import { Button } from '@client/components/button';
import { panelLocationState } from '@client/libs/navigation/panelReturn';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useLocation, useNavigate } from 'react-router-dom';
import { messages } from './workspacePage.messages';
import { styles } from './workspacePage.styles';

export function WorkspacePage() {
    const intl = useIntl();
    const navigate = useNavigate();
    const location = useLocation();

    const openNewSession = useCallback(() => {
        navigate('/new-session', { state: panelLocationState(location.pathname, location.search) });
    }, [location.pathname, location.search, navigate]);

    return (
        <div className={styles.root}>
            <p className={styles.message}>{intl.formatMessage(messages.selectSession)}</p>
            <Button type='button' fullWidth={false} onClick={openNewSession}>
                {intl.formatMessage(messages.newSession)}
            </Button>
        </div>
    );
}
