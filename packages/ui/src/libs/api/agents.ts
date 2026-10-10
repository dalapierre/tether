import { ApiError, apiFetch } from '@ui/libs/api/client';
import { isAgentId, type AgentId } from '@ui/libs/agents/agents';

export type AvailableAgent = {
    id: AgentId;
    label: string;
};

type AgentsResponse = {
    agents: Array<{ id: string; label: string }>;
};

export async function listAvailableAgents(): Promise<AvailableAgent[]> {
    const res = await apiFetch('/api/agents');

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as AgentsResponse;
    const agents: AvailableAgent[] = [];
    for (const agent of data.agents) {
        if (typeof agent.label !== 'string' || !isAgentId(agent.id)) {
            continue;
        }
        agents.push({ id: agent.id, label: agent.label });
    }
    return agents;
}
