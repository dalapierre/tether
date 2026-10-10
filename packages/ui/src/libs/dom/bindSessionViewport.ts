/**
 * Pin the session shell to the visible viewport while the soft keyboard is open.
 *
 * On iOS Safari the keyboard shrinks visualViewport and often pans it
 * (`offsetTop > 0`) to reveal xterm's helper textarea. Sizing height alone
 * leaves the shell sitting above the visible region — a blank gap and a
 * terminal that looks "pushed up". Follow both height and offsetTop, and
 * listen to visualViewport `scroll` (where offsetTop changes arrive).
 *
 * Session-page only: binding this globally fights focus scrolling on forms
 * and other inputs.
 */
export function bindSessionViewport(element: HTMLElement): () => void {
    const clear = () => {
        element.style.position = '';
        element.style.left = '';
        element.style.right = '';
        element.style.width = '';
        element.style.top = '';
        element.style.height = '';
    };

    const sync = () => {
        const vv = window.visualViewport;
        if (!vv) {
            clear();
            return;
        }

        element.style.position = 'fixed';
        element.style.left = '0';
        element.style.right = '0';
        element.style.width = '100%';
        element.style.top = `${Math.round(vv.offsetTop)}px`;
        element.style.height = `${Math.round(vv.height)}px`;

        // Document scroll is separate from visualViewport offset; keep it
        // pinned so iOS focus-scroll can't drag the shell off-screen.
        if (window.scrollY !== 0) {
            window.scrollTo(0, 0);
        }
        const scroller = document.scrollingElement;
        if (scroller && scroller.scrollTop !== 0) {
            scroller.scrollTop = 0;
        }
    };

    sync();
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);

    return () => {
        window.removeEventListener('resize', sync);
        window.visualViewport?.removeEventListener('resize', sync);
        window.visualViewport?.removeEventListener('scroll', sync);
        clear();
    };
}
