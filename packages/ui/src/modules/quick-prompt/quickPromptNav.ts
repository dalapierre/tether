/** Step the highlighted palette row, wrapping at both ends. */
export function stepActiveIndex(current: number, length: number, delta: 1 | -1): number {
    if (length <= 0) return 0;
    return (current + delta + length) % length;
}

/** Clamp the highlight when the filtered list shrinks. */
export function clampActiveIndex(current: number, length: number): number {
    if (length <= 0) return 0;
    return Math.min(Math.max(current, 0), length - 1);
}
