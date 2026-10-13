import { Button } from '@ui/components/button';
import { useEditorTabNavigation } from '@ui/modules/editor-tabs';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './workspacePage.messages';
import { styles } from './workspacePage.styles';

export function WorkspacePage() {
    const intl = useIntl();
    const { openNewSessionTab } = useEditorTabNavigation();

    const openNewSession = useCallback(() => {
        openNewSessionTab();
    }, [openNewSessionTab]);

    return (
        <div className={styles.root}>
            <p className={styles.message}>{intl.formatMessage(messages.selectSession)}</p>
            <Button type='button' fullWidth={false} onClick={openNewSession}>
                {intl.formatMessage(messages.newSession)}
            </Button>
        </div>
    );
}
