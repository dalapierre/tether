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

export async function getRepository(slug: string): Promise<Repository | null> {
    const repositories = await listRepositories();
    return repositories.find((repository) => repository.id === slug) ?? null;
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

export async function deleteRepository(id: string): Promise<void> {
    const res = await apiFetch(`/api/repositories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }
}

type BranchesResponse = {
    branches: string[];
};

export async function listRepositoryBranches(id: string): Promise<string[]> {
    const res = await apiFetch(`/api/repositories/${encodeURIComponent(id)}/branches`);

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as BranchesResponse;
    return data.branches;
}

type DirectoriesResponse = {
    directories: string[];
};

export async function listRepositoryDirectories(id: string): Promise<string[]> {
    const res = await apiFetch(`/api/repositories/${encodeURIComponent(id)}/directories`);

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as DirectoriesResponse;
    return data.directories;
}

/** In-flight / completed directory lists keyed by repository id (page-lifetime cache). */
const directoryPrefetchByRepoId = new Map<string, Promise<string[]>>();

/**
 * Prefetch tracked directories for a repository. Concurrent callers and re-selects share one
 * request so large monorepo listings can warm in the background after project selection.
 */
export function prefetchRepositoryDirectories(id: string): Promise<string[]> {
    const existing = directoryPrefetchByRepoId.get(id);
    if (existing) {
        return existing;
    }

    const pending = listRepositoryDirectories(id).catch((err: unknown) => {
        directoryPrefetchByRepoId.delete(id);
        throw err;
    });
    directoryPrefetchByRepoId.set(id, pending);
    return pending;
}
