import { parseAmount, parseReceipt } from '../../src/services/receipt/parseReceipt';

describe('parseAmount', () => {
    it('parses plain and separated numbers', () => {
        expect(parseAmount('450')).toBe(450);
        expect(parseAmount('1,250.50')).toBe(1250.5);
        expect(parseAmount('1,00,000')).toBe(100000);
    });

    it('rejects malformed input', () => {
        expect(parseAmount('12.345')).toBeNull();
        expect(parseAmount('abc')).toBeNull();
        expect(parseAmount('')).toBeNull();
    });

    it('enforces guardrails at both ends', () => {
        expect(parseAmount('0')).toBeNull();
        expect(parseAmount('0.50')).toBeNull();
        expect(parseAmount('1')).toBe(1);
        expect(parseAmount('1000000')).toBe(1000000);
        expect(parseAmount('1000001')).toBeNull();
    });
});

describe('parseReceipt', () => {
    const RECEIPT = `
BIG BAZAAR
Sector 18, Noida
GSTIN: 09AABCU9603R1ZM
Invoice No: 4471
Date: 14/08/2026

Milk 1L            60.00
Bread              45.00
Eggs (12)          90.00

Sub Total         195.00
CGST 2.5%           4.88
SGST 2.5%           4.88
GRAND TOTAL       204.76
`;

    it('prefers the grand total over the subtotal and taxes', () => {
        const result = parseReceipt(RECEIPT);
        expect(result.amount).toBe(204.76);
    });

    it('extracts the merchant from the header', () => {
        expect(parseReceipt(RECEIPT).merchant).toBe('BIG BAZAAR');
    });

    it('reads a dd/mm/yyyy date', () => {
        const date = parseReceipt(RECEIPT).date;
        expect(date).not.toBeNull();
        expect(date!.getDate()).toBe(14);
        expect(date!.getMonth()).toBe(7); // August
        expect(date!.getFullYear()).toBe(2026);
    });

    it('scores a well-formed receipt as high confidence', () => {
        expect(parseReceipt(RECEIPT).confidence).toBeGreaterThan(0.7);
    });

    it('never returns a subtotal when a labelled total exists', () => {
        const result = parseReceipt(RECEIPT);
        expect(result.amount).not.toBe(195);
    });

    it('ignores tax lines when picking the total', () => {
        const text = 'SHOP\nTotal 500.00\nCGST 45.00\nSGST 45.00';
        expect(parseReceipt(text).amount).toBe(500);
    });

    it('falls back to the largest figure when nothing is labelled', () => {
        const text = 'CORNER CAFE\nTea 40\nSamosa 25\n65';
        expect(parseReceipt(text).amount).toBe(65);
    });

    it('reports low confidence for an unlabelled total', () => {
        const text = 'CORNER CAFE\n40\n25\n65';
        expect(parseReceipt(text).confidence).toBeLessThan(0.7);
    });

    it('handles empty and whitespace input without throwing', () => {
        expect(parseReceipt('')).toEqual({
            amount: null,
            merchant: null,
            date: null,
            confidence: 0,
            candidateAmounts: [],
        });
        expect(parseReceipt('   \n  \n ').amount).toBeNull();
    });

    it('skips header noise when choosing a merchant', () => {
        const text = 'TAX INVOICE\nRECEIPT\nCAFE COFFEE DAY\nTotal 250';
        expect(parseReceipt(text).merchant).toBe('CAFE COFFEE DAY');
    });

    it('rejects a date that is implausibly old', () => {
        const text = 'SHOP\nDate: 01/01/1999\nTotal 100';
        expect(parseReceipt(text).date).toBeNull();
    });

    it('parses a textual month', () => {
        const year = new Date().getFullYear();
        const text = `SHOP\nDate: 03 Aug ${year}\nTotal 100`;
        const date = parseReceipt(text).date;
        expect(date?.getMonth()).toBe(7);
    });

    it('returns candidate amounts largest first for a manual picker', () => {
        const result = parseReceipt(RECEIPT);
        expect(result.candidateAmounts[0]).toBe(204.76);
        expect(result.candidateAmounts).toContain(195);
    });
});
