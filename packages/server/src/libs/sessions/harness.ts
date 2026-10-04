import type { AgentId } from '@server/libs/agents/agents.js';

export type HarnessCommand = {
    command: string;
    args: string[];
};

export function getHarnessCommand(agent: AgentId): HarnessCommand {
    switch (agent) {
        case 'cursor':
            return { command: 'agent', args: ['--trust'] };
    }
}
