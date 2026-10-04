import { ApiError, apiFetch } from '@client/libs/api/client';

export type Repository = {
    id: string;
    name: string;
    path: string;
};

export type AvailableRepository = {
    name: string;
    path: string;
};

type ListResponse = {
    repositories: Repository[];
};

type AvailableResponse = {
    repositories: AvailableRepository[];
};

type AddResponse = {
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

export async function getRepository(id: string): Promise<Repository | null> {
    const repositories = await listRepositories();
    return repositories.find((repository) => repository.id === id) ?? null;
}

export async function listAvailableRepositories(): Promise<AvailableRepository[]> {
    const res = await apiFetch('/api/repositories/available');

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as AvailableResponse;
    return data.repositories;
}

export async function addRepository(repoPath: string): Promise<Repository> {
    const res = await apiFetch('/api/repositories', {
        method: 'POST',
        body: JSON.stringify({ path: repoPath }),
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as AddResponse;
    return data.repository;
}
