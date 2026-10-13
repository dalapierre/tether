import { sanitizeUrl } from './logger.js';

describe('sanitizeUrl', () => {
    it('redacts token query params while keeping path and other params', () => {
        expect(sanitizeUrl('/ws?token=secret&room=1')).toBe('/ws?token=%5Bredacted%5D&room=1');
    });

    it('leaves URLs without a token untouched', () => {
        expect(sanitizeUrl('/api/sessions?id=abc')).toBe('/api/sessions?id=abc');
    });

    it('returns the original string when URL parsing fails', () => {
        expect(sanitizeUrl('http://[')).toBe('http://[');
    });
});
