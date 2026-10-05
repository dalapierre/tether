/**
 * Size a session shell to the visible viewport while the soft keyboard is open.
 *
 * Applied only on the session page — binding this globally (and especially
 * writing visualViewport.offsetTop into layout) causes focus/keyboard feedback
 * loops on mobile login and other inputs.
 */
export function bindSessionViewport(element: HTMLElement): () => void {
    const sync = () => {
        const vv = window.visualViewport;
        if (!vv) {
            element.style.height = '';
            return;
        }

        // Use the visible height only. Do not apply offsetTop — that fights the
        // browser's focus scrolling and produces rapid zoom/jitter.
        element.style.height = `${Math.round(vv.height)}px`;
    };

    sync();
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);

    return () => {
        window.removeEventListener('resize', sync);
        window.visualViewport?.removeEventListener('resize', sync);
        element.style.height = '';
    };
}
