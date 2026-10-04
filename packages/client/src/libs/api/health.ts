export type Health = {
    ok: boolean;
    service: string;
};

export async function fetchHealth(): Promise<Health> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<Health>;
}
