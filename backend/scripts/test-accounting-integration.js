/**
 * Test manuel — intégration compta externe (POST /api/integrations/van/btp/costs)
 * Usage : node scripts/test-accounting-integration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const accounting = require('../services/accountingIntegration.service');

const ts = Date.now();

const cases = [
  {
    name: 'PROJECT_COST (dépense)',
    payload: {
      type: 'PROJECT_COST',
      sourceId: 99999,
      reference: `TEST-DEP-${ts}`,
      entryDate: new Date().toISOString().slice(0, 10),
      amount: 1,
      label: 'Test dépense BTP',
      provider: 'TEST',
      projectId: 1,
      projectName: 'Chantier test',
    },
  },
  {
    name: 'PURCHASE (achat)',
    payload: {
      type: 'PURCHASE',
      sourceId: 99998,
      reference: `TEST-ACHAT-${ts}`,
      entryDate: new Date().toISOString().slice(0, 10),
      amount: 50000,
      label: 'Ciment test',
      provider: 'CIMAF',
      projectId: 1,
    },
  },
  {
    name: 'EVENTUAL_CHARGE (facture)',
    payload: {
      type: 'EVENTUAL_CHARGE',
      sourceId: 99997,
      reference: `TEST-FAC-${ts}`,
      entryDate: new Date().toISOString().slice(0, 10),
      amount: 100000,
      label: 'Facture test',
      provider: 'Client',
      projectId: 1,
    },
  },
];

async function main() {
  console.log('ACCOUNTING_ENABLED:', process.env.ACCOUNTING_ENABLED);
  console.log('ACCOUNTING_API_URL:', process.env.ACCOUNTING_API_URL);
  console.log('ACCOUNTING_COMPANY:', process.env.ACCOUNTING_COMPANY);
  console.log('---');

  let failed = 0;
  for (const c of cases) {
    const result = await accounting.postBtpCost(c.payload);
    const status = result.skipped ? 'SKIP' : result.ok ? 'OK' : 'FAIL';
    console.log(`[${status}] ${c.name}`, result.ok ? `→ entry #${result.data?.data?.id}` : result.error || result);
    if (!result.ok && !result.skipped) failed += 1;
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
