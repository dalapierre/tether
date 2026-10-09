import { PaneToolbar } from '@client/components/pane-toolbar';
import { styles } from './panel.styles';
import type { PanelProps } from './panel.types';

export function Panel({
    title,
    toolbarLeading,
    toolbarActions,
    toolbarClassName,
    children,
    className,
    ref,
    ...rest
}: PanelProps) {
    return (
        <div ref={ref} className={`${styles.root}${className ? ` ${className}` : ''}`} {...rest}>
            {title != null ? (
                <PaneToolbar title={title} leading={toolbarLeading} className={toolbarClassName}>
                    {toolbarActions}
                </PaneToolbar>
            ) : null}
            <div className={styles.body}>{children}</div>
        </div>
    );
}
