import {
    type ConfidenceConfig,
    type ExtractedFields,
    type SenderMetadata,
    DEFAULT_CONFIDENCE_CONFIG,
} from './types';

let activeConfig: ConfidenceConfig = { ...DEFAULT_CONFIDENCE_CONFIG };

export function setConfidenceConfig(config: Partial<ConfidenceConfig>): void {
    activeConfig = {
        weights: { ...activeConfig.weights, ...config.weights },
        penalties: { ...activeConfig.penalties, ...config.penalties },
        thresholds: { ...activeConfig.thresholds, ...config.thresholds },
    };
}

export function getConfidenceConfig(): ConfidenceConfig {
    return { ...activeConfig };
}

export function resetConfidenceConfig(): void {
    activeConfig = { ...DEFAULT_CONFIDENCE_CONFIG };
}

export function computeConfidence(
    sender: SenderMetadata,
    fields: ExtractedFields,
    ambiguity: { hasAmbiguousKeyword: boolean; hasSuspiciousFormatting: boolean },
): number {
    const { weights, penalties } = activeConfig;
    let score = 0;

    if (sender.isRecognizedBank) score += weights.senderRecognized;
    if (fields.amount !== null && fields.amount > 0) score += weights.validAmountParsed;
    if (fields.merchant !== null && fields.merchant.length >= 2) score += weights.merchantExtracted;
    if (fields.hasTransactionKeyword) score += weights.transactionKeyword;
    if (fields.accountLast4 !== null) score += weights.accountDigitsPresent;
    if (fields.timestamp !== null) score += weights.timestampExtracted;

    if (ambiguity.hasAmbiguousKeyword) score -= penalties.ambiguousKeyword;
    if (fields.amountCount > 1) score -= penalties.multipleAmounts;
    if (ambiguity.hasSuspiciousFormatting) score -= penalties.suspiciousFormatting;

    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

export type ConfidenceLevel = 'high' | 'low' | 'ignore';

export function classifyConfidence(score: number): ConfidenceLevel {
    if (score >= activeConfig.thresholds.autoShow) return 'high';
    if (score >= activeConfig.thresholds.lowConfidence) return 'low';
    return 'ignore';
}
