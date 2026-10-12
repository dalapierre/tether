/**
 * Size a session shell to the visible viewport while the soft keyboard is open.
 *
 * Applied only on the session page — binding this globally (and especially
 * writing visualViewport.offsetTop into layout) causes focus/keyboard feedback
 * loops on mobile inputs (terminals, Monaco, paste sheet, etc.).
 *
 * Use the visible height only. Do not apply offsetTop or force-scroll the
 * document: that fights the browser's focus scrolling and produces rapid
 * focus/blur jitter. xterm's helper textarea is pinned via CSS instead so
 * iOS does not need to pan the visual viewport to reveal it.
 */
export function bindSessionViewport(element: HTMLElement): () => void {
    const sync = () => {
        const vv = window.visualViewport;
        if (!vv) {
            element.style.height = '';
            return;
        }

        const nextHeight = `${Math.round(vv.height)}px`;
        if (element.style.height !== nextHeight) {
            element.style.height = nextHeight;
        }
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
