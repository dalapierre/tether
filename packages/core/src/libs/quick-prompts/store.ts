import { getQuickPromptsFilePath, getTetherHomeDir } from '@core/libs/paths.js';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

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

export type CreateQuickPromptInput = {
    name: string;
    description?: string;
    prompt: string;
    inputs?: QuickPromptInput[];
};

export type UpdateQuickPromptInput = CreateQuickPromptInput;

/** Lowercase kebab-case id, e.g. `my-cool-input`. */
const INPUT_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const dataFile = getQuickPromptsFilePath();

let persistChain: Promise<void> = Promise.resolve();

export function isQuickPromptInputType(value: unknown): value is QuickPromptInputType {
    return typeof value === 'string' && (QUICK_PROMPT_INPUT_TYPES as readonly string[]).includes(value);
}

export function isValidQuickPromptInputName(value: string): boolean {
    return INPUT_NAME_PATTERN.test(value);
}

/** Lowercase angle-bracket placeholders so they stay aligned with input names. */
export function lowercaseQuickPromptPlaceholders(prompt: string): string {
    return prompt.replace(/<([^<>]+)>/g, (_match, name: string) => `<${name.toLowerCase()}>`);
}

function isQuickPromptInput(value: unknown): value is QuickPromptInput {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof (value as QuickPromptInput).name === 'string' &&
        isQuickPromptInputType((value as QuickPromptInput).type)
    );
}

function coerceQuickPrompt(value: unknown): QuickPrompt | null {
    if (
        !value ||
        typeof value !== 'object' ||
        typeof (value as QuickPrompt).id !== 'string' ||
        typeof (value as QuickPrompt).name !== 'string' ||
        typeof (value as QuickPrompt).prompt !== 'string' ||
        !Array.isArray((value as QuickPrompt).inputs) ||
        !(value as QuickPrompt).inputs.every(isQuickPromptInput)
    ) {
        return null;
    }

    const descriptionRaw = (value as { description?: unknown }).description;
    const description = typeof descriptionRaw === 'string' ? descriptionRaw : '';
    if (description.length > MAX_QUICK_PROMPT_DESCRIPTION_LENGTH) {
        return null;
    }

    return {
        id: (value as QuickPrompt).id,
        name: (value as QuickPrompt).name,
        description,
        prompt: (value as QuickPrompt).prompt,
        inputs: (value as QuickPrompt).inputs,
    };
}

async function readQuickPromptsFile(): Promise<QuickPrompt[]> {
    let raw: string;
    try {
        raw = await readFile(dataFile, 'utf8');
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const prompts: QuickPrompt[] = [];
    for (const item of parsed) {
        const prompt = coerceQuickPrompt(item);
        if (prompt) {
            prompts.push(prompt);
        }
    }
    return prompts;
}

async function writeQuickPromptsFile(prompts: QuickPrompt[]): Promise<void> {
    await mkdir(getTetherHomeDir(), { recursive: true });
    await writeFile(dataFile, `${JSON.stringify(prompts, null, 2)}\n`, 'utf8');
}

function persistQuickPrompts(prompts: QuickPrompt[]): Promise<void> {
    persistChain = persistChain.then(
        () => writeQuickPromptsFile(prompts),
        () => writeQuickPromptsFile(prompts),
    );
    return persistChain;
}

function normalizeInputs(inputs: QuickPromptInput[] | undefined): QuickPromptInput[] {
    if (!inputs || inputs.length === 0) {
        return [];
    }
    if (inputs.length > MAX_QUICK_PROMPT_INPUTS) {
        throw new Error(`At most ${MAX_QUICK_PROMPT_INPUTS} inputs are allowed`);
    }

    const normalized: QuickPromptInput[] = [];
    const seen = new Set<string>();

    for (const input of inputs) {
        const name = input.name.trim();
        if (!name) {
            throw new Error('Input name is required');
        }
        if (!isValidQuickPromptInputName(name)) {
            throw new Error('Input name must be lowercase and dash-separated (e.g. my-cool-input)');
        }
        if (!isQuickPromptInputType(input.type)) {
            throw new Error('Input type must be string, number, or boolean');
        }
        if (seen.has(name)) {
            throw new Error('Input names must be unique');
        }
        seen.add(name);
        normalized.push({ name, type: input.type });
    }

    return normalized;
}

export async function listQuickPrompts(): Promise<QuickPrompt[]> {
    return readQuickPromptsFile();
}

function normalizeQuickPromptFields(input: CreateQuickPromptInput): {
    name: string;
    description: string;
    prompt: string;
    inputs: QuickPromptInput[];
} {
    const name = input.name.trim();
    const description = (input.description ?? '').trim();
    const prompt = input.prompt.trim();

    if (!name) {
        throw new Error('Name is required');
    }
    if (description.length > MAX_QUICK_PROMPT_DESCRIPTION_LENGTH) {
        throw new Error(`Description must be at most ${MAX_QUICK_PROMPT_DESCRIPTION_LENGTH} characters`);
    }
    if (!prompt) {
        throw new Error('Prompt is required');
    }

    return {
        name,
        description,
        prompt,
        inputs: normalizeInputs(input.inputs),
    };
}

export async function createQuickPrompt(input: CreateQuickPromptInput): Promise<QuickPrompt> {
    const fields = normalizeQuickPromptFields(input);
    const next: QuickPrompt = {
        id: randomUUID(),
        ...fields,
    };

    const existing = await readQuickPromptsFile();
    const prompts = [...existing, next];
    await persistQuickPrompts(prompts);
    return next;
}

export async function getQuickPrompt(id: string): Promise<QuickPrompt | null> {
    const trimmed = id.trim();
    if (!trimmed) {
        throw new Error('Id is required');
    }
    const existing = await readQuickPromptsFile();
    return existing.find((prompt) => prompt.id === trimmed) ?? null;
}

export async function updateQuickPrompt(id: string, input: UpdateQuickPromptInput): Promise<QuickPrompt | null> {
    const trimmed = id.trim();
    if (!trimmed) {
        throw new Error('Id is required');
    }

    const fields = normalizeQuickPromptFields(input);
    const existing = await readQuickPromptsFile();
    const index = existing.findIndex((prompt) => prompt.id === trimmed);
    if (index === -1) {
        return null;
    }

    const next: QuickPrompt = {
        id: trimmed,
        ...fields,
    };
    const prompts = [...existing];
    prompts[index] = next;
    await persistQuickPrompts(prompts);
    return next;
}

export async function deleteQuickPrompt(id: string): Promise<boolean> {
    const trimmed = id.trim();
    if (!trimmed) {
        throw new Error('Id is required');
    }

    const existing = await readQuickPromptsFile();
    const next = existing.filter((prompt) => prompt.id !== trimmed);
    if (next.length === existing.length) {
        return false;
    }
    await persistQuickPrompts(next);
    return true;
}
