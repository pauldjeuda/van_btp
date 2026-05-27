/** Formatage nombres FR — messages API et logs. */
const parseNum = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const formatQty = (value, maxFractionDigits = 4) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(parseNum(value));

const formatAmount = (value) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parseNum(value));

module.exports = { parseNum, formatQty, formatAmount };
