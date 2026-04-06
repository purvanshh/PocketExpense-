import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sms_dedup_hashes';
const MAX_CACHE_SIZE = 200;
const TIME_WINDOW_MS = 2 * 60 * 1000; // 2-minute window for time-based dedup

interface CacheEntry {
    hash: string;
    ts: number;
}

let memoryCache: CacheEntry[] = [];
let initialized = false;
let writeLock = false;

function simpleHash(input: string): string {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
        const ch = input.charCodeAt(i);
        h = ((h << 5) - h + ch) | 0;
    }
    const h2 = input.split('').reduce((a, c) => {
        const ch = c.charCodeAt(0);
        return ((a << 7) ^ (a >>> 3) ^ ch) >>> 0;
    }, 0x811c9dc5);

    return `${(h >>> 0).toString(36)}_${h2.toString(36)}`;
}

export function generateTransactionHash(
    amount: number | null,
    merchant: string | null,
    type: string | null,
    accountLast4: string | null,
    date: Date | null,
): string {
    const dateKey = date
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${Math.floor(date.getMinutes() / 1)}`
        : 'nodate';

    const raw = [
        String(amount ?? 0),
        (merchant ?? '').toLowerCase().trim(),
        type ?? '',
        accountLast4 ?? '',
        dateKey,
    ].join('|');

    return simpleHash(raw);
}

async function loadCache(): Promise<void> {
    if (initialized) return;
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
            memoryCache = JSON.parse(stored);
            if (!Array.isArray(memoryCache)) memoryCache = [];
        }
    } catch {
        memoryCache = [];
    }
    initialized = true;
}

async function persistCache(): Promise<void> {
    if (writeLock) return;
    writeLock = true;
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
    } catch {
        // non-critical
    } finally {
        writeLock = false;
    }
}

function evictStale(): void {
    if (memoryCache.length > MAX_CACHE_SIZE) {
        memoryCache = memoryCache.slice(memoryCache.length - MAX_CACHE_SIZE);
    }
}

export async function isDuplicate(hash: string): Promise<boolean> {
    await loadCache();
    return memoryCache.some((e) => e.hash === hash);
}

export async function recordHash(hash: string): Promise<void> {
    await loadCache();
    if (memoryCache.some((e) => e.hash === hash)) return;
    memoryCache.push({ hash, ts: Date.now() });
    evictStale();
    await persistCache();
}

export async function isDuplicateWithinWindow(
    amount: number | null,
    type: string | null,
    windowMs: number = TIME_WINDOW_MS,
): Promise<boolean> {
    await loadCache();
    const now = Date.now();
    const amtStr = String(amount ?? 0);
    const typeStr = type ?? '';

    return memoryCache.some((entry) => {
        if (now - entry.ts > windowMs) return false;
        return entry.hash.includes(amtStr) || entry.hash.includes(typeStr);
    });
}

export async function clearDeduplicationCache(): Promise<void> {
    memoryCache = [];
    initialized = true;
    await AsyncStorage.removeItem(STORAGE_KEY);
}

export function _resetForTesting(): void {
    memoryCache = [];
    initialized = false;
    writeLock = false;
}
