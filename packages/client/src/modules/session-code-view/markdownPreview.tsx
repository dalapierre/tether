import { forwardRef, type Ref } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { styles } from './sessionCodeView.styles';

const markdownComponents: Components = {
    h1: ({ children }) => <h1 className={styles.mdH1}>{children}</h1>,
    h2: ({ children }) => <h2 className={styles.mdH2}>{children}</h2>,
    h3: ({ children }) => <h3 className={styles.mdH3}>{children}</h3>,
    h4: ({ children }) => <h4 className={styles.mdH4}>{children}</h4>,
    p: ({ children }) => <p className={styles.mdP}>{children}</p>,
    a: ({ href, children }) => (
        <a className={styles.mdLink} href={href} target='_blank' rel='noreferrer noopener'>
            {children}
        </a>
    ),
    ul: ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
    ol: ({ children }) => <ol className={styles.mdOl}>{children}</ol>,
    li: ({ children }) => <li className={styles.mdLi}>{children}</li>,
    blockquote: ({ children }) => <blockquote className={styles.mdBlockquote}>{children}</blockquote>,
    hr: () => <hr className={styles.mdHr} />,
    table: ({ children }) => (
        <div className={styles.mdTableWrap}>
            <table className={styles.mdTable}>{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className={styles.mdThead}>{children}</thead>,
    th: ({ children }) => <th className={styles.mdTh}>{children}</th>,
    td: ({ children }) => <td className={styles.mdTd}>{children}</td>,
    code: ({ className, children }) => {
        const isBlock = Boolean(className?.includes('language-'));
        if (isBlock) {
            return <code className={className}>{children}</code>;
        }
        return <code className={styles.mdInlineCode}>{children}</code>;
    },
    pre: ({ children }) => <pre className={styles.mdPre}>{children}</pre>,
    img: ({ src, alt }) => <img className={styles.mdImg} src={src} alt={alt ?? ''} />,
};

type MarkdownPreviewProps = {
    content: string;
    className?: string;
};

export const MarkdownPreview = forwardRef(function MarkdownPreview(
    { content, className }: MarkdownPreviewProps,
    ref: Ref<HTMLDivElement>,
) {
    return (
        <div ref={ref} className={className ?? styles.markdownPreview}>
            <div className={styles.markdownBody}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
});
