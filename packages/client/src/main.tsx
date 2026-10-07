import logoLight from '@client/assets/logo_light.png';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@client/modules/app';
import './index.css';

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = logoLight;
document.head.appendChild(favicon);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
