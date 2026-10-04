import { ApiError, apiFetch } from '@client/libs/api/client';

export type Repository = {
    id: string;
    name: string;
};

type ListResponse = {
    repositories: Repository[];
};

type CreateResponse = {
    repository: Repository;
};

export async function listRepositories(): Promise<Repository[]> {
    const res = await apiFetch('/api/repositories');

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as ListResponse;
    return data.repositories;
}

export async function createRepository(name: string): Promise<Repository> {
    const res = await apiFetch('/api/repositories', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as CreateResponse;
    return data.repository;
}
