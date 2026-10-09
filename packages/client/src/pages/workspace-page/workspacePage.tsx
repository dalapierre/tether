import { useIntl } from 'react-intl';
import { messages } from './workspacePage.messages';
import { styles } from './workspacePage.styles';

export function WorkspacePage() {
    const intl = useIntl();

    return (
        <div className={styles.root}>
            <p className={styles.message}>{intl.formatMessage(messages.selectSession)}</p>
        </div>
    );
}
