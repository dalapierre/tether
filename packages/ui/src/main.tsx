import logoLight from '@ui/assets/logo_light.png';
import { mount } from '@ui/mount';
import './index.css';

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = logoLight;
document.head.appendChild(favicon);

const root = document.getElementById('root');
if (!root) {
    throw new Error('Missing #root element');
}

mount(root);
