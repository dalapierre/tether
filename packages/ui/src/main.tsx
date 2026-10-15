import { mount } from '@ui/mount';
import './index.css';

const root = document.getElementById('root');
if (!root) {
    throw new Error('Missing #root element');
}

mount(root);
