import {
    errors,
    isQuickPromptInputType,
    logger,
    MAX_QUICK_PROMPT_DESCRIPTION_LENGTH,
    MAX_QUICK_PROMPT_INPUTS,
    type QuickPromptInput,
    type TetherHost,
} from '@tether/core';
import { Router } from 'express';

type RawInput = {
    name?: unknown;
    type?: unknown;
};

function parseInputs(raw: unknown): { ok: true; inputs: QuickPromptInput[] } | { ok: false; error: string } {
    if (raw === undefined) {
        return { ok: true, inputs: [] };
    }
    if (!Array.isArray(raw)) {
        return { ok: false, error: 'inputs must be an array' };
    }
    if (raw.length > MAX_QUICK_PROMPT_INPUTS) {
        return { ok: false, error: `At most ${MAX_QUICK_PROMPT_INPUTS} inputs are allowed` };
    }

    const inputs: QuickPromptInput[] = [];
    for (const item of raw as RawInput[]) {
        if (!item || typeof item !== 'object') {
            return { ok: false, error: 'Each input must be an object' };
        }
        if (typeof item.name !== 'string') {
            return { ok: false, error: 'Each input requires a name string' };
        }
        if (!isQuickPromptInputType(item.type)) {
            return { ok: false, error: 'Each input type must be string, number, or boolean' };
        }
        inputs.push({ name: item.name, type: item.type });
    }
    return { ok: true, inputs };
}

export function createQuickPromptsRouter(host: TetherHost): Router {
    const router = Router();

    router.get('/', async (_req, res) => {
        try {
            const prompts = await host.listQuickPrompts();
            res.json({ prompts });
        } catch (err: unknown) {
            logger.error(errors.quickPromptsListFailure, err);
            res.status(500).json({ error: 'Failed to list quick prompts' });
        }
    });

    function validationStatus(message: string): 400 | 500 {
        return message === 'Name is required' ||
            message === 'Prompt is required' ||
            message === 'Input name is required' ||
            message === 'Input names must be unique' ||
            message === 'Input name must be lowercase and dash-separated (e.g. my-cool-input)' ||
            message === 'Input type must be string, number, or boolean' ||
            message === `Description must be at most ${MAX_QUICK_PROMPT_DESCRIPTION_LENGTH} characters` ||
            message.startsWith('At most ')
            ? 400
            : 500;
    }

    router.post('/', async (req, res) => {
        const name = typeof req.body?.name === 'string' ? req.body.name : '';
        const description = typeof req.body?.description === 'string' ? req.body.description : '';
        const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
        const parsedInputs = parseInputs(req.body?.inputs);

        if (!parsedInputs.ok) {
            res.status(400).json({ error: parsedInputs.error });
            return;
        }

        try {
            const created = await host.createQuickPrompt({
                name,
                description,
                prompt,
                inputs: parsedInputs.inputs,
            });
            res.status(201).json({ prompt: created });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create quick prompt';
            const status = validationStatus(message);
            if (status === 500) {
                logger.error(errors.quickPromptsCreateFailure, err);
            }
            res.status(status).json({ error: status === 500 ? 'Failed to create quick prompt' : message });
        }
    });

    router.get('/:id', async (req, res) => {
        try {
            const prompt = await host.getQuickPrompt(req.params.id);
            if (!prompt) {
                res.status(404).json({ error: 'Quick prompt not found' });
                return;
            }
            res.json({ prompt });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to get quick prompt';
            if (message === 'Id is required') {
                res.status(400).json({ error: message });
                return;
            }
            logger.error(errors.quickPromptsGetFailure, err);
            res.status(500).json({ error: 'Failed to get quick prompt' });
        }
    });

    router.put('/:id', async (req, res) => {
        const name = typeof req.body?.name === 'string' ? req.body.name : '';
        const description = typeof req.body?.description === 'string' ? req.body.description : '';
        const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
        const parsedInputs = parseInputs(req.body?.inputs);

        if (!parsedInputs.ok) {
            res.status(400).json({ error: parsedInputs.error });
            return;
        }

        try {
            const updated = await host.updateQuickPrompt(req.params.id, {
                name,
                description,
                prompt,
                inputs: parsedInputs.inputs,
            });
            if (!updated) {
                res.status(404).json({ error: 'Quick prompt not found' });
                return;
            }
            res.json({ prompt: updated });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update quick prompt';
            if (message === 'Id is required') {
                res.status(400).json({ error: message });
                return;
            }
            const status = validationStatus(message);
            if (status === 500) {
                logger.error(errors.quickPromptsUpdateFailure, err);
            }
            res.status(status).json({ error: status === 500 ? 'Failed to update quick prompt' : message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const deleted = await host.deleteQuickPrompt(req.params.id);
            if (!deleted) {
                res.status(404).json({ error: 'Quick prompt not found' });
                return;
            }
            res.status(204).send();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete quick prompt';
            if (message === 'Id is required') {
                res.status(400).json({ error: message });
                return;
            }
            logger.error(errors.quickPromptsDeleteFailure, err);
            res.status(500).json({ error: 'Failed to delete quick prompt' });
        }
    });

    return router;
}
