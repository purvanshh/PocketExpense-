const insightService = require('../services/insight.service');

const getAdvancedInsights = async (req, res, next) => {
    try {
        const insights = await insightService.getAdvancedInsights(req.user._id);
        res.json({
            success: true,
            message: 'Advanced insights fetched',
            data: insights,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAdvancedInsights };
