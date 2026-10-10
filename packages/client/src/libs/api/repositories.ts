import { ApiError, apiFetch } from '@client/libs/api/client';

export type Repository = {
    id: string;
    name: string;
    path: string;
};

type ListResponse = {
    repositories: Repository[];
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
