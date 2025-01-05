export function zip<T, U>(embedding: T[], metadata: U[]): [T, U][] {
    const length = Math.min(embedding.length, metadata.length);
    return Array.from({ length }, (_, i) => [embedding[i], metadata[i]]);
}