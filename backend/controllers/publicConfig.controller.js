const vanRh = require('../config/vanRh');
const { success } = require('../utils/response');

/**
 * Configuration publique exposée au frontend (sans secret).
 * GET /api/public/config
 */
exports.getPublicConfig = (_req, res) => {
  return success(res, {
    vanRh: {
      url: vanRh.url,
      configured: vanRh.isConfigured(),
    },
  });
};
