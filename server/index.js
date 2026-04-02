require('dotenv').config();
const connectDB = require('./config/db');
const environment = require('./config/environment');
const logger = require('./config/logger');
const cronService = require('./services/cron.service');
const createApp = require('./app');

connectDB();

const app = createApp();

const PORT = environment.port;
const HOST = environment.host;

app.listen(PORT, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${environment.nodeEnv}`);
    cronService.start();
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    cronService.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    cronService.stop();
    process.exit(0);
});
