import { describe, expect, it } from '@jest/globals';
import { createLastCommandTracker } from './lastCommandTracker';

describe('createLastCommandTracker', () => {
    it('records the line submitted on Enter', () => {
        const tracker = createLastCommandTracker();
        tracker.pushInput('npm test\r');
        expect(tracker.getLastCommand()).toBe('npm test');
    });

    it('handles backspace before submit', () => {
        const tracker = createLastCommandTracker();
        tracker.pushInput('npm tset');
        tracker.pushInput('\x7f\x7f\x7f');
        tracker.pushInput('est\r');
        expect(tracker.getLastCommand()).toBe('npm test');
    });

    it('clears the line on Ctrl+U and Ctrl+C', () => {
        const tracker = createLastCommandTracker();
        tracker.pushInput('bad');
        tracker.pushInput('\x15');
        tracker.pushInput('good\r');
        expect(tracker.getLastCommand()).toBe('good');

        tracker.pushInput('abort');
        tracker.pushInput('\x03');
        tracker.pushInput('ok\n');
        expect(tracker.getLastCommand()).toBe('ok');
    });

    it('ignores empty submits', () => {
        const tracker = createLastCommandTracker();
        tracker.pushInput('first\r');
        tracker.pushInput('\r');
        expect(tracker.getLastCommand()).toBe('first');
    });
});
