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
    }
}
