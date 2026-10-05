import type { AgentId } from '@server/libs/agents/agents.js';

export type HarnessCommand = {
    command: string;
    args: string[];
};

export type HarnessOptions = {
    yoloMode?: boolean;
};

export function getHarnessCommand(agent: AgentId, options: HarnessOptions = {}): HarnessCommand {
    switch (agent) {
        case 'cursor': {
            const args = ['--trust'];
            if (options.yoloMode) {
                args.push('--yolo');
            }
            return { command: 'agent', args };
        }
        case 'claude': {
            const args: string[] = [];
            if (options.yoloMode) {
                args.push('--dangerously-skip-permissions');
            }
            return { command: 'claude', args };
        }
        case 'codex': {
            const args: string[] = [];
            if (options.yoloMode) {
                args.push('--ask-for-approval', 'never');
            }
            return { command: 'codex', args };
        }
        case 'opencode': {
            const args: string[] = [];
            if (options.yoloMode) {
                args.push('--auto');
            }
            return { command: 'opencode', args };
        }
    }
}
