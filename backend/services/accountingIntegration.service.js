const DEFAULT_COMPANY = process.env.ACCOUNTING_COMPANY || 'VAN INTERNATIONAL';

async function postBtpCost(payload) {
  const baseUrl = (process.env.ACCOUNTING_API_URL || '').replace(/\/$/, '');
  if (process.env.ACCOUNTING_ENABLED !== 'true' || !baseUrl) {
    console.log('[BTP Accounting] Ignoré: ACCOUNTING_ENABLED/ACCOUNTING_API_URL non configuré.');
    return { skipped: true };
  }

  try {
    const response = await fetch(`${baseUrl}/api/integrations/van/btp/costs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ACCOUNTING_API_KEY ? { Authorization: `Bearer ${process.env.ACCOUNTING_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        company: DEFAULT_COMPANY,
        ...payload,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `HTTP ${response.status}`);
    return { ok: true, data: body };
  } catch (error) {
    console.warn('[BTP Accounting] Échec non bloquant:', error.message);
    return { ok: false, error: error.message };
  }
}

function projectPayload(project) {
  if (!project) return {};
  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    projectClient: project.client,
    budget: project.budget,
    montantMarche: project.montantMarche,
  };
}

module.exports = {
  postBtpCost,
  projectPayload,
};
