// ────────────────────────────────────────────
// IGNORE patterns: OTP, failed, promo, balance
// ────────────────────────────────────────────
export const IGNORE_PATTERNS: RegExp[] = [
    /\bOTP\b/i,
    /\bone.time.password\b/i,
    /\bverification.code\b/i,
    /\bpin\b.*\bexpir/i,
    /\bavailable.bal(?:ance)?\b/i,
    /\bavl\.?\s*bal\b/i,
    /\baccount.balance\b.*\bis\b/i,
    /\bbal(?:ance)?(?:\s+is)?\s*(?:rs\.?|inr\.?|₹)\s*[\d,]+/i,
    /\bfailed\b.*\btransaction\b/i,
    /\btransaction.failed\b/i,
    /\bdeclined\b/i,
    /\bunsuccessful\b/i,
    /\bnot.processed\b/i,
    /\bpromo(?:tion)?\b/i,
    /\boffer\b.*\bflat\b/i,
    /\bcashback\b.*\b(?:get|earn|win|up to)\b/i,
    /\bget\b.*\bcashback\b/i,
    /\blink\b.*\bhttps?:\/\//i,
    /\bDear Customer.*(?:offers?|deals?)\b/i,
    /\bupgrade\b.*\bplan\b/i,
    /\bemi\b.*\bavailable\b/i,
    /\bpre.?approved\b/i,
    /\bloan\b.*\boffer\b/i,
    /\bclick\b.*\bhere\b/i,
    /\breversal\b.*\binitiated\b/i,
];

// ────────────────────────────────────────────
// Bank sender ID patterns (India + international)
// ────────────────────────────────────────────
export const BANK_SENDER_PATTERNS: RegExp[] = [
    /^[A-Z]{2}-[A-Z]+BANK/i,
    /^[A-Z]{2}-[A-Z]{3,6}BK/i,
    /^[A-Z]{2}-(HDFCBK|SBIINB|ICICIB|AXISBK|KOTAKB|PNBSMS|BOIIND|CANBNK|UNIONB|IDFCFB)/i,
    /^[A-Z]{2}-(PAYTM|PHONEPE|GPAY|RAZORPAY)/i,
    /^[A-Z]{2}-(AMEX|CITI|HSBC|SCBANK)/i,
    /^[A-Z]{2}-(YESBNK|IDBIBK|RBLBNK|FEDBK|INDBNK|BOBSMS|CENTBK)/i,
    /^[A-Z]{2}-(SBICARD|HDFCCC|ICICIC|AXISCC)/i,
    /^[A-Z]{2}-(JIOMNY|AIRTLM|PPAY|BHIM)/i,
];

// ────────────────────────────────────────────
// Amount extraction: debit and credit patterns
// ────────────────────────────────────────────
export interface AmountPattern {
    regex: RegExp;
    group: number;
}

const INR = '(?:rs\\.?|inr\\.?|₹)\\s*';
const AMT = '([\\d,]+\\.?\\d{0,2})';

export const DEBIT_PATTERNS: AmountPattern[] = [
    { regex: new RegExp(`(?:debited|deducted)\\s*(?:by\\s*|for\\s*|with\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*(?:has been|was)?\\s*debited`, 'i'), group: 1 },
    { regex: new RegExp(`spent\\s*${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*spent`, 'i'), group: 1 },
    { regex: new RegExp(`(?:purchase|payment|pay)\\s*(?:of\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`(?:payment)\\s+${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*(?:spent|paid|charged)`, 'i'), group: 1 },
    { regex: new RegExp(`paid\\s*(?:to\\s+\\S+\\s+)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`paid\\s*${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`sent\\s*${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*(?:sent|paid|transferred)`, 'i'), group: 1 },
    { regex: new RegExp(`(?:withdrawn|withdrawal)\\s*(?:of\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*(?:withdrawn|withdrawal)`, 'i'), group: 1 },
    { regex: new RegExp(`txn\\s*(?:of\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`(?:dr|debit)\\s*${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*(?:dr|debit)`, 'i'), group: 1 },
    { regex: new RegExp(`(?:used|charged)\\s*(?:for\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`(?:used|charged)\\s*(?:at|on)\\s*.+?\\s*${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`(?:card|a\\/c|account)\\s*(?:XX|\\*+)?\\d{4}\\s*(?:has been\\s*)?(?:charged|debited|used)\\s*(?:for\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`(?:card|a\\/c)\\s*(?:\\S+\\s+)?(?:used|charged|debited)\\s*${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`transfer(?:red)?\\s*(?:from\\s+)?(?:A\\/c\\s*)?(?:XX)?\\d*\\s*(?:of\\s*|to\\s+\\S+\\s+)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`transfer\\s*(?:of\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*(?:transfer|debited|deducted|paid)`, 'i'), group: 1 },
    // Fallback: debited <word(s)> Rs.X
    { regex: new RegExp(`debited\\s+(?:\\S+\\s+){0,3}${INR}${AMT}`, 'i'), group: 1 },
];

export const CREDIT_PATTERNS: AmountPattern[] = [
    { regex: new RegExp(`(?:credited|received)\\s*(?:by\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*(?:has been|was)?\\s*credited`, 'i'), group: 1 },
    { regex: new RegExp(`received\\s*${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*received`, 'i'), group: 1 },
    { regex: new RegExp(`refund\\s*(?:of\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`(?:cr|credit)\\s*${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*(?:cr|credit)`, 'i'), group: 1 },
    { regex: new RegExp(`deposit(?:ed)?\\s*(?:of\\s*)?${INR}${AMT}`, 'i'), group: 1 },
    { regex: new RegExp(`${INR}${AMT}\\s*deposited`, 'i'), group: 1 },
    { regex: new RegExp(`cashback\\s*(?:of\\s*)?${INR}${AMT}`, 'i'), group: 1 },
];

// ────────────────────────────────────────────
// Merchant extraction patterns (ordered by specificity)
// ────────────────────────────────────────────
export const MERCHANT_PATTERNS: RegExp[] = [
    /(?:at|to|from|via|towards|@)\s+([A-Za-z0-9][\w\s&.'*-]{1,50}?)(?:\s+on\s|\s+ref\s|\s+upi\s|\s+dated|\s+via\s|\.\s|\s*$)/i,
    /(?:for)\s+([A-Za-z][A-Za-z\s&.'*-]{2,50}?)(?:\s+on\s|\s+from\s|\s+ref\s|\.\s|\s*$)/i,
    /(?:info|tdr|txn)\s*:\s*([A-Za-z][\w\s&.'*-]{1,40})/i,
    /VPA\s+([\w.-]+@[\w]+)/i,
    /UPI[-/:]?\s*([A-Za-z][\w\s&.'*-]{1,30})/i,
    /(?:merchant|payee)\s*:\s*([A-Za-z][\w\s&.'*-]{1,40})/i,
    /paid\s+to\s+([A-Za-z][\w\s&.'*-]{1,40}?)(?:\s+on|\s+ref|\s+from|\s*$)/i,
    /(?:transferr?ed?\s+to|sent\s+to)\s+([A-Za-z][\w\s&.'*-]{1,40}?)(?:\s+on|\s+ref|\s*$)/i,
    /(?:debited|deducted|spent).*?(?:at|to|for)\s+([A-Za-z][\w\s&.'*-]{2,40}?)(?:\s+on|\s+from|\.\s|\s*$)/i,
];

// ────────────────────────────────────────────
// Account last-4-digits extraction
// ────────────────────────────────────────────
export const ACCOUNT_PATTERNS: RegExp[] = [
    /(?:a\/c|ac|acct|account)\s*(?:no\.?\s*)?(?:x+|[*]+)(\d{4})/i,
    /(?:card)\s*(?:ending|no\.?)\s*(?:x+|[*]+)?(\d{4})/i,
    /(?:xx|XX)(\d{4})/,
    /[*]{2,}(\d{4})/,
    /(?:ending)\s*(\d{4})/i,
];

// ────────────────────────────────────────────
// Timestamp patterns inside SMS body
// ────────────────────────────────────────────
export const TIMESTAMP_PATTERNS: RegExp[] = [
    /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
    /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})/i,
    /on\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/,
];

// ────────────────────────────────────────────
// Ambiguity signals (presence reduces confidence)
// ────────────────────────────────────────────
export const AMBIGUOUS_PATTERNS: RegExp[] = [
    /\bif not you\b/i,
    /\bsuspicious\b/i,
    /\bfraud\b/i,
    /\btransaction.*(success|fail)/i,
    /\bpending\b.*\bverif/i,
];

export const TRANSACTION_KEYWORDS: RegExp =
    /\b(debited|credited|spent|received|paid|sent|withdrawn|withdrawal|purchase|payment|charged|transferred|deposit|refund|txn|transaction)\b/i;
