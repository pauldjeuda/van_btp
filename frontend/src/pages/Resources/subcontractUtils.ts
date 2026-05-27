export type SubcontractTaskRow = {
  id?: string | number;
  title: string;
  completed?: boolean;
  paid?: boolean;
  cost?: number;
  lotNumber?: number | null;
  lotName?: string | null;
};

export type SubcontractLike = {
  tasks?: SubcontractTaskRow[];
  montant?: number;
  paymentStatus?: string;
};

export const sumTaskCosts = (tasks: { cost?: number | string }[] = []) =>
  tasks.reduce((sum, t) => sum + Number(t.cost || 0), 0);

export const getPayableTasks = (contract: SubcontractLike) =>
  (contract.tasks || []).filter((t) => t.completed && !t.paid);

export const getPayableAmount = (contract: SubcontractLike) =>
  getPayableTasks(contract).reduce((sum, t) => sum + Number(t.cost || 0), 0);

export const getPaidAmount = (contract: SubcontractLike) =>
  (contract.tasks || [])
    .filter((t) => t.paid)
    .reduce((sum, t) => sum + Number(t.cost || 0), 0);

export const hasPayableTasks = (contract: SubcontractLike) => getPayableAmount(contract) > 0;

export const allTasksCompleted = (contract: SubcontractLike) => {
  const tasks = contract.tasks || [];
  return tasks.length > 0 && tasks.every((t) => t.completed);
};

/** Afficher un libellé de paiement uniquement si pertinent (jamais « En attente »). */
export const shouldShowPaymentStatus = (contract: SubcontractLike) =>
  hasPayableTasks(contract) || allTasksCompleted(contract);

export const getPaymentStatusLabel = (contract: SubcontractLike): 'Payé' | 'À payer' | null => {
  if (allTasksCompleted(contract)) return 'Payé';
  if (hasPayableTasks(contract)) return 'À payer';
  return null;
};

export const formatFcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
