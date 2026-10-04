import { fetchHealth } from '@client/libs/api/health';
import { useEffect, useState } from 'react';

export default function HomePage() {
    const [health, setHealth] = useState<{ service: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchHealth()
            .then(setHealth)
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Failed to reach server');
            });
    }, []);

    return (
        <main className='flex min-h-dvh items-center justify-center bg-zinc-950 px-6 text-zinc-100'>
            <div className='max-w-md text-center'>
                <h1 className='text-4xl font-semibold tracking-tight'>Tether</h1>
                <p className='mt-3 text-zinc-400'>Local control plane — UI and command server are wired up.</p>
                <p className='mt-6 text-sm text-zinc-500'>
                    {error ? `Server: ${error}` : health ? `Server: ${health.service} (ok)` : 'Checking server…'}
                </p>
            </div>
        </main>
    );
}
