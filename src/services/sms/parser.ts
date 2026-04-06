import { Platform } from 'react-native';
import {
    type ParsedTransaction,
    type SenderMetadata,
    type ExtractedFields,
    EMPTY_RESULT,
    GUARDRAILS,
} from './types';
import { BANK_SENDER_PATTERNS, TRANSACTION_KEYWORDS } from './patterns';
import {
    normalizeMessage,
    detectSenderMetadata,
    classifyMessageType,
    extractFields,
    detectAmbiguity,
} from './pipeline';
import { computeConfidence, classifyConfidence, type ConfidenceLevel } from './confidence';

export interface SmsParsePipelineResult {
    transaction: ParsedTransaction;
    confidenceLevel: ConfidenceLevel;
    sender: SenderMetadata;
}

export function parseSms(
    body: string,
    sender?: string,
    smsTimestamp?: Date,
): SmsParsePipelineResult {
    const ignored: SmsParsePipelineResult = {
        transaction: { ...EMPTY_RESULT },
        confidenceLevel: 'ignore',
        sender: { senderId: sender || '', isRecognizedBank: false, confidence: 0 },
    };

    if (Platform.OS !== 'android') return ignored;
    if (!body || body.length < GUARDRAILS.MIN_SMS_LENGTH) return ignored;

    // Stage 1: Normalize
    const normalized = normalizeMessage(body);
    if (normalized.length < GUARDRAILS.MIN_SMS_LENGTH) return ignored;

    // Stage 2: Sender metadata
    const senderMeta = detectSenderMetadata(sender || '');

    // Stage 3: Classify
    const classification = classifyMessageType(normalized);
    if (classification === 'ignore') {
        return { ...ignored, sender: senderMeta };
    }

    // Stage 4: Extract fields
    const fields: ExtractedFields = extractFields(normalized, classification, smsTimestamp);

    // Guardrails: reject invalid amounts
    if (fields.amount === null || fields.amount < GUARDRAILS.MIN_TRANSACTION_AMOUNT || fields.amount > GUARDRAILS.MAX_TRANSACTION_AMOUNT) {
        return { ...ignored, sender: senderMeta };
    }

    // Stage 5: Confidence
    const ambiguity = detectAmbiguity(normalized);
    const confidence = computeConfidence(senderMeta, fields, ambiguity);
    const confidenceLevel = classifyConfidence(confidence);

    // Safety: reject low-confidence from unrecognized senders
    if (!senderMeta.isRecognizedBank && confidence < 0.65) {
        return { ...ignored, sender: senderMeta };
    }

    const transaction: ParsedTransaction = {
        isTransaction: confidenceLevel !== 'ignore',
        confidence,
        amount: fields.amount,
        merchant: fields.merchant,
        type: classification === 'credit' ? 'income' : 'expense',
        date: fields.timestamp,
        accountLast4: fields.accountLast4,
    };

    return {
        transaction,
        confidenceLevel,
        sender: senderMeta,
    };
}

export function isBankMessage(sender: string, body: string): boolean {
    if (Platform.OS !== 'android') return false;
    if (!sender && !body) return false;

    if (sender) {
        const upper = sender.toUpperCase().trim();
        if (BANK_SENDER_PATTERNS.some((p) => p.test(upper))) return true;
    }

    if (!body) return false;
    const amountPresent = /(?:rs\.?|inr\.?|₹)\s*[\d,]+/i;
    return TRANSACTION_KEYWORDS.test(body) && amountPresent.test(body);
}
