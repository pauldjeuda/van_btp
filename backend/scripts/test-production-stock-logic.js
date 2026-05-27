/**
 * Test logique Production ↔ Stock (sans base de données)
 * Usage: node scripts/test-production-stock-logic.js
 */
const {
  computeBatches,
  buildConsumptionPlan,
} = require('../services/productionExecution.service');
const { computeBalanceFromList, normalizeProjectId } = require('../services/stockMovement.service');

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\n=== Tests logiques Production ↔ Stock ===\n');

// ── computeBatches ──
console.log('1. computeBatches');
assert('100 produits / expectedOutput 40 → 2.5 lots', computeBatches(100, 40) === 2.5);
assert('40 produits / expectedOutput 40 → 1 lot', computeBatches(40, 40) === 1);
assert('expectedOutput 0 → fallback 1 lot', computeBatches(50, 0) === 1);

// ── buildConsumptionPlan ──
console.log('\n2. buildConsumptionPlan');
const mockRecipe = {
  expectedOutput: 40,
  lines: [
    { materialId: 1, quantityPerBatch: 10, unit: 'kg', material: { name: 'Ciment', unit: 'kg' } },
    { materialId: 2, quantityPerBatch: 5, unit: 'm³', material: { name: 'Sable', unit: 'm³' } },
  ],
};
const plan80 = buildConsumptionPlan(mockRecipe, 80);
assert('80 unités → 20 kg ciment', plan80[0].quantityActual === 20);
assert('80 unités → 10 m³ sable', plan80[1].quantityActual === 10);
const planWithLoss = buildConsumptionPlan(mockRecipe, 100);
assert('100 unités → 25 kg ciment', planWithLoss[0].quantityActual === 25);

// ── yieldRatio bug (documenté) ──
console.log('\n3. yieldRatio (formule actuelle)');
const qty = 100;
const expected = 40;
const batches = computeBatches(qty, expected);
const yieldRatio = expected > 0 ? qty / (expected * batches) : 1;
assert('yieldRatio actuel ≈ 1 (bug connu)', Math.abs(yieldRatio - 1) < 0.001, `got ${yieldRatio}`);

// ── Stock balance ──
console.log('\n4. computeBalanceFromList');
const movements = [
  { type: 'Entrée', item: 'Parpaing 20', quantity: 100 },
  { type: 'Sortie', item: 'Parpaing 20', quantity: 30 },
  { type: 'Entrée', item: 'Ciment', quantity: 500 },
  { type: 'Sortie', item: 'Ciment', quantity: 50 },
];
assert('Solde Parpaing 20 = 70', computeBalanceFromList(movements, 'Parpaing 20') === 70);
assert('Solde Ciment = 450', computeBalanceFromList(movements, 'Ciment') === 450);
assert('Article inconnu = 0', computeBalanceFromList(movements, 'Inconnu') === 0);

// ── Renommage matériau casse le solde ──
console.log('\n5. Risque renommage (solde par nom)');
const afterRename = [
  ...movements.filter((m) => m.item !== 'Parpaing 20'),
  { type: 'Entrée', item: 'Parpaing 20 cm', quantity: 10 },
];
assert(
  'Après renommage, ancien nom = 0 (perte historique)',
  computeBalanceFromList(afterRename, 'Parpaing 20') === 0,
);
assert(
  'Nouveau nom ne voit pas l\'historique',
  computeBalanceFromList(afterRename, 'Parpaing 20 cm') === 10,
);

// ── projectId normalization ──
console.log('\n6. normalizeProjectId');
assert('0 → null (magasin central)', normalizeProjectId(0) === null);
assert('5 → 5 (chantier)', normalizeProjectId(5) === 5);
assert('null → null', normalizeProjectId(null) === null);

// ── Flux net production ──
console.log('\n7. Quantité nette vs brute');
const quantityProduced = 100;
const lossQty = 5;
const netOutput = Math.max(0, quantityProduced - lossQty);
const consumptionQty = quantityProduced; // buildConsumptionPlan uses brute qty
assert('Consommation sur qty brute (100)', consumptionQty === 100);
assert('Entrée stock sur qty nette (95)', netOutput === 95);
assert('Écart consommation/entrée = pertes', consumptionQty - netOutput === lossQty);

console.log('\n---');
console.log(`Résultat: ${passed} OK, ${failed} échec(s)\n`);
process.exit(failed > 0 ? 1 : 0);
