import { jest } from '@jest/globals';
import { errors, formatCriticalError, formatErrorMessage } from './errors.js';
import { logger } from './logger.js';

describe('formatErrorMessage', () => {
    it('returns the template when no values are provided', () => {
        expect(formatErrorMessage('Failed to start')).toBe('Failed to start');
    });

    it('replaces named placeholders', () => {
        expect(formatErrorMessage('Failed for session {sessionId}', { sessionId: 'abc' })).toBe(
            'Failed for session abc',
        );
    });

    it('leaves unknown placeholders intact', () => {
        expect(formatErrorMessage('Hello {name}', { other: 'x' })).toBe('Hello {name}');
    });
});

describe('formatCriticalError', () => {
    it('formats id, message, and stringifies an Error', () => {
        const err = new Error('boom');
        const formatted = formatCriticalError(errors.hostStartupFailure, err);

        expect(formatted.id).toBe('host.startup.failure');
        expect(formatted.message).toBe('Host failed to start');
        expect(formatted.err).toContain('boom');
    });

    it('accepts values then an error', () => {
        const formatted = formatCriticalError(errors.sessionInitFailure, { sessionId: 's1' }, new Error('init failed'));

        expect(formatted).toEqual({
            id: 'session.init.failure',
            message: 'Failed to initialize session s1',
            err: expect.stringContaining('init failed'),
        });
    });

    it('uses an empty err string when no error is provided', () => {
        const formatted = formatCriticalError(errors.sessionsPersistParseFailure);
        expect(formatted.err).toBe('');
    });
});

describe('logger.error', () => {
    it('logs the id-prefixed message and original error', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const err = new Error('disk full');

        logger.error(errors.sessionPersistDeleteFailure, { sessionId: 's9' }, err);

        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[session.persist.delete-failure] Failed to persist sessions after deleting s9'),
        );
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('disk full'));
        errorSpy.mockRestore();
    });

    it('supports the err-only overload', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const err = new Error('startup');

        logger.error(errors.hostStartupFailure, err);

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[host.startup.failure] Host failed to start'));
        errorSpy.mockRestore();
    });
});

describe('errors catalogue', () => {
    it('uses dotted kebab-case ids', () => {
        for (const entry of Object.values(errors)) {
            expect(entry.id).toMatch(/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/);
            expect(entry.id.includes('.')).toBe(true);
            expect(entry.message.length).toBeGreaterThan(0);
        }
    });
});
