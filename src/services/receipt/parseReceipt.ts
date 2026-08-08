/**
 * Heuristic extraction of an expense from OCR'd receipt text.
 *
 * Pure and synchronous so it can be unit-tested without a camera or a native
 * OCR binding. The philosophy mirrors the SMS parser: prefer returning null
 * over returning a confidently wrong number, and expose a confidence score so
 * the caller can decide how much to trust the result.
 */

export interface ParsedReceipt {
    amount: number | null;
    merchant: string | null;
    date: Date | null;
    /** 0–1. Above ~0.6 the fields are usually worth pre-filling. */
    confidence: number;
    /** Every currency-looking figure found, largest first — useful for a picker. */
    candidateAmounts: number[];
}

const GUARDRAILS = {
    MIN_AMOUNT: 1,
    MAX_AMOUNT: 1_000_000,
    MIN_MERCHANT: 3,
    MAX_MERCHANT: 40,
};

/**
 * Labels that precede the figure a customer actually paid. Ordered by
 * specificity: "grand total" beats a bare "total", which beats "amount".
 */
const TOTAL_LABELS: { pattern: RegExp; weight: number }[] = [
    { pattern: /\b(grand\s*total|amount\s*payable|net\s*payable|total\s*payable)\b/i, weight: 3 },
    { pattern: /\b(net\s*amount|invoice\s*total|bill\s*total)\b/i, weight: 3 },
    { pattern: /\btotal\b/i, weight: 2 },
    { pattern: /\b(amount|paid|balance\s*due)\b/i, weight: 1 },
];

/** Lines that look like a total but are not the figure we want. */
const NEGATIVE_LABELS =
    /\b(sub\s*-?\s*total|subtotal|tax|gst|cgst|sgst|igst|vat|discount|savings|change|tender|cash\s*back|round\s*off)\b/i;

/** Header noise that is never a merchant name. */
const MERCHANT_STOPWORDS =
    /\b(invoice|receipt|bill|tax|gst|order|token|cashier|counter|welcome|thank|customer|copy|duplicate|original)\b/i;

/**
 * Lines whose digits are identifiers, not money. Without this a GSTIN or an
 * invoice number contributes a large bogus figure to the candidate list.
 */
const IDENTIFIER_LINE =
    /\b(gstin|gst\s*no|tin|pan|invoice\s*(no|#)|bill\s*no|order\s*(no|id)|receipt\s*no|token|reg\s*no|phone|tel|mob(ile)?|contact|sector|pin\s*code|date|time)\b/i;

const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const toLines = (raw: string): string[] =>
    raw
        .replace(/\r\n|\r/g, '\n')
        .split('\n')
        .map((l) => l.replace(/\s{2,}/g, ' ').trim())
        .filter(Boolean);

/** Parse a number that may carry thousands separators. Rejects anything odd. */
export function parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/[,\s]/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

    const value = parseFloat(cleaned);
    if (!isFinite(value)) return null;
    if (value < GUARDRAILS.MIN_AMOUNT || value > GUARDRAILS.MAX_AMOUNT) return null;

    return Math.round(value * 100) / 100;
}

const AMOUNT_IN_LINE = /(rs\.?|inr|₹)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;

interface FoundAmount {
    value: number;
    /** A currency prefix or a decimal part marks this as money rather than a count. */
    moneyLike: boolean;
}

function amountsIn(line: string): FoundAmount[] {
    const found: FoundAmount[] = [];
    let m: RegExpExecArray | null;

    AMOUNT_IN_LINE.lastIndex = 0;
    while ((m = AMOUNT_IN_LINE.exec(line)) !== null) {
        const value = parseAmount(m[2]);
        if (value === null) continue;

        found.push({
            value,
            moneyLike: Boolean(m[1]) || m[2].includes('.'),
        });
    }

    return found;
}

interface ScoredAmount {
    value: number;
    score: number;
}

function findTotal(lines: string[]): { value: number | null; matchedLabel: boolean; all: number[] } {
    const scored: ScoredAmount[] = [];
    const moneyLike: number[] = [];
    const anyNumber: number[] = [];
    let matchedLabel = false;

    for (const line of lines) {
        // Identifier lines carry digits that are not money at all.
        if (IDENTIFIER_LINE.test(line)) continue;

        const found = amountsIn(line);
        if (found.length === 0) continue;

        for (const f of found) {
            anyNumber.push(f.value);
            if (f.moneyLike) moneyLike.push(f.value);
        }

        if (NEGATIVE_LABELS.test(line)) continue;

        for (const { pattern, weight } of TOTAL_LABELS) {
            if (pattern.test(line)) {
                matchedLabel = true;
                // The figure on a total line is the last one — the label and any
                // item count come first.
                scored.push({ value: found[found.length - 1].value, score: weight });
                break;
            }
        }
    }

    // Prefer figures that actually look like money; fall back to bare integers
    // only when a receipt is printed without decimals.
    const pool = moneyLike.length > 0 ? moneyLike : anyNumber;
    const unique = [...new Set(pool)].sort((a, b) => b - a);

    if (scored.length > 0) {
        scored.sort((a, b) => b.score - a.score || b.value - a.value);
        return { value: scored[0].value, matchedLabel, all: unique };
    }

    // No labelled total: the largest figure on a receipt is usually the total.
    return { value: unique[0] ?? null, matchedLabel: false, all: unique };
}

function findMerchant(lines: string[]): string | null {
    // Merchant names sit at the top, so only the first few lines are considered.
    for (const line of lines.slice(0, 5)) {
        const cleaned = line.replace(/[^\p{L}\p{N}&'’.\- ]/gu, '').trim();

        if (cleaned.length < GUARDRAILS.MIN_MERCHANT) continue;
        if (cleaned.length > GUARDRAILS.MAX_MERCHANT) continue;
        if (MERCHANT_STOPWORDS.test(cleaned)) continue;

        // Require it to be mostly letters, which rules out addresses and totals.
        const letters = (cleaned.match(/\p{L}/gu) || []).length;
        if (letters / cleaned.length < 0.6) continue;

        return cleaned.replace(/\s+/g, ' ');
    }

    return null;
}

const DATE_PATTERNS: RegExp[] = [
    /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/,
    /\b(\d{1,2})\s*[-\s]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*[-\s]\s*(\d{2,4})\b/i,
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
];

function isReasonable(d: Date): boolean {
    const ts = d.getTime();
    if (!isFinite(ts)) return false;

    const now = Date.now();
    const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;
    const tomorrow = now + 24 * 60 * 60 * 1000;

    return ts >= twoYearsAgo && ts <= tomorrow;
}

function findDate(lines: string[]): Date | null {
    const text = lines.join('\n');

    for (const pattern of DATE_PATTERNS) {
        const m = text.match(pattern);
        if (!m) continue;

        let parsed: Date | null = null;

        if (pattern === DATE_PATTERNS[2]) {
            parsed = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        } else if (pattern === DATE_PATTERNS[1]) {
            const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
            let year = Number(m[3]);
            if (year < 100) year += 2000;
            if (month !== undefined) parsed = new Date(year, month, Number(m[1]));
        } else {
            const a = Number(m[1]);
            const b = Number(m[2]);
            let year = Number(m[3]);
            if (year < 100) year += 2000;

            // Indian receipts are overwhelmingly dd/mm; only treat it as mm/dd
            // when the first field cannot be a day.
            const day = a > 12 && b <= 12 ? a : a <= 12 && b > 12 ? b : a;
            const month = a > 12 && b <= 12 ? b : a <= 12 && b > 12 ? a : b;

            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                parsed = new Date(year, month - 1, day);
            }
        }

        if (parsed && isReasonable(parsed)) return parsed;
    }

    return null;
}

export function parseReceipt(text: string): ParsedReceipt {
    const lines = toLines(text);

    if (lines.length === 0) {
        return { amount: null, merchant: null, date: null, confidence: 0, candidateAmounts: [] };
    }

    const { value: amount, matchedLabel, all } = findTotal(lines);
    const merchant = findMerchant(lines);
    const date = findDate(lines);

    // Confidence is dominated by the amount, since that is the field a wrong
    // guess actually costs the user something on.
    let confidence = 0;
    if (amount !== null) confidence += matchedLabel ? 0.55 : 0.3;
    if (merchant !== null) confidence += 0.2;
    if (date !== null) confidence += 0.15;
    if (lines.length >= 5) confidence += 0.1;

    return {
        amount,
        merchant,
        date,
        confidence: Math.min(1, Math.round(confidence * 100) / 100),
        candidateAmounts: all.slice(0, 8),
    };
}
