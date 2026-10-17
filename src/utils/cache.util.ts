/**
 * High-performance, bounded, in-memory TTL cache utility.
 * Safe for multi-module public read operations with zero external dependencies.
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export class MemoryCache {
    private store: Map<string, CacheEntry<any>> = new Map();
    private maxEntries: number;
    private hits = 0;
    private misses = 0;

    constructor(maxEntries = 1000) {
        this.maxEntries = maxEntries;
    }

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            this.misses++;
            return undefined;
        }

        this.hits++;
        return entry.value as T;
    }

    set<T>(key: string, value: T, ttlSeconds: number): void {
        // Enforce maximum size via LRU-like eviction (Map preserves insertion order)
        if (this.store.size >= this.maxEntries) {
            const firstKey = this.store.keys().next().value;
            if (firstKey !== undefined) {
                this.store.delete(firstKey);
            }
        }

        const expiresAt = Date.now() + Math.max(ttlSeconds, 1) * 1000;
        this.store.set(key, { value, expiresAt });
    }

    delete(key: string): boolean {
        return this.store.delete(key);
    }

    deletePrefix(prefix: string): number {
        let deletedCount = 0;
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                deletedCount++;
            }
        }
        return deletedCount;
    }

    clear(): void {
        this.store.clear();
    }

    getStats() {
        return {
            size: this.store.size,
            maxEntries: this.maxEntries,
            hits: this.hits,
            misses: this.misses,
            hitRate: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) : 0,
        };
    }
}

// Global shared cache instance
export const appCache = new MemoryCache(2000);
