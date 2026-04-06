export interface ParsedTransaction {
    isTransaction: boolean;
    confidence: number;
    amount: number | null;
    merchant: string | null;
    type: 'expense' | 'income' | null;
    date: Date | null;
    accountLast4: string | null;
}

export type MessageClassification = 'debit' | 'credit' | 'ignore';

export interface SenderMetadata {
    senderId: string;
    isRecognizedBank: boolean;
    confidence: number;
}

export interface ExtractedFields {
    amount: number | null;
    merchant: string | null;
    accountLast4: string | null;
    timestamp: Date | null;
    type: MessageClassification;
    amountCount: number;
    hasTransactionKeyword: boolean;
}

export interface ConfidenceWeights {
    senderRecognized: number;
    validAmountParsed: number;
    merchantExtracted: number;
    transactionKeyword: number;
    accountDigitsPresent: number;
    timestampExtracted: number;
}

export interface ConfidencePenalties {
    ambiguousKeyword: number;
    multipleAmounts: number;
    suspiciousFormatting: number;
}

export interface ConfidenceConfig {
    weights: ConfidenceWeights;
    penalties: ConfidencePenalties;
    thresholds: {
        autoShow: number;
        lowConfidence: number;
    };
}

export const EMPTY_RESULT: ParsedTransaction = {
    isTransaction: false,
    confidence: 0,
    amount: null,
    merchant: null,
    type: null,
    date: null,
    accountLast4: null,
};

export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
    weights: {
        senderRecognized: 0.25,
        validAmountParsed: 0.30,
        merchantExtracted: 0.20,
        transactionKeyword: 0.15,
        accountDigitsPresent: 0.05,
        timestampExtracted: 0.05,
    },
    penalties: {
        ambiguousKeyword: 0.20,
        multipleAmounts: 0.15,
        suspiciousFormatting: 0.10,
    },
    thresholds: {
        autoShow: 0.75,
        lowConfidence: 0.50,
    },
};

export const GUARDRAILS = {
    MAX_TRANSACTION_AMOUNT: 1_000_000,
    MIN_TRANSACTION_AMOUNT: 1,
    MIN_MERCHANT_LENGTH: 2,
    MAX_MERCHANT_LENGTH: 60,
    MIN_SMS_LENGTH: 15,
} as const;
