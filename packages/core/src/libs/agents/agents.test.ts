import { getAgentCommandCandidates, isAgentId, SUPPORTED_AGENTS } from './agents.js';

describe('isAgentId', () => {
    it('accepts known agent ids', () => {
        for (const agent of SUPPORTED_AGENTS) {
            expect(isAgentId(agent.id)).toBe(true);
        }
    });

    it('rejects unknown or non-string values', () => {
        expect(isAgentId('gpt')).toBe(false);
        expect(isAgentId('')).toBe(false);
        expect(isAgentId(null)).toBe(false);
        expect(isAgentId(undefined)).toBe(false);
        expect(isAgentId(1)).toBe(false);
    });
});

describe('getAgentCommandCandidates', () => {
    it('returns CLI binary aliases for each supported agent', () => {
        expect(getAgentCommandCandidates('cursor')).toEqual(['agent', 'cursor-agent']);
        expect(getAgentCommandCandidates('claude')).toEqual(['claude']);
        expect(getAgentCommandCandidates('rovo')).toEqual(['rovo', 'acli']);
    });
});
