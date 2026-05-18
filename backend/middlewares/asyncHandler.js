/**
 * middlewares/asyncHandler.js
 * Wrapper qui élimine le try/catch répétitif dans chaque controller.
 * Toute erreur non gérée est transmise au middleware errorHandler global.
 *
 * Usage :
 *   exports.getAll = asyncHandler(async (req, res) => {
 *     const data = await db.Model.findAll();
 *     return success(res, data);
 *   });
 */

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
