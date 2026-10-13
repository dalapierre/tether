import os from 'node:os';
import { usageFromSamples, type ProcessTreeSample } from './processUsage.js';

describe('usageFromSamples', () => {
    const previous: ProcessTreeSample = { cpuSeconds: 1, rssBytes: 100 * 1024 * 1024 };
    const next: ProcessTreeSample = { cpuSeconds: 3, rssBytes: 200 * 1024 * 1024 };

    it('returns null when elapsed time is not positive', () => {
        expect(usageFromSamples(previous, next, 0)).toBeNull();
        expect(usageFromSamples(previous, next, -5)).toBeNull();
    });

    it('computes CPU as percent of all cores and RAM as percent of total memory', () => {
        const elapsedMs = 1000;
        const result = usageFromSamples(previous, next, elapsedMs);
        expect(result).not.toBeNull();

        const cpuCount = Math.max(1, os.cpus().length);
        const expectedCpu = ((next.cpuSeconds - previous.cpuSeconds) / (elapsedMs / 1000) / cpuCount) * 100;
        const expectedRam = (next.rssBytes / os.totalmem()) * 100;

        expect(result!.cpuPercent).toBe(Math.round(expectedCpu * 10) / 10);
        expect(result!.ramPercent).toBe(Math.round(expectedRam * 10) / 10);
    });

    it('clamps negative CPU deltas to zero', () => {
        const result = usageFromSamples(next, previous, 1000);
        expect(result!.cpuPercent).toBe(0);
    });
});
