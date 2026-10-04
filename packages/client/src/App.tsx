import { useEffect, useState } from 'react';

type Health = {
    ok: boolean;
    service: string;
};

export default function App() {
    const [health, setHealth] = useState<Health | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/health')
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json() as Promise<Health>;
            })
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
