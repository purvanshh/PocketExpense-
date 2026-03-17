const cron = require('node-cron');
const recurringService = require('./recurring.service');
const logger = require('../config/logger');

class CronService {
    constructor() {
        this.jobs = [];
    }

    start() {
        // Run every hour at minute 0
        const recurringJob = cron.schedule('0 * * * *', async () => {
            logger.info('Cron: Starting recurring transactions job');
            try {
                const result = await recurringService.processDueRecurringTransactions();
                logger.info(`Cron: Recurring job completed - ${result.processed} processed`);
            } catch (error) {
                logger.error(`Cron: Recurring job failed - ${error.message}`);
            }
        });

        this.jobs.push(recurringJob);
        logger.info('Cron service started');
    }

    stop() {
        this.jobs.forEach((job) => job.stop());
        this.jobs = [];
        logger.info('Cron service stopped');
    }
}

module.exports = new CronService();
