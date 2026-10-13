import { parseClientMessage } from './terminalHub.js';

describe('parseClientMessage', () => {
    it('parses message, input, and resize payloads', () => {
        expect(parseClientMessage(JSON.stringify({ type: 'message', text: 'hi' }))).toEqual({
            type: 'message',
            text: 'hi',
        });
        expect(parseClientMessage(JSON.stringify({ type: 'input', data: 'a' }))).toEqual({
            type: 'input',
            data: 'a',
        });
        expect(parseClientMessage(JSON.stringify({ type: 'resize', cols: 80, rows: 24 }))).toEqual({
            type: 'resize',
            cols: 80,
            rows: 24,
        });
    });

    it('rejects malformed JSON and incomplete payloads', () => {
        expect(parseClientMessage('{')).toBeNull();
        expect(parseClientMessage(JSON.stringify({ type: 'message' }))).toBeNull();
        expect(parseClientMessage(JSON.stringify({ type: 'input', data: 1 }))).toBeNull();
        expect(parseClientMessage(JSON.stringify({ type: 'resize', cols: NaN, rows: 24 }))).toBeNull();
        expect(parseClientMessage(JSON.stringify({ type: 'unknown' }))).toBeNull();
        expect(parseClientMessage(JSON.stringify(null))).toBeNull();
    });
});
