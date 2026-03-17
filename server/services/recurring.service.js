const Expense = require('../models/Expense');
const budgetService = require('./budget.service');
const logger = require('../config/logger');

class RecurringService {
    getNextRunDate(frequency, fromDate) {
        const next = new Date(fromDate);
        switch (frequency) {
            case 'daily':
                next.setDate(next.getDate() + 1);
                break;
            case 'weekly':
                next.setDate(next.getDate() + 7);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                break;
            default:
                throw new Error(`Invalid frequency: ${frequency}`);
        }
        return next;
    }

    async processDueRecurringTransactions() {
        const now = new Date();

        const dueTransactions = await Expense.find({
            isRecurring: true,
            frequency: { $in: ['daily', 'weekly', 'monthly'] },
            nextRunDate: { $lte: now },
        });

        if (dueTransactions.length === 0) {
            logger.debug('No recurring transactions due');
            return { processed: 0 };
        }

        logger.info(`Processing ${dueTransactions.length} recurring transactions`);

        let processed = 0;
        let errors = 0;

        for (const recurring of dueTransactions) {
            try {
                // Idempotency: skip if already processed within this period
                if (recurring.lastProcessedDate) {
                    const timeSinceLastProcess = now.getTime() - recurring.lastProcessedDate.getTime();
                    const minInterval = this.getMinIntervalMs(recurring.frequency);
                    if (timeSinceLastProcess < minInterval * 0.9) {
                        logger.debug(`Skipping ${recurring._id}: processed too recently`);
                        continue;
                    }
                }

                const newExpense = await Expense.create({
                    user: recurring.user,
                    amount: recurring.amount,
                    type: recurring.type,
                    category: recurring.category,
                    description: `${recurring.description} (recurring)`,
                    paymentMethod: recurring.paymentMethod,
                    date: now,
                    isRecurring: false,
                    syncStatus: 'synced',
                    localId: `recurring_${recurring._id}_${now.getTime()}`,
                });

                recurring.nextRunDate = this.getNextRunDate(recurring.frequency, now);
                recurring.lastProcessedDate = now;
                await recurring.save();

                await budgetService.recalculateForExpense(
                    recurring.user,
                    recurring.category,
                    now
                );

                processed++;
                logger.info(`Created recurring expense: ${newExpense._id} from template ${recurring._id}`);
            } catch (error) {
                errors++;
                logger.error(`Failed to process recurring transaction ${recurring._id}: ${error.message}`);
            }
        }

        logger.info(`Recurring job done: ${processed} processed, ${errors} errors`);
        return { processed, errors };
    }

    getMinIntervalMs(frequency) {
        switch (frequency) {
            case 'daily': return 24 * 60 * 60 * 1000;
            case 'weekly': return 7 * 24 * 60 * 60 * 1000;
            case 'monthly': return 28 * 24 * 60 * 60 * 1000;
            default: return 24 * 60 * 60 * 1000;
        }
    }
}

module.exports = new RecurringService();
