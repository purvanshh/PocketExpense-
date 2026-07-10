import {
    crossingKey,
    findCrossings,
    type BudgetScope,
} from '../../src/services/budgetThresholds';

const scope = (over: Partial<BudgetScope> = {}): BudgetScope => ({
    id: 'overall',
    label: 'Monthly',
    spent: 0,
    limit: 1000,
    ...over,
});

const none = () => new Set<string>();

describe('findCrossings', () => {
    it('stays quiet below the warning threshold', () => {
        expect(findCrossings([scope({ spent: 700 })], none(), 80, true)).toHaveLength(0);
    });

    it('warns once the threshold is reached', () => {
        const result = findCrossings([scope({ spent: 800 })], none(), 80, true);
        expect(result).toHaveLength(1);
        expect(result[0].kind).toBe('budget-warning');
        expect(result[0].threshold).toBe(80);
    });

    it('reports exceeded rather than warning when fully spent', () => {
        const result = findCrossings([scope({ spent: 1000 })], none(), 80, true);
        expect(result).toHaveLength(1);
        expect(result[0].kind).toBe('budget-exceeded');
    });

    it('never emits both a warning and an exceeded alert for one scope', () => {
        const result = findCrossings([scope({ spent: 1500 })], none(), 80, true);
        expect(result).toHaveLength(1);
    });

    it('suppresses an alert already recorded for this period', () => {
        const fired = new Set([crossingKey('overall', 80)]);
        expect(findCrossings([scope({ spent: 850 })], fired, 80, true)).toHaveLength(0);
    });

    it('still warns a different scope when one is suppressed', () => {
        const fired = new Set([crossingKey('overall', 80)]);
        const result = findCrossings(
            [scope({ spent: 850 }), scope({ id: 'food', label: 'Food', spent: 90, limit: 100 })],
            fired,
            80,
            true
        );
        expect(result).toHaveLength(1);
        expect(result[0].scope.id).toBe('food');
    });

    it('honours notifyOnExceed being off', () => {
        expect(findCrossings([scope({ spent: 1200 })], none(), 80, false)).toHaveLength(0);
    });

    it('ignores scopes with no usable limit', () => {
        expect(findCrossings([scope({ limit: 0, spent: 500 })], none(), 80, true)).toHaveLength(0);
        expect(findCrossings([scope({ limit: -5, spent: 500 })], none(), 80, true)).toHaveLength(0);
    });

    it('respects a custom warning threshold', () => {
        expect(findCrossings([scope({ spent: 550 })], none(), 50, true)).toHaveLength(1);
        expect(findCrossings([scope({ spent: 550 })], none(), 90, true)).toHaveLength(0);
    });

    it('includes the remaining amount in the warning copy', () => {
        const [crossing] = findCrossings([scope({ spent: 800 })], none(), 80, true);
        // ₹200 remains of a ₹1,000 budget.
        expect(crossing.message).toContain('200');
        expect(crossing.message).toContain('1,000');
    });

    it('labels the alert with the scope name', () => {
        const [crossing] = findCrossings(
            [scope({ id: 'food', label: 'Food', spent: 100, limit: 100 })],
            none(),
            80,
            true
        );
        expect(crossing.title).toBe('Food budget exceeded');
    });

    it('evaluates every scope independently', () => {
        const result = findCrossings(
            [
                scope({ spent: 200 }),
                scope({ id: 'food', label: 'Food', spent: 95, limit: 100 }),
                scope({ id: 'rent', label: 'Rent', spent: 120, limit: 100 }),
            ],
            none(),
            80,
            true
        );
        expect(result.map((c) => c.scope.id).sort()).toEqual(['food', 'rent']);
    });
});
