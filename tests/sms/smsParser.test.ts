/**
 * SMS Parser Test Harness
 *
 * Runs 200 realistic SMS samples through the parsing pipeline and measures
 * detection accuracy, false positive rate, and confidence score distribution.
 *
 * Target: ≥95% accuracy, ≤3% false positives.
 *
 * NOTE: This test mocks `react-native` Platform to simulate Android.
 * Run with: npx jest tests/sms/smsParser.test.ts
 */

// Mock react-native Platform and AsyncStorage before any imports
jest.mock('react-native', () => ({
    Platform: { OS: 'android' },
    NativeEventEmitter: jest.fn(),
    NativeModules: {},
    Alert: { alert: jest.fn() },
    Linking: { openSettings: jest.fn() },
    PermissionsAndroid: {
        PERMISSIONS: { READ_SMS: 'android.permission.READ_SMS', RECEIVE_SMS: 'android.permission.RECEIVE_SMS' },
        RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
        check: jest.fn(),
        request: jest.fn(),
        requestMultiple: jest.fn(),
    },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    default: {
        getItem: jest.fn().mockResolvedValue(null),
        setItem: jest.fn().mockResolvedValue(undefined),
        removeItem: jest.fn().mockResolvedValue(undefined),
    },
    __esModule: true,
}));

import { parseSms } from '../../src/services/sms/parser';
import { normalizeMessage, detectSenderMetadata, classifyMessageType, extractFields, parseStrictDecimal } from '../../src/services/sms/pipeline';
import { computeConfidence, resetConfidenceConfig } from '../../src/services/sms/confidence';
import { SMS_SAMPLES, SmsSample } from './samples';

// ─── Accuracy calculator ───
interface AccuracyResult {
    accuracyPercentage: number;
    falsePositiveRate: number;
    averageConfidenceScore: number;
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
    totalSamples: number;
    failedIds: number[];
}

function calculateAccuracy(results: { id: number; expected: SmsSample['expected']; actual: ReturnType<typeof parseSms> }[]): AccuracyResult {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    const failedIds: number[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const { id, expected, actual } of results) {
        const actualIsTransaction = actual.transaction.isTransaction;
        const expectedIsTransaction = expected.isTransaction;

        if (expectedIsTransaction && actualIsTransaction) {
            // True positive — also check type and amount
            let correct = true;
            if (expected.type && actual.transaction.type !== expected.type) correct = false;
            if (expected.amount !== null && actual.transaction.amount !== expected.amount) correct = false;

            if (correct) tp++;
            else { fn++; failedIds.push(id); }
        } else if (!expectedIsTransaction && !actualIsTransaction) {
            tn++;
        } else if (!expectedIsTransaction && actualIsTransaction) {
            fp++;
            failedIds.push(id);
        } else {
            fn++;
            failedIds.push(id);
        }

        if (actual.transaction.confidence > 0) {
            totalConfidence += actual.transaction.confidence;
            confidenceCount++;
        }
    }

    const total = results.length;
    const correct = tp + tn;

    return {
        accuracyPercentage: Math.round((correct / total) * 10000) / 100,
        falsePositiveRate: Math.round((fp / total) * 10000) / 100,
        averageConfidenceScore: confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 100) / 100 : 0,
        truePositives: tp,
        trueNegatives: tn,
        falsePositives: fp,
        falseNegatives: fn,
        totalSamples: total,
        failedIds,
    };
}

// ─── Tests ───

beforeEach(() => {
    resetConfidenceConfig();
});

describe('SMS Parser Pipeline — Unit Tests', () => {
    describe('normalizeMessage', () => {
        test('strips zero-width chars and collapses whitespace', () => {
            const result = normalizeMessage('Hello\u200B  world\r\n  test');
            expect(result).toBe('Hello world test');
        });

        test('normalizes ₹ to Rs.', () => {
            const result = normalizeMessage('₹500 debited');
            expect(result).toBe('Rs.500 debited');
        });

        test('normalizes INR to Rs.', () => {
            const result = normalizeMessage('INR 1,250.50 debited');
            expect(result).toBe('Rs.1,250.50 debited');
        });
    });

    describe('detectSenderMetadata', () => {
        test('recognizes HDFC bank sender', () => {
            const meta = detectSenderMetadata('VM-HDFCBK');
            expect(meta.isRecognizedBank).toBe(true);
            expect(meta.confidence).toBe(1.0);
        });

        test('recognizes SBI sender', () => {
            expect(detectSenderMetadata('AD-SBIINB').isRecognizedBank).toBe(true);
        });

        test('rejects unknown sender', () => {
            const meta = detectSenderMetadata('RANDOM');
            expect(meta.isRecognizedBank).toBe(false);
            expect(meta.confidence).toBe(0);
        });

        test('handles empty sender', () => {
            const meta = detectSenderMetadata('');
            expect(meta.isRecognizedBank).toBe(false);
        });
    });

    describe('classifyMessageType', () => {
        test('classifies debit SMS', () => {
            expect(classifyMessageType('Rs.500 debited from your account')).toBe('debit');
        });

        test('classifies credit SMS', () => {
            expect(classifyMessageType('Rs.5000 credited to your account')).toBe('credit');
        });

        test('ignores OTP', () => {
            expect(classifyMessageType('Your OTP is 123456. Do not share.')).toBe('ignore');
        });

        test('ignores balance check', () => {
            expect(classifyMessageType('Your available balance is Rs.12345')).toBe('ignore');
        });

        test('ignores promo with link', () => {
            expect(classifyMessageType('Get 10% off! Link https://bank.co/offer')).toBe('ignore');
        });

        test('ignores failed transaction', () => {
            expect(classifyMessageType('Transaction failed for Rs.500 at Amazon')).toBe('ignore');
        });
    });

    describe('parseStrictDecimal', () => {
        test('parses valid integer', () => {
            expect(parseStrictDecimal('1250')).toBe(1250);
        });

        test('parses valid decimal', () => {
            expect(parseStrictDecimal('1250.50')).toBe(1250.50);
        });

        test('parses comma-separated', () => {
            expect(parseStrictDecimal('1,250.50')).toBe(1250.50);
        });

        test('rejects malformed decimal (3 places)', () => {
            expect(parseStrictDecimal('100.123')).toBe(null);
        });

        test('rejects empty string', () => {
            expect(parseStrictDecimal('')).toBe(null);
        });

        test('rejects text', () => {
            expect(parseStrictDecimal('abc')).toBe(null);
        });

        test('rejects multiple dots', () => {
            expect(parseStrictDecimal('100.50.25')).toBe(null);
        });
    });

    describe('extractFields', () => {
        test('extracts amount from debit message', () => {
            const fields = extractFields('Rs.450 debited from A/c XX1234 at Amazon', 'debit');
            expect(fields.amount).toBe(450);
            expect(fields.accountLast4).toBe('1234');
            expect(fields.merchant).toContain('Amazon');
        });

        test('extracts timestamp from SMS body', () => {
            const fields = extractFields('Rs.500 debited from A/c XX5678 on 03/03/2026', 'debit');
            expect(fields.timestamp).not.toBeNull();
            expect(fields.timestamp!.getFullYear()).toBe(2026);
        });

        test('counts multiple amounts', () => {
            const fields = extractFields('Rs.500 debited. Avl bal Rs.12000', 'debit');
            expect(fields.amountCount).toBeGreaterThanOrEqual(2);
        });
    });
});

describe('SMS Parser — Full Pipeline (200 samples)', () => {
    const results = SMS_SAMPLES.map((sample) => ({
        id: sample.id,
        expected: sample.expected,
        actual: parseSms(sample.body, sample.sender),
    }));

    const accuracy = calculateAccuracy(results);

    test('overall accuracy ≥ 95%', () => {
        console.log('\n═══════════════════════════════════════');
        console.log('  SMS PARSER ACCURACY REPORT');
        console.log('═══════════════════════════════════════');
        console.log(`  Total samples:        ${accuracy.totalSamples}`);
        console.log(`  True positives:       ${accuracy.truePositives}`);
        console.log(`  True negatives:       ${accuracy.trueNegatives}`);
        console.log(`  False positives:      ${accuracy.falsePositives}`);
        console.log(`  False negatives:      ${accuracy.falseNegatives}`);
        console.log(`  Accuracy:             ${accuracy.accuracyPercentage}%`);
        console.log(`  False positive rate:  ${accuracy.falsePositiveRate}%`);
        console.log(`  Avg confidence:       ${accuracy.averageConfidenceScore}`);
        if (accuracy.failedIds.length > 0) {
            console.log(`  Failed IDs:           ${accuracy.failedIds.join(', ')}`);
        }
        console.log('═══════════════════════════════════════\n');

        expect(accuracy.accuracyPercentage).toBeGreaterThanOrEqual(95);
    });

    test('false positive rate ≤ 3%', () => {
        expect(accuracy.falsePositiveRate).toBeLessThanOrEqual(3);
    });

    test('average confidence for detected transactions ≥ 0.6', () => {
        expect(accuracy.averageConfidenceScore).toBeGreaterThanOrEqual(0.6);
    });

    // ── Debit samples (1–120) ──
    describe('Debit detection (120 samples)', () => {
        const debitSamples = results.filter((r) => r.id >= 1 && r.id <= 120);

        test('detects ≥ 95% of debit transactions', () => {
            const detected = debitSamples.filter((r) => r.actual.transaction.isTransaction && r.actual.transaction.type === 'expense');
            const rate = (detected.length / debitSamples.length) * 100;
            expect(rate).toBeGreaterThanOrEqual(95);
        });

        test('amount parsing is exact for detected debits', () => {
            for (const r of debitSamples) {
                if (r.actual.transaction.isTransaction && r.expected.amount !== null) {
                    expect(r.actual.transaction.amount).toBe(r.expected.amount);
                }
            }
        });
    });

    // ── Credit samples (121–160) ──
    describe('Credit detection (40 samples)', () => {
        const creditSamples = results.filter((r) => r.id >= 121 && r.id <= 160);

        test('detects ≥ 90% of credit transactions', () => {
            const detected = creditSamples.filter((r) => r.actual.transaction.isTransaction && r.actual.transaction.type === 'income');
            const rate = (detected.length / creditSamples.length) * 100;
            expect(rate).toBeGreaterThanOrEqual(90);
        });
    });

    // ── OTP samples (161–180) — must IGNORE ──
    describe('OTP rejection (20 samples)', () => {
        const otpSamples = results.filter((r) => r.id >= 161 && r.id <= 180);

        test('rejects 100% of OTP messages', () => {
            const incorrectlyDetected = otpSamples.filter((r) => r.actual.transaction.isTransaction);
            expect(incorrectlyDetected.length).toBe(0);
        });
    });

    // ── Promo samples (181–200) — must IGNORE ──
    describe('Promo rejection (20 samples)', () => {
        const promoSamples = results.filter((r) => r.id >= 181 && r.id <= 200);

        test('rejects 100% of promo messages', () => {
            const incorrectlyDetected = promoSamples.filter((r) => r.actual.transaction.isTransaction);
            expect(incorrectlyDetected.length).toBe(0);
        });
    });

    // ── Merchant extraction spot checks ──
    describe('Merchant extraction', () => {
        const merchantSamples = results.filter((r) => {
            const sample = SMS_SAMPLES.find((s) => s.id === r.id);
            return sample?.expected.merchantSubstring;
        });

        test('extracts merchants for flagged samples', () => {
            let matched = 0;
            for (const r of merchantSamples) {
                const sample = SMS_SAMPLES.find((s) => s.id === r.id)!;
                const merchant = r.actual.transaction.merchant;
                if (merchant && merchant.toLowerCase().includes(sample.expected.merchantSubstring!.toLowerCase())) {
                    matched++;
                }
            }
            const rate = (matched / merchantSamples.length) * 100;
            expect(rate).toBeGreaterThanOrEqual(70);
        });
    });
});

describe('Edge Cases', () => {
    test('handles empty string', () => {
        const result = parseSms('', 'VM-HDFCBK');
        expect(result.transaction.isTransaction).toBe(false);
    });

    test('handles very short string', () => {
        const result = parseSms('Rs.5', 'VM-HDFCBK');
        expect(result.transaction.isTransaction).toBe(false);
    });

    test('handles amount at guardrail MAX boundary', () => {
        const result = parseSms('Rs.1,000,000 debited from A/c XX1234', 'VM-HDFCBK');
        expect(result.transaction.amount).toBe(1000000);
    });

    test('rejects amount above MAX', () => {
        const result = parseSms('Rs.1,000,001 debited from A/c XX1234', 'VM-HDFCBK');
        expect(result.transaction.isTransaction).toBe(false);
    });

    test('handles amount at guardrail MIN boundary', () => {
        const result = parseSms('Rs.1 debited from A/c XX1234 at TestStore', 'VM-HDFCBK');
        expect(result.transaction.amount).toBe(1);
    });

    test('rejects zero amount', () => {
        const result = parseSms('Rs.0 debited from A/c XX1234', 'VM-HDFCBK');
        expect(result.transaction.isTransaction).toBe(false);
    });

    test('handles malformed decimal in amount', () => {
        const result = parseSms('Rs.100.123 debited from A/c XX1234', 'VM-HDFCBK');
        expect(result.transaction.isTransaction).toBe(false);
    });

    test('rejects unrecognized sender with truly ambiguous message', () => {
        const result = parseSms('Rs.500 transaction update', 'UNKNOWN');
        expect(result.transaction.isTransaction).toBe(false);
    });

    test('penalizes confidence for unrecognized sender', () => {
        const recognized = parseSms('Rs.500 debited from A/c XX1234', 'VM-HDFCBK');
        const unrecognized = parseSms('Rs.500 debited from A/c XX1234', 'UNKNOWN');
        expect(recognized.transaction.confidence).toBeGreaterThan(unrecognized.transaction.confidence);
    });

    test('handles multiple currency amounts (confidence penalty)', () => {
        const result = parseSms('Rs.500 debited. Avl bal Rs.45000 in A/c XX1234', 'VM-HDFCBK');
        if (result.transaction.isTransaction) {
            expect(result.transaction.confidence).toBeLessThan(1);
        }
    });
});
