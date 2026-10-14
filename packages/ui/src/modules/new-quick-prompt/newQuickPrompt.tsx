import { RoutePanel } from '@ui/components/route-panel';
import { useIntl } from 'react-intl';
import { messages } from './newQuickPrompt.messages';
import { styles } from './newQuickPrompt.styles';
import type { NewQuickPromptProps } from './newQuickPrompt.types';

export function NewQuickPrompt({ onClose }: NewQuickPromptProps) {
    const intl = useIntl();

    return (
        <div className={styles.form}>
            <RoutePanel
                title={intl.formatMessage(messages.title)}
                onClose={onClose}
                closeLabel={intl.formatMessage(messages.close)}
                hideToolbar
                aria-label={intl.formatMessage(messages.ariaLabel)}
            >
                {null}
            </RoutePanel>
        </div>
    );
}
