const buildAccountingEntries = (transaction, body) => {
  const { type, amount, projectId, transactionDate: journalDate, reference: ref } = transaction;
  const base = {
    transactionId: transaction.id,
    projectId,
    journalDate,
    reference: ref,
    createdBy: body.createdBy,
  };

  if (type === 'invoice') {
    const label = `Facture ${ref} - ${body.client || 'Client'}`;
    return [
      { ...base, label, account: '411', accountLabel: 'Clients', debit: parseFloat(amount), credit: 0 },
      { ...base, label, account: '706', accountLabel: 'Prestations de services', debit: 0, credit: parseFloat(amount) },
    ];
  }

  const label = `Dépense ${ref} - ${body.provider || 'Fournisseur'}`;
  return [
    { ...base, label, account: '601', accountLabel: 'Achats matières', debit: parseFloat(amount), credit: 0 },
    { ...base, label, account: '401', accountLabel: 'Fournisseurs', debit: 0, credit: parseFloat(amount) },
  ];
};

module.exports = { buildAccountingEntries };
