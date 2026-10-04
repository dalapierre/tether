import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 60 * 60 * 1000; // ~1 hour

type TokenPayload = {
    exp: number;
    jti: string;
};

function requireAccessKey(): string {
    const key = process.env.ACCESS_KEY;
    if (!key) {
        throw new Error('ACCESS_KEY is not configured');
    }
    return key;
}

function sign(payloadB64: string, secret: string): string {
    return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
    const digA = createHash('sha256').update(a).digest();
    const digB = createHash('sha256').update(b).digest();
    return timingSafeEqual(digA, digB);
}

export function isAccessKeyConfigured(): boolean {
    return Boolean(process.env.ACCESS_KEY);
}

export function validateAccessKey(candidate: string): boolean {
    if (!isAccessKeyConfigured()) return false;
    return safeEqual(candidate, requireAccessKey());
}

export function createAccessToken(): { token: string; expiresAt: number } {
    const secret = requireAccessKey();
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const payload: TokenPayload = {
        exp: expiresAt,
        jti: randomBytes(16).toString('hex'),
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = sign(payloadB64, secret);
    return { token: `${payloadB64}.${signature}`, expiresAt };
}

export function verifyAccessToken(token: string): boolean {
    if (!isAccessKeyConfigured()) return false;

    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return false;

    const expected = sign(payloadB64, requireAccessKey());
    if (!safeEqual(signature, expected)) return false;

    try {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as TokenPayload;
        if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}
