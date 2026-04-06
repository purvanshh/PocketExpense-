import {
    type ExtractedFields,
    type MessageClassification,
    type SenderMetadata,
    GUARDRAILS,
} from './types';
import {
    ACCOUNT_PATTERNS,
    AMBIGUOUS_PATTERNS,
    BANK_SENDER_PATTERNS,
    CREDIT_PATTERNS,
    DEBIT_PATTERNS,
    IGNORE_PATTERNS,
    MERCHANT_PATTERNS,
    TIMESTAMP_PATTERNS,
    TRANSACTION_KEYWORDS,
} from './patterns';

// ═══════════════════════════════════════════
//  Stage 1: normalizeMessage
// ═══════════════════════════════════════════
export function normalizeMessage(raw: string): string {
    return raw
        .replace(/[\u200B-\u200D\uFEFF]/g, '')   // zero-width chars
        .replace(/\r\n|\r/g, '\n')                // normalize newlines
        .replace(/\n+/g, ' ')                     // flatten to single line
        .replace(/\s{2,}/g, ' ')                  // collapse whitespace
        .replace(/₹\s*/g, 'Rs.')                  // normalize ₹ to Rs.
        .replace(/INR\.?\s*/gi, 'Rs.')             // normalize INR
        .trim();
}

// ═══════════════════════════════════════════
//  Stage 2: detectSenderMetadata
// ═══════════════════════════════════════════
export function detectSenderMetadata(sender: string): SenderMetadata {
    if (!sender || sender.length < 3) {
        return { senderId: sender || '', isRecognizedBank: false, confidence: 0 };
    }

    const normalized = sender.toUpperCase().trim();
    const matched = BANK_SENDER_PATTERNS.some((p) => p.test(normalized));

    return {
        senderId: normalized,
        isRecognizedBank: matched,
        confidence: matched ? 1.0 : 0,
    };
}

// ═══════════════════════════════════════════
//  Stage 3: classifyMessageType
// ═══════════════════════════════════════════
export function classifyMessageType(normalized: string): MessageClassification {
    if (IGNORE_PATTERNS.some((p) => p.test(normalized))) return 'ignore';

    for (const pattern of DEBIT_PATTERNS) {
        if (pattern.regex.test(normalized)) return 'debit';
    }

    for (const pattern of CREDIT_PATTERNS) {
        if (pattern.regex.test(normalized)) return 'credit';
    }

    return 'ignore';
}

// ═══════════════════════════════════════════
//  Stage 4: extractFields
// ═══════════════════════════════════════════
export function extractFields(
    normalized: string,
    classification: MessageClassification,
    smsTimestamp?: Date,
): ExtractedFields {
    const result: ExtractedFields = {
        amount: null,
        merchant: null,
        accountLast4: null,
        timestamp: null,
        type: classification,
        amountCount: 0,
        hasTransactionKeyword: TRANSACTION_KEYWORDS.test(normalized),
    };

    // --- Amount ---
    const allAmounts = extractAllAmounts(normalized);
    result.amountCount = allAmounts.length;
    result.amount = extractPrimaryAmount(normalized, classification);

    // --- Merchant ---
    result.merchant = extractMerchant(normalized);

    // --- Account last 4 ---
    result.accountLast4 = extractAccountLast4(normalized);

    // --- Timestamp ---
    result.timestamp = extractTimestamp(normalized, smsTimestamp);

    return result;
}

// ═══════════════════════════════════════════
//  Internal helpers
// ═══════════════════════════════════════════

function extractPrimaryAmount(text: string, classification: MessageClassification): number | null {
    const patterns = classification === 'credit' ? CREDIT_PATTERNS : DEBIT_PATTERNS;

    for (const { regex, group } of patterns) {
        const match = text.match(regex);
        if (match?.[group]) {
            const parsed = parseStrictDecimal(match[group]);
            if (parsed !== null && passesGuardrails(parsed)) return parsed;
        }
    }

    return null;
}

function extractAllAmounts(text: string): number[] {
    const amountRegex = /(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d{0,2})/gi;
    const amounts: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = amountRegex.exec(text)) !== null) {
        const v = parseStrictDecimal(m[1]);
        if (v !== null && v > 0) amounts.push(v);
    }
    return amounts;
}

export function parseStrictDecimal(raw: string): number | null {
    const cleaned = raw.replace(/,/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
    const val = parseFloat(cleaned);
    if (!isFinite(val)) return null;
    return Math.round(val * 100) / 100;
}

function passesGuardrails(amount: number): boolean {
    return amount >= GUARDRAILS.MIN_TRANSACTION_AMOUNT && amount <= GUARDRAILS.MAX_TRANSACTION_AMOUNT;
}

function extractMerchant(text: string): string | null {
    for (const pattern of MERCHANT_PATTERNS) {
        const match = text.match(pattern);
        if (match?.[1]) {
            const cleaned = match[1]
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/[.\-,;:]+$/, '');

            if (cleaned.length >= GUARDRAILS.MIN_MERCHANT_LENGTH &&
                cleaned.length <= GUARDRAILS.MAX_MERCHANT_LENGTH) {
                return cleaned;
            }
        }
    }
    return null;
}

function extractAccountLast4(text: string): string | null {
    for (const pattern of ACCOUNT_PATTERNS) {
        const match = text.match(pattern);
        if (match?.[1] && /^\d{4}$/.test(match[1])) return match[1];
    }
    return null;
}

export function extractTimestamp(text: string, smsTimestamp?: Date): Date | null {
    for (const pattern of TIMESTAMP_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            const parsed = parseTimestampMatch(match, pattern);
            if (parsed && isReasonableDate(parsed)) return parsed;
        }
    }

    if (smsTimestamp && isReasonableDate(smsTimestamp)) return smsTimestamp;

    return null;
}

const MONTH_MAP: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseTimestampMatch(match: RegExpMatchArray, pattern: RegExp): Date | null {
    try {
        const src = pattern.source;
        if (src.includes('Jan|Feb')) {
            const day = parseInt(match[1], 10);
            const month = MONTH_MAP[match[2].toLowerCase().substring(0, 3)];
            let year = parseInt(match[3], 10);
            if (year < 100) year += 2000;
            if (month === undefined || isNaN(day) || isNaN(year)) return null;
            return new Date(year, month, day);
        }

        const g1 = parseInt(match[1], 10);
        const g2 = parseInt(match[2], 10);
        let g3 = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
        if (g3 < 100) g3 += 2000;

        const day = g1 > 12 ? g1 : g2 > 12 ? g2 : g1;
        const month = g1 > 12 ? g2 - 1 : g2 > 12 ? g1 - 1 : g2 - 1;

        if (isNaN(day) || isNaN(month) || isNaN(g3)) return null;
        if (month < 0 || month > 11 || day < 1 || day > 31) return null;

        const date = new Date(g3, month, day);

        if (match[4]) {
            let hours = parseInt(match[4], 10);
            const minutes = parseInt(match[5], 10) || 0;
            const ampm = match[7]?.toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            date.setHours(hours, minutes, 0, 0);
        }

        return date;
    } catch {
        return null;
    }
}

function isReasonableDate(d: Date): boolean {
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    const oneDayAhead = now + 24 * 60 * 60 * 1000;
    const ts = d.getTime();
    return isFinite(ts) && ts >= oneYearAgo && ts <= oneDayAhead;
}

// ═══════════════════════════════════════════
//  Ambiguity detection (used by confidence)
// ═══════════════════════════════════════════
export function detectAmbiguity(normalized: string): {
    hasAmbiguousKeyword: boolean;
    hasSuspiciousFormatting: boolean;
} {
    const hasAmbiguousKeyword = AMBIGUOUS_PATTERNS.some((p) => p.test(normalized));
    const hasSuspiciousFormatting =
        (normalized.match(/[!]{2,}/g) || []).length > 0 ||
        normalized.length > 500 ||
        (normalized.match(/https?:\/\//gi) || []).length > 0;

    return { hasAmbiguousKeyword, hasSuspiciousFormatting };
}
