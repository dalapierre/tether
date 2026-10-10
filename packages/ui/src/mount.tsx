import { App } from '@ui/modules/app';
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/** Mount the Tether UI into a host-owned DOM node. */
export function mount(rootElement: HTMLElement): Root {
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
    return root;
}
