const asyncHandler = require('../middlewares/asyncHandler');
const { success, notFound, error } = require('../utils/response');
const { buildProjectKpis } = require('../services/projectKpi.service');
const { resolveChefProjectIds } = require('../utils/chefProjectAccess');

exports.getByProject = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.id);
  if (!projectId) return notFound(res, 'Chantier introuvable');

  if (req.role === 'Chef_chantier') {
    const allowed = await resolveChefProjectIds(req.user);
    if (!allowed.includes(projectId)) {
      return error(res, 'Accès refusé à ce chantier', 403);
    }
  }

  const kpis = await buildProjectKpis(projectId);
  if (!kpis) return notFound(res, 'Chantier introuvable');

  return success(res, kpis);
});
