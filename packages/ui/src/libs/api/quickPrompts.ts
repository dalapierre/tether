import { ApiError, apiFetch } from '@ui/libs/api/client';

export const MAX_QUICK_PROMPT_INPUTS = 5;
export const MAX_QUICK_PROMPT_DESCRIPTION_LENGTH = 255;

export const QUICK_PROMPT_INPUT_TYPES = ['string', 'number', 'boolean'] as const;

export type QuickPromptInputType = (typeof QUICK_PROMPT_INPUT_TYPES)[number];

export type QuickPromptInput = {
    name: string;
    type: QuickPromptInputType;
};

export type QuickPrompt = {
    id: string;
    name: string;
    description: string;
    prompt: string;
    inputs: QuickPromptInput[];
};

export type CreateQuickPromptBody = {
    name: string;
    description: string;
    prompt: string;
    inputs: QuickPromptInput[];
};

const INPUT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ListResponse = {
    prompts: QuickPrompt[];
};

type CreateResponse = {
    prompt: QuickPrompt;
};

export function isQuickPromptInputType(value: unknown): value is QuickPromptInputType {
    return typeof value === 'string' && (QUICK_PROMPT_INPUT_TYPES as readonly string[]).includes(value);
}

export function isValidQuickPromptInputName(value: string): boolean {
    return INPUT_NAME_PATTERN.test(value);
}

/** Normalize typed text toward a kebab-case input id while editing. */
export function sanitizeQuickPromptInputName(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-{2,}/g, '-');
}

export function fillQuickPrompt(prompt: string, values: Record<string, string>): string {
    let result = prompt;
    for (const [name, value] of Object.entries(values)) {
        result = result.split(`<${name}>`).join(value);
    }
    return result;
}

export async function listQuickPrompts(): Promise<QuickPrompt[]> {
    const res = await apiFetch('/api/quick-prompts');

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as ListResponse;
    if (!Array.isArray(data.prompts)) {
        return [];
    }
    return data.prompts.map((prompt) => ({
        ...prompt,
        description: typeof prompt.description === 'string' ? prompt.description : '',
    }));
}

export async function createQuickPrompt(body: CreateQuickPromptBody): Promise<QuickPrompt> {
    const res = await apiFetch('/api/quick-prompts', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, data?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as CreateResponse;
    return data.prompt;
}

export async function deleteQuickPrompt(id: string): Promise<void> {
    const res = await apiFetch(`/api/quick-prompts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, data?.error ?? `HTTP ${res.status}`);
    }
}

/** Dispatched after quick prompts are created/deleted so side lists can refresh. */
export const QUICK_PROMPTS_CHANGED_EVENT = 'tether:quick-prompts-changed';

export function notifyQuickPromptsChanged(): void {
    window.dispatchEvent(new Event(QUICK_PROMPTS_CHANGED_EVENT));
}
