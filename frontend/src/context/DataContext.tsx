import React, {
  createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode,
} from 'react';
import {
  Project, Transaction, Incident, Audit, Employee, Equipment,
  StockMovement, Purchase, Subcontract, Checklist, DailyReport,
  Document, Ticket,
} from '../types/models';
import { useUser } from './UserContext';
import { projectService } from '../services/project.service';
import { transactionService } from '../services/transaction.service';
import { employeeService } from '../services/employee.service';
import { equipmentService } from '../services/equipment.service';
import { stockService } from '../services/stock.service';
import { purchaseService } from '../services/purchase.service';
import { subcontractService } from '../services/subcontract.service';
import { incidentService } from '../services/incident.service';
import { auditService } from '../services/audit.service';
import { checklistService } from '../services/checklist.service';
import { dailyReportService } from '../services/dailyReport.service';
import { documentService } from '../services/document.service';
import { ticketService } from '../services/ticket.service';
import { getIncidentImagesFromRecord } from '../lib/incidentImages';
import { fixIntegrationImageUrl } from '../lib/integrationConfig';
import { employeeRHService } from '../services/employeeRH.service';

interface DataContextType {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: number, updates: Partial<Project>) => void;
  deleteProject: (id: number) => void;

  transactions: Transaction[];
  addTransaction: (transaction: Partial<Transaction>) => Promise<void> | void;

  incidents: Incident[];
  addIncident: (incident: Partial<Incident>) => Promise<void> | void;
  updateIncident: (id: number, updates: Partial<Incident>) => Promise<void> | void;
  refreshIncidents: () => Promise<void>;

  audits: Audit[];
  addAudit: (audit: Partial<Audit>) => Promise<void> | void;

  employees: Employee[];
  addEmployee: (employee: Partial<Employee>) => Promise<void> | void;
  updateEmployee: (id: number, updates: Partial<Employee>) => Promise<void> | void;
  deleteEmployee: (id: number) => Promise<void> | void;
  unassignEmployee: (id: number) => Promise<void> | void;

  equipmentList: Equipment[];
  addEquipment: (equipment: Partial<Equipment>) => Promise<void> | void;
  updateEquipment: (id: number, updates: Partial<Equipment>) => Promise<void> | void;
  deleteEquipment: (id: number) => Promise<void> | void;

  stockMovements: StockMovement[];
  addStockMovement: (movement: Partial<StockMovement>) => Promise<void> | void;

  tickets: Ticket[];
  addTicket: (ticket: Partial<Ticket> & { title: string; description?: string; module?: string; priority?: string }) => Promise<void> | void;

  documents: Document[];
  addDocument: (doc: Partial<Document>) => Promise<void> | void;

  dailyReports: DailyReport[];
  addDailyReport: (report: Partial<DailyReport>) => Promise<void> | void;
  updateDailyReport: (id: number, updates: Partial<DailyReport>) => Promise<void> | void;

  subcontracts: Subcontract[];
  addSubcontract: (subcontract: Partial<Subcontract>) => Promise<void> | void;
  updateSubcontract: (id: number, updates: Partial<Subcontract>) => Promise<void> | void;
  deleteSubcontract: (id: number) => Promise<void> | void;
  toggleSubcontractTask: (subcontractId: number, taskId: string) => Promise<any>;
  paySubcontractCompletedTasks: (subcontractId: number) => Promise<{ amount: number; subcontract: any }>;

  checklists: Checklist[];
  addChecklist: (checklist: Partial<Checklist>) => Promise<void> | void;
  updateChecklist: (id: number, updates: Partial<Checklist>) => Promise<void> | void;
  deleteChecklist: (id: number) => Promise<void> | void;
  toggleChecklistTask: (checklistId: number, taskId: string) => Promise<void> | void;

  purchases: Purchase[];
  addPurchase: (purchase: Partial<Purchase>) => Promise<void> | void;
  addPurchaseBatch: (order: {
    projectId: number;
    provider?: string;
    deliveryDate?: string;
    priority?: string;
    designation?: string;
    lines: { item: string; quantity: number; unit?: string; unitPrice?: number }[];
  }) => Promise<void>;
  updatePurchase: (id: number, updates: Partial<any>) => Promise<void> | void;

  /** Vrai pendant le chargement initial / après changement de rôle (évite d'afficher les données de l'ancienne session). */
  isDataSyncing: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { profile, role } = useUser();
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [subcontracts, setSubcontracts] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [isDataSyncing, setIsDataSyncing] = useState(false);

  const resetAllData = useCallback(() => {
    setProjectsState([]);
    setTransactions([]);
    setIncidents([]);
    setAudits([]);
    setEmployees([]);
    setEquipmentList([]);
    setStockMovements([]);
    setTickets([]);
    setDocuments([]);
    setDailyReports([]);
    setPurchases([]);
    setSubcontracts([]);
    setChecklists([]);
  }, []);

  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects]
  );
  const projectIdByName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.name, p.id])),
    [projects]
  );

  const resolveProjectId = (value: any): number | null => {
    if (typeof value === 'number' && value > 0) return value;
    if (typeof value === 'string' && value.trim()) {
      const id = Number(projectIdByName[value] || 0);
      return id > 0 ? id : null;
    }
    return null;
  };

  const normalizeProject = (p: any): Project => ({
    id: p.id ?? 0,
    code: p.code,
    name: p.name,
    client: p.client,
    status: p.status,
    budget: Number(p.budget || 0),
    progress: p.progress || 0,
    location: p.location || '',
    region: p.region || '',
    manager: p.manager || '',
    start: p.start || p.startDate || '',
    end: p.end || p.endDate || '',
    startDate: p.startDate || p.start || '',
    endDate: p.endDate || p.end || '',
    category: p.category || '',
    subCategory: (p.subCategory && p.subCategory.trim()) ? p.subCategory : null,
    chefId: p.chefId || p.chefChantier?.id || null,
    montantMarche: Number(p.montantMarche || 0),
    budgetItems: p.budgetItems || [],
    dateCreation: p.createdAt?.slice(0, 10) || p.startDate || '',
    amendmentCount: p.amendmentCount || 0,
  });

  const normalizeTransaction = (t: any) => {
    const projectId = Number(t.projectId || 0);
    const chantier = t.chantier || t.project?.name || projectNameById[projectId] || 'Chantier inconnu';
    const amountRaw = Number(t.amount || 0);
    return {
      id: t.id,
      date: t.date || t.transactionDate || t.createdAt?.slice(0, 10) || '',
      transactionDate: t.transactionDate || t.date || '',
      projectId,
      chantier,
      category: t.category || '',
      provider: t.provider || '',
      client: t.client || '',
      amount: t.type === 'expense' ? -Math.abs(amountRaw) : Math.abs(amountRaw),
      status: t.status || 'En attente',
      type: t.type,
      reference: t.reference || '',
      paymentMethod: t.paymentMethod || 'Virement',
      description: t.description || '',
      project: t.project,
      dueDate: t.dueDate || null,
      isClientDebt: !!t.isClientDebt,
      categorieFacture: t.categorieFacture || null,
      reminderCount: t.reminderCount || 0,
      debtStatus: t.debtStatus || null,
    };
  };

  const normalizeIncident = (i: any) => {
    const projectId = Number(i.projectId || 0);
    const images = getIncidentImagesFromRecord(i);
    return {
      id: i.id,
      type: i.type || '',
      category: i.category || 'quality',
      gravity: i.gravity || 'Mineur',
      title: i.title || '',
      desc: i.desc || i.description || '',
      description: i.description || i.desc || '',
      date: i.date || i.incidentDate || '',
      incidentDate: i.incidentDate || i.date || '',
      location: i.location || projectNameById[projectId] || i.project?.name || '',
      chantier: projectNameById[projectId] || i.project?.name || '',
      reporter:
        i.reporter
        || i.reporterName
        || (i.reporterUser
          ? `${i.reporterUser.prenom || ''} ${i.reporterUser.nom || ''}`.trim()
          : '')
        || '',
      status: i.status || 'Ouvert',
      actionPlan: i.actionPlan || '',
      impact: i.impact || '',
      image: images[0] || i.image || i.imageUrl || '',
      imageUrl: images[0] || i.imageUrl || i.image || '',
      images,
      history: (i.history || []).map((h: any) => ({
        ...h,
        date: h.date || (h.createdAt ? String(h.createdAt).slice(0, 10) : ''),
        user: h.user || i.reporter || '',
        action: h.action || '',
      })),
      projectId
    };
  };

  const normalizeAudit = (a: any) => {
    const projectId = Number(a.projectId || 0);
    return {
      id: a.id,
      title: a.title || '',
      type: a.title || '',
      date: a.date || a.auditDate || '',
      auditDate: a.auditDate || a.date || '',
      auditor: a.auditor || '',
      location: a.location || '',
      status: a.status || 'Planifié',
      notes: a.notes || a.observations || '',
      observations: a.observations || a.notes || '',
      recommendations: a.recommendations || '',
      score: a.score,
      chantier: projectNameById[projectId] || a.project?.name || '',
      projectId
    };
  };

  const normalizeEmployee = (e: any, projectMap?: Record<number, string>) => {
    const map = projectMap ?? projectNameById;
    const rawProjectId = Number(e.projectId || e.ProjectId || 0);

    let projectId = 0;
    if (rawProjectId > 0) {
      const inMap = !!map[rawProjectId];
      const hasCurrentProject =
        !!e.currentProject?.id && Number(e.currentProject.id) === rawProjectId;
      // Conserver l'affectation si le chantier existe (carte locale ou jointure API)
      if (inMap || hasCurrentProject) {
        projectId = rawProjectId;
      }
    }

    // Support for both local and VAN RH formats (permissive key matching)
    const firstName = e.prenom || e.Prenom || e.firstName || e.FirstName || '';
    const lastName = e.nom || e.Nom || e.lastName || e.LastName || '';
    const rawName = e.name || e.Name || e.fullName || e.FullName || '';
    const name = (rawName && rawName !== 'undefined undefined')
      ? rawName
      : `${firstName} ${lastName}`.trim() || 'Inconnu';

    const projectName = projectId
      ? (map[projectId] || e.currentProject?.name || e._resolvedName || 'Non assigné')
      : 'Non assigné';
    const contract = e.contract || e.Contract || e.contractType || e.ContractType || 'CDD';
    const niu = e.niu || e.NIU || e.numeroCnps || e.NumeroCnps || '';

    const fixImageUrl = (url?: string) => fixIntegrationImageUrl(url);

    const congeStatus = e.congeStatus || '';
    const currentConge = e.currentConge || null;
    const isOnLeave = congeStatus === 'En congé' || (currentConge && currentConge.status === 'En cours');

    return {
      id: e.id || e.Id || e._id,
      name,
      matricule: e.matricule || e.Matricule || '',
      role: e.role || e.Role || e.service || e.Service || '',
      projectId,
      project: projectName,
      contract,
      niu,
      email: e.email || e.Email || e.mail || e.Mail || e.courriel || '',
      service: e.service || e.Service || 'Non spécifié',
      category: e.category || e.Category || e.categorie || e.Categorie || 'N/A',
      avatar: fixImageUrl(e.avatar || e.Avatar || e.photoUrl || e.PhotoUrl || e.photo || e.Photo || e.image || e.Image),
      phone: e.phone || e.Phone || e.telephone || '',
      assignmentHistory: e.assignments?.map((a: any) => a.project?.name).filter(Boolean) || e.assignmentHistory || [],
      isOnLeave,
      congeStatus,
      currentConge,
      isLocal: !!(e.isLocal || e.is_local),
      weeklySalary: e.weeklySalary != null ? Number(e.weeklySalary) : undefined,
      isCurrentUser: !!e.isCurrentUser,
      _virtual: !!e._virtual,
    };
  };


  const normalizeEquipment = (e: any) => {
    const projectId = Number(e.projectId || 0);
    return {
      id: e.id,
      name: e.name,
      ref: e.ref || '',
      status: e.status || 'Disponible',
      location: e.location || projectNameById[projectId] || e.project?.name || 'Base Logistique',
      maintenance: e.maintenance || e.nextMaintenance || '',
      nextMaintenance: e.nextMaintenance || e.maintenance || '',
      projectId
    };
  };

  const normalizeStockMovement = (m: any) => {
    const projectId = Number(m.projectId || 0);
    const projectName = projectId === 0 ? 'Magasin Central' : (projectNameById[projectId] || m.project?.name || 'Chantier inconnu');
    return {
      id: m.id,
      date: m.date || m.movementDate || '',
      movementDate: m.movementDate || m.date || '',
      type: m.type,
      item: m.item,
      qty: String(m.qty ?? m.quantity ?? ''),
      quantity: Number(m.quantity ?? m.qty ?? 0),
      unit: m.unit || '',
      projectId,
      chantier: projectName,
      user: m.user || '',
      project: projectName
    };
  };

  const normalizeTicket = (t: any): Ticket => ({
    id: Number(t.id),
    title: t.title || '',
    status: t.status || 'Ouvert',
    priority: t.priority || 'Basse',
    date: t.date || t.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    module: t.module || '',
    description: t.description || '',
    createdAt: t.createdAt || ''
  });

  const normalizeDocument = (d: any) => {
    const projectId = Number(d.projectId || 0);
    return {
      id: d.id,
      name: d.name,
      type: d.type || 'Autre',
      projectId,
      chantier: projectNameById[projectId] || d.project?.name || '',
      date: d.date || d.createdAt?.slice(0, 10) || '',
      size: d.size || d.fileSize || '',
      folder: d.folder || d.type || 'Autre',
      description: d.description || '',
      filePath: d.filePath || ''
    };
  };

  const normalizeDailyReport = (r: any) => {
    const projectId = Number(r.projectId || 0);
    return {
      id: r.id,
      date: r.date || r.reportDate || '',
      reportDate: r.reportDate || r.date || '',
      projectId,
      chantier: projectNameById[projectId] || r.project?.name || '',
      reporter: r.reporter || '',
      reporterId: r.reporterId != null ? Number(r.reporterId) : undefined,
      location: r.location || '',
      weather: r.weather || 'Ensoleillé',
      status: r.status || 'Soumis',
      workDone: r.workDone || '',
      issuesEncountered: r.issuesEncountered || '',
      nextDayPlan: r.nextDayPlan || '',
      workerCount: r.workerCount || 0,
      images: (() => {
        if (Array.isArray(r.images)) return r.images;
        if (typeof r.images === 'string') {
          try { return JSON.parse(r.images); } catch { return []; }
        }
        return [];
      })(),
    };
  };

  const normalizeSubcontract = (s: any) => {
    const projectId = Number(s.projectId || 0);
    return {
      id: s.id,
      entreprise: s.entreprise,
      objet: s.objet || '',
      montant: Number(s.montant || 0),
      projectId,
      chantier: projectNameById[projectId] || s.project?.name || '',
      project: projectNameById[projectId] || s.project?.name || '',
      date: s.date || s.startDate || s.createdAt?.slice(0, 10) || '',
      tasks: (s.tasks || []).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        completed: !!t.completed,
        paid: !!t.paid,
        cost: Number(t.cost || 0),
        lotNumber: t.lotNumber || null,
        lotName: t.lotName || null
      })),
      progress: s.progress || 0,
      type: s.type || 'subcontract',
      company: s.entreprise || '',
      niu: s.niu || '',
      startDate: s.startDate || s.date || '',
      endDate: s.endDate || '',
      paymentStatus: s.paymentStatus || 'En attente',
      status: s.status || 'En cours',
      totalCost: Number(s.montant || s.totalCost || 0),
    };
  };

  const normalizeChecklist = (c: any) => {
    const projectId = Number(c.projectId || 0);
    return {
      id: c.id,
      title: c.title,
      category: c.category || '',
      projectId,
      chantier: projectNameById[projectId] || c.project?.name || '',
      tasks: (c.tasks || []).map((t: any) => ({ id: String(t.id), title: t.title, completed: !!t.completed })),
      active: typeof c.active === 'boolean' ? c.active : true,
      date: c.date || c.createdAt?.slice(0, 10) || ''
    };
  };

  const normalizePurchase = (p: any) => {
    const projectId = Number(p.projectId || 0);
    return {
      id: p.id,
      ref: p.ref || '',
      orderRef: p.orderRef || '',
      item: p.item || '',
      designation: p.designation || '',
      qty: String(p.qty ?? p.quantity ?? ''),
      quantity: Number(p.quantity ?? p.qty ?? 0),
      unit: p.unit || '',
      unitPrice: Number(p.unitPrice || 0),
      total: Number(p.total || (Number(p.quantity || 0) * Number(p.unitPrice || 0))),
      provider: p.provider || '',
      status: p.status || 'En attente',
      date: p.date || p.purchaseDate || '',
      purchaseDate: p.purchaseDate || p.date || '',
      deliveryDate: p.deliveryDate || '',
      projectId,
      chantier: projectNameById[projectId] || p.project?.name || '',
      project: projectNameById[projectId] || p.project?.name || '',
      priority: p.priority || 'Normale'
    };
  };

  const setProjects = (incoming: Project[]) => {
    setProjectsState(incoming.map(normalizeProject));
  };

  useEffect(() => {
    if (!role) {
      resetAllData();
      setIsDataSyncing(false);
      return;
    }

    let cancelled = false;

    const loadAll = async () => {
      resetAllData();
      setIsDataSyncing(true);
      try {
        // Charger les projets EN PREMIER — les normaliseurs suivants en ont besoin (projectNameById)
        const projs = await projectService.getAll().catch(() => []);
        if (cancelled) return;
        setProjectsState(projs.map(normalizeProject));

        // Puis charger toutes les autres données en parallèle
        const catchErr = (name: string) => (err: any) => {
          console.warn(`[DataContext] ${name} : ${err?.message || 'erreur inconnue'}`);
          return [] as any[];
        };

        const isVanRH = import.meta.env.VITE_DATA_SOURCE === 'van_rh';

        const [tx, inc, aud, emp, eq, stock, purch, sub, checks, reports, docs, tks] = await Promise.all([
          transactionService.getAll().catch(catchErr('transactions')),
          incidentService.getAll().catch(catchErr('incidents')),
          auditService.getAll().catch(catchErr('audits')),
          isVanRH
            ? Promise.all([
              employeeRHService.getAllEmployees().catch(catchErr('employees_van_rh')),
              employeeService.getAll().catch(catchErr('employees_local'))
            ]).then(([rh, local]) => {
              // Créer une copie de la liste RH
              const merged = [...rh];

              // Parcourir les employés locaux pour les fusionner ou les ajouter
              local.forEach((loc: any) => {
                const locMatricule = String(loc.matricule || '').trim().toUpperCase();
                const rhIndex = merged.findIndex((r: any) =>
                  String(r.matricule || '').trim().toUpperCase() === locMatricule
                );

                if (rhIndex !== -1) {
                  // Fusion : priorité aux infos locales pour les affectations (projectId)
                  merged[rhIndex] = { ...merged[rhIndex], ...loc };
                } else {
                  // L'employé local n'existe pas dans VAN RH (ex: recrutement manuel local)
                  merged.push(loc);
                }
              });

              return merged;
            })
            : employeeService.getAll().catch(catchErr('employees')),
          equipmentService.getAll().catch(catchErr('equipment')),
          stockService.getAll().catch(catchErr('stock')),
          purchaseService.getAll().catch(catchErr('purchases')),
          subcontractService.getAll().catch(catchErr('subcontracts')),
          checklistService.getAll().catch(catchErr('checklists')),
          dailyReportService.getAll().catch(catchErr('dailyReports')),
          documentService.getAll().catch(catchErr('documents')),
          ticketService.getAll().catch(catchErr('tickets')),
        ]);

        // Reconstruire le map projectNameById à partir des projets fraîchement chargés
        // IMPORTANT: on utilise ce map local car setProjectsState n'a pas encore déclenché le re-render
        const nameById: Record<number, string> = Object.fromEntries(projs.map((p: any) => [Number(p.id), p.name]));
        // Wrapper normaliseur qui injecte nameById local pour éviter 'Chantier inconnu'
        const withName = (normalizer: (x: any, map?: Record<number, string>) => any) => (item: any) => {
          const pid = Number(item.projectId || 0);
          if (pid && !item.project?.name && nameById[pid]) {
            item = { ...item, _resolvedName: nameById[pid] };
          }
          const result = normalizer(item, nameById);
          if (pid && result.chantier === 'Chantier inconnu' && nameById[pid]) {
            result.chantier = nameById[pid];
          }
          if (pid && result.project === 'Chantier inconnu' && nameById[pid]) {
            result.project = nameById[pid];
          }
          return result;
        };

        setTransactions(tx.map(withName(normalizeTransaction)));
        setIncidents(inc.map(withName(normalizeIncident)));
        setAudits(aud.map(withName(normalizeAudit)));

        // Traiter les employés et ajouter l'utilisateur connecté s'il n'est pas déjà dans la liste
        let processedEmployees = emp.map(withName(normalizeEmployee));

        // Chef de chantier uniquement : entrée virtuelle pour le pointage local (pas pour le DT)
        if (profile?.matricule && role === 'Chef_chantier') {
          const userMatricule = String(profile.matricule).trim().toUpperCase();
          const userExists = processedEmployees.some((e: any) =>
            String(e.matricule || '').trim().toUpperCase() === userMatricule
          );

          if (!userExists && profile.name) {
            const userProject = projs.find((p: any) => p.chefId === profile.id);
            const currentUserAsEmployee = {
              id: `user-${profile.id || profile.matricule}`,
              matricule: profile.matricule,
              name: profile.name,
              role,
              contract: 'Interne',
              projectId: userProject?.id ?? null,
              email: profile.email,
              isCurrentUser: true,
              _virtual: true,
            };
            processedEmployees.push(withName(normalizeEmployee)(currentUserAsEmployee));
          }
        }

        setEmployees(processedEmployees);
        setEquipmentList(eq.map(withName(normalizeEquipment)));
        setStockMovements(stock.map(withName(normalizeStockMovement)));
        setPurchases(purch.map(withName(normalizePurchase)));
        setSubcontracts(sub.map(withName(normalizeSubcontract)));
        setChecklists(checks.map(withName(normalizeChecklist)));
        setDailyReports(reports.map(withName(normalizeDailyReport)));
        setDocuments(docs.map(withName(normalizeDocument)));
        setTickets(tks.map(normalizeTicket));
      } catch (err) {
        console.error('Erreur de synchronisation DataContext', err);
      } finally {
        if (!cancelled) setIsDataSyncing(false);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, [role, profile?.id, resetAllData]); // re-déclencher si le rôle ou l'utilisateur change

  const addProject = async (project: Omit<Project, 'id'>) => {
    // Si l'id est déjà fourni (vient du backend), juste ajouter au state local
    if ((project as any).id && typeof (project as any).id === 'number' && (project as any).id < 1e12) {
      setProjectsState((prev) => [normalizeProject({ ...project, progress: project.progress || 0 }), ...prev]);
      return;
    }
    // Sinon créer via le backend
    try {
      const payload: any = {
        code: (project as any).code || `CH-${Date.now()}`,
        name: project.name,
        client: project.client,
        budget: Number(project.budget || 0),
        location: project.location || '',
        region: project.region || '',
        status: project.status || 'Planifié',
        startDate: project.startDate || project.start || '',
        endDate: project.endDate || project.end || '',
        manager: (project as any).manager || '',
        progress: (project as any).progress ?? 0,
        category: (project as any).category || 'Autre',
        subCategory: ((project as any).subCategory && (project as any).subCategory !== '') ? (project as any).subCategory : null,
      };
      const created = await projectService.create(payload);
      setProjectsState((prev) => [normalizeProject({ ...created, progress: created.progress ?? 0 }), ...prev]);
    } catch (err) {
      console.error('[DataContext] addProject error:', err);
      throw err;
    }
  };

  const updateProject = async (id: number, updates: Partial<Project>) => {
    // Mapper les champs frontend vers backend
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.code) payload.code = updates.code;
    if (updates.client) payload.client = updates.client;
    if (updates.status) payload.status = updates.status;
    if (updates.budget !== undefined) payload.budget = Number(updates.budget);
    if (updates.location) payload.location = updates.location;
    if (updates.region) payload.region = updates.region;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.start || updates.startDate) payload.startDate = updates.startDate || updates.start;
    if (updates.end || updates.endDate) payload.endDate = updates.endDate || updates.end;
    if (updates.manager !== undefined) payload.manager = updates.manager;

    try {
      const updated = await projectService.update(id, payload);
      setProjectsState((prev) => prev.map((p) => {
        if (p.id !== id) return p;
        const progress = updates.progress !== undefined
          ? updates.progress
          : (updated.progress ?? p.progress);
        return normalizeProject({ ...p, ...updates, ...updated, progress });
      }));
    } catch (err) {
      console.error('[DataContext] updateProject error:', err);
      // Fallback local si le backend échoue
      setProjectsState((prev) => prev.map((p) => {
        if (p.id !== id) return p;
        const progress = updates.progress !== undefined ? updates.progress : p.progress;
        return normalizeProject({ ...p, ...updates, progress });
      }));
      throw err;
    }
  };

  const deleteProject = async (id: number) => {
    try {
      await projectService.remove(id);
    } catch (err) {
      console.error('[DataContext] deleteProject error:', err);
      throw err;
    }
    setProjectsState((prev) => prev.filter((p) => p.id !== id));
    setTransactions((prev) => prev.filter((t) => t.projectId !== id));
    setIncidents((prev) => prev.filter((i) => i.projectId !== id));
    setDailyReports((prev) => prev.filter((r) => r.projectId !== id));
    setPurchases((prev) => prev.filter((p) => p.projectId !== id));
    setDocuments((prev) => prev.filter((d) => d.projectId !== id));
    setStockMovements((prev) => prev.filter((m) => m.projectId !== id));
    setEmployees((prev) => prev.map((e) => e.projectId === id ? { ...e, projectId: 0, project: 'Non assigné' } : e));
    setEquipmentList((prev) => prev.map((e) => e.projectId === id ? { ...e, projectId: 0, location: 'Base Logistique' } : e));
  };

  const addTransaction = async (transaction: any) => {
    const projectId = resolveProjectId(transaction.projectId || transaction.chantier);
    const amount = Math.abs(Number(transaction.amount || 0));
    const payload = {
      projectId,
      type: transaction.type,
      category: transaction.category || '',
      provider: transaction.provider || undefined,
      client: transaction.client || undefined,
      amount,
      status: transaction.status || (transaction.type === 'expense' ? 'Validé' : 'En attente'),
      paymentMethod: transaction.paymentMethod || 'Virement',
      transactionDate: transaction.transactionDate || transaction.date || new Date().toISOString().split('T')[0],
      description: transaction.description || undefined,
      dueDate: transaction.dueDate || undefined,
      isClientDebt: transaction.isClientDebt || false,
      categorieFacture: transaction.categorieFacture || undefined
    };
    const created = await transactionService.create(payload);
    setTransactions((prev) => [normalizeTransaction(created), ...prev]);
  };

  const refreshIncidents = async () => {
    const list = await incidentService.getAll().catch(() => []);
    setIncidents(list.map(normalizeIncident));
  };

  const mapIncidentGravity = (gravity: string) => {
    const map: Record<string, string> = {
      Faible: 'Mineur',
      Moyen: 'Modéré',
      Haut: 'Grave',
      Critique: 'Critique',
      Mineur: 'Mineur',
      'Modéré': 'Modéré',
      Grave: 'Grave',
    };
    return map[gravity] || gravity || 'Mineur';
  };

  const addIncident = async (incident: any) => {
    const projectId = resolveProjectId(incident.projectId || incident.chantier || incident.location);
    if (!projectId) {
      throw new Error('Chantier invalide — sélectionnez un chantier existant');
    }
    const gravity = mapIncidentGravity(incident.gravity);
    const imageFiles: File[] = Array.isArray(incident.imageFiles)
      ? incident.imageFiles.filter((f: unknown) => f instanceof File)
      : (incident.imageFile instanceof File ? [incident.imageFile] : []);

    if (imageFiles.length > 0) {
      const formData = new FormData();
      formData.append('title', incident.title);
      formData.append('type', incident.type);
      formData.append('category', incident.category);
      formData.append('gravity', gravity);
      formData.append('description', incident.description || incident.desc || '');
      formData.append('status', incident.status || 'Ouvert');
      formData.append('actionPlan', incident.actionPlan || '');
      formData.append('impact', incident.impact || '');
      formData.append('incidentDate', incident.incidentDate || incident.date || new Date().toISOString().split('T')[0]);
      formData.append('projectId', String(projectId));
      imageFiles.slice(0, 10).forEach((file) => formData.append('images', file));

      const created = await incidentService.create(formData);
      setIncidents((prev) => [normalizeIncident(created), ...prev]);
    } else {
      const payload = {
        title: incident.title,
        type: incident.type,
        category: incident.category,
        gravity,
        description: incident.description || incident.desc || '',
        status: incident.status || 'Ouvert',
        actionPlan: incident.actionPlan || '',
        impact: incident.impact || '',
        incidentDate: incident.incidentDate || incident.date || new Date().toISOString().split('T')[0],
        projectId,
      };
      const created = await incidentService.create(payload);
      setIncidents((prev) => [normalizeIncident(created), ...prev]);
    }
  };

  const updateIncident = async (id: number, updates: Partial<Incident>) => {
    const payload: any = { ...updates };
    if ((payload as any).date && !(payload as any).incidentDate) payload.incidentDate = (payload as any).date;
    if ((payload as any).desc && !(payload as any).description) payload.description = (payload as any).desc;
    const updated = await incidentService.update(id, payload);
    setIncidents((prev) => prev.map((i) => i.id === id ? normalizeIncident(updated) : i));
  };

  const addAudit = async (audit: any) => {
    const projectId = resolveProjectId(audit.projectId || audit.chantier);
    const payload = {
      title: audit.title || audit.type,
      auditDate: audit.auditDate || audit.date || new Date().toISOString().split('T')[0],
      projectId,
      auditor: audit.auditor || '',
      location: audit.location || '',
      observations: audit.observations || audit.notes || '',
      recommendations: audit.recommendations || '',
      score: audit.score,
      status: audit.status || 'Planifié'
    };
    const created = await auditService.create(payload);
    setAudits((prev) => [normalizeAudit(created), ...prev]);
  };

  const addEmployee = async (employee: any) => {
    const payload = {
      matricule: employee.matricule,
      name: employee.name,
      role: employee.role,
      contract: employee.contract || 'CDD',
      niu: employee.niu || '',
      phone: employee.phone || '',
      projectId: resolveProjectId(employee.projectId || employee.project),
      isLocal: !!employee.isLocal,
      ...(employee.weeklySalary != null && employee.weeklySalary !== ''
        ? { weeklySalary: Number(employee.weeklySalary) }
        : {}),
    };
    const created = await employeeService.create(payload);
    setEmployees((prev) => [normalizeEmployee(created), ...prev]);
  };

  const updateEmployee = async (id: any, updates: any) => {
    const payload = {
      ...updates,
      projectId: updates.projectId !== undefined ? resolveProjectId(updates.projectId) : resolveProjectId(updates.project)
    };
    if (!payload.projectId) delete payload.projectId;
    delete payload.project;

    try {
      const updated = await employeeService.update(id, payload);
      setEmployees((prev) => prev.map((e) =>
        (String(e.id) === String(id) || (updated.matricule && e.matricule === updated.matricule))
          ? normalizeEmployee({ ...e, ...updated })
          : e
      ));
      if (payload.projectId !== undefined) {
        try {
          const projs = await projectService.getAll();
          setProjectsState(projs.map(normalizeProject));
        } catch {
          /* ignore */
        }
      }
    } catch (err: any) {
      if (updates.matricule) {
        const created = await employeeService.create(updates);
        setEmployees((prev) => prev.map((e) =>
          (String(e.id) === String(id) || (created.matricule && e.matricule === created.matricule))
            ? normalizeEmployee({ ...e, ...created })
            : e
        ));
      } else {
        throw err;
      }
    }
  };

  const deleteEmployee = async (id: number) => {
    await employeeService.remove(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const unassignEmployee = async (id: any) => {
    try {
      const updated = await employeeService.unassign(id);
      setEmployees((prev) => prev.map((e) =>
        (String(e.id) === String(id) || (updated.matricule && e.matricule === updated.matricule))
          ? normalizeEmployee({ ...e, ...updated, projectId: 0 })
          : e
      ));
      try {
        const projs = await projectService.getAll();
        setProjectsState(projs.map(normalizeProject));
      } catch {
        /* ignore */
      }
    } catch (err: any) {
      if (err?.message?.includes('404') || err?.message?.includes('introuvable')) {
        // L'employé n'est pas dans la DB locale, il est donc déjà considéré comme non assigné
        setEmployees((prev) => prev.map((e) =>
          String(e.id) === String(id) ? normalizeEmployee({ ...e, projectId: 0 }) : e
        ));
      } else {
        throw err;
      }
    }
  };

  const addEquipment = async (equipment: any) => {
    const payload = {
      name: equipment.name,
      ref: equipment.ref,
      status: equipment.status || 'Disponible',
      nextMaintenance: equipment.nextMaintenance || equipment.maintenance || undefined,
      projectId: resolveProjectId(equipment.projectId || equipment.location)
    };
    const created = await equipmentService.create(payload);
    setEquipmentList((prev) => [normalizeEquipment(created), ...prev]);
  };

  const updateEquipment = async (id: number, updates: any) => {
    const payload: any = { ...updates };
    if (payload.location && !payload.projectId) payload.projectId = resolveProjectId(payload.location);
    if (payload.maintenance && !payload.nextMaintenance) payload.nextMaintenance = payload.maintenance;
    const updated = await equipmentService.update(id, payload);
    setEquipmentList((prev) => prev.map((e) => e.id === id ? normalizeEquipment(updated) : e));
  };

  const deleteEquipment = async (id: number) => {
    await equipmentService.remove(id);
    setEquipmentList((prev) => prev.filter((e) => e.id !== id));
  };

  const addStockMovement = async (movement: any) => {
    // Utiliser explicitement projectId s'il est fourni (même si c'est 0), sinon essayer les alternatives
    const rawId = movement.projectId !== undefined ? movement.projectId :
      (movement.toProjectId !== undefined ? movement.toProjectId :
        (movement.chantier || movement.toChantier || movement.fromChantier));

    const projectId = resolveProjectId(rawId) || 0;
    const payload = {
      type: movement.type,
      item: movement.item,
      materialId: movement.materialId,
      quantity: Number(movement.quantity ?? movement.qty ?? 0),
      unit: movement.unit || '',
      projectId,
      movementDate: movement.movementDate || movement.date || new Date().toISOString().split('T')[0],
      toProjectId: movement.toProjectId,
      note: movement.note,
    };
    const created = await stockService.create(payload);
    if (created.source && created.dest) {
      setStockMovements((prev) => [normalizeStockMovement(created.source), normalizeStockMovement(created.dest), ...prev]);
    } else {
      setStockMovements((prev) => [normalizeStockMovement(created), ...prev]);
    }
  };

  const addTicket = async (ticket: Partial<Ticket> & { title: string; description?: string; module?: string; priority?: string }) => {
    const created = await ticketService.create({
      title: ticket.title,
      module: ticket.module || 'Tableau de bord',
      priority: (ticket.priority as any) || 'Basse',
      description: ticket.description || ''
    });
    setTickets((prev) => [normalizeTicket(created), ...prev]);
  };

  const addDocument = async (doc: any) => {
    if (!(doc.file instanceof File)) {
      throw new Error('Un fichier réel est requis pour enregistrer un document.');
    }
    const formData = new FormData();
    formData.append('file', doc.file);
    formData.append('name', doc.name || doc.file.name);
    formData.append('type', doc.type || 'Autre');
    if (doc.projectId) formData.append('projectId', String(doc.projectId));
    const created = await documentService.upload(formData);
    setDocuments((prev) => [normalizeDocument(created), ...prev]);
  };

  const addDailyReport = async (report: any) => {
    const projectId = resolveProjectId(report.projectId || report.chantier);
    const payload = {
      reportDate: report.reportDate || report.date || new Date().toISOString().split('T')[0],
      projectId,
      weather: report.weather || 'Ensoleillé',
      status: report.status || 'Soumis',
      workDone: report.workDone || report.description || '',
      issuesEncountered: report.issuesEncountered || '',
      nextDayPlan: report.nextDayPlan || '',
      workerCount: Number(report.workerCount || 0),
      images: Array.isArray(report.images) ? report.images.slice(0, 10) : [],
      reporterId: profile?.id,
      reporter: profile?.name || profile?.email || 'Utilisateur'
    };
    const created = await dailyReportService.create(payload);
    setDailyReports((prev) => [normalizeDailyReport(created), ...prev]);
  };

  const updateDailyReport = async (id: number, updates: any) => {
    const payload = {
      reportDate: updates.reportDate || updates.date,
      workDone: updates.workDone,
      issuesEncountered: updates.issuesEncountered,
      nextDayPlan: updates.nextDayPlan,
      workerCount: updates.workerCount != null ? Number(updates.workerCount) : undefined,
      images: Array.isArray(updates.images) ? updates.images.slice(0, 10) : undefined,
      status: updates.status,
    };
    const updated = await dailyReportService.update(id, payload);
    setDailyReports((prev) =>
      prev.map((r) => (r.id === id ? normalizeDailyReport(updated) : r)),
    );
  };

  const addPurchase = async (purchase: any) => {
    const projectId = resolveProjectId(purchase.projectId || purchase.chantier);
    const payload = {
      item: purchase.item,
      designation: purchase.designation || purchase.description || purchase.item,
      quantity: Number(purchase.quantity ?? purchase.qty ?? 0),
      unit: purchase.unit || '',
      unitPrice: Number(purchase.unitPrice || 0),
      provider: purchase.provider || '',
      purchaseDate: purchase.purchaseDate || purchase.date || new Date().toISOString().split('T')[0],
      deliveryDate: purchase.deliveryDate || undefined,
      status: purchase.status || 'En attente',
      projectId
    };
    try {
      const created = await purchaseService.create(payload);
      setPurchases((prev) => [normalizePurchase(created), ...prev]);
    } catch (error) {
      console.error('[DataContext] addPurchase error:', error);
      throw error;
    }
  };

  const addPurchaseBatch = async (order: {
    projectId: number;
    provider?: string;
    deliveryDate?: string;
    priority?: string;
    designation?: string;
    lines: { item: string; quantity: number; unit?: string; unitPrice?: number }[];
  }) => {
    try {
      const result = await purchaseService.createBatch(order);
      const normalized = (result.lines || []).map(normalizePurchase);
      setPurchases((prev) => [...normalized, ...prev]);
    } catch (error) {
      console.error('[DataContext] addPurchaseBatch error:', error);
      throw error;
    }
  };

  const updatePurchase = async (id: number, updates: Partial<any>) => {
    const updated = await purchaseService.updateStatus(id, updates);
    setPurchases((prev) => prev.map((p) => p.id === id ? normalizePurchase(updated) : p));
  };

  const addSubcontract = async (subcontract: any) => {
    const projectId = resolveProjectId(subcontract.projectId || subcontract.chantier || subcontract.project);
    const payload = {
      entreprise: subcontract.entreprise || subcontract.company,
      objet: subcontract.objet || subcontract.task || '',
      montant: Number(subcontract.montant || subcontract.amount || 0),
      progress: subcontract.progress || 0,
      type: subcontract.type || 'subcontract',
      startDate: subcontract.startDate || subcontract.date || undefined,
      projectId,
      tasks: (subcontract.tasks || []).map((t: any) => ({
        id: t.id,
        title: (typeof t === 'string' ? t : (t.title || t.name || t.lotName)) || 'Prestation',
        cost: Number(t.cost || 0),
        completed: t.completed,
        paid: t.paid,
        lotNumber: t.lotNumber || 1,
        lotName: t.lotName || 'Prestation',
      })),
    };
    if (!payload.montant && payload.tasks?.length) {
      payload.montant = payload.tasks.reduce((s: number, t: { cost: number }) => s + Number(t.cost || 0), 0);
    }
    const created = await subcontractService.create(payload);
    setSubcontracts((prev) => [normalizeSubcontract(created), ...prev]);
  };

  const updateSubcontract = async (id: number, updates: any) => {
    const payload = { ...updates };
    if (payload.project || payload.chantier) payload.projectId = resolveProjectId(payload.projectId || payload.project || payload.chantier);
    const updated = await subcontractService.update(id, payload);
    setSubcontracts((prev) => prev.map((s) => s.id === id ? normalizeSubcontract(updated) : s));
  };

  const deleteSubcontract = async (id: number) => {
    await subcontractService.remove(id);
    setSubcontracts((prev) => prev.filter((s) => s.id !== id));
  };

  const addChecklist = async (checklist: any) => {
    const projectId = resolveProjectId(checklist.projectId || checklist.chantier);
    const payload = {
      title: checklist.title,
      category: checklist.category || '',
      active: checklist.active ?? true,
      projectId,
      tasks: (checklist.tasks || []).map((t: any) => ({ title: t.title || t }))
    };
    const created = await checklistService.create(payload);
    setChecklists((prev) => [normalizeChecklist(created), ...prev]);
  };

  const updateChecklist = async (id: number, updates: any) => {
    const updated = await checklistService.update(id, updates);
    setChecklists((prev) => prev.map((c) => c.id === id ? normalizeChecklist(updated) : c));
  };

  const deleteChecklist = async (id: number) => {
    await checklistService.remove(id);
    setChecklists((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleChecklistTask = async (checklistId: number, taskId: string) => {
    const result = await checklistService.toggleTask(checklistId, taskId);
    // Mise à jour locale optimiste (pas de rechargement complet)
    setChecklists(prev => prev.map(c => {
      if (Number(c.id) !== Number(checklistId)) return c;
      return {
        ...c,
        tasks: c.tasks.map((t: any) =>
          String(t.id) === String(taskId) ? { ...t, completed: !t.completed } : t
        )
      };
    }));
  };

  const toggleSubcontractTask = async (subcontractId: number, taskId: string) => {
    const result = await subcontractService.toggleTask(subcontractId, taskId);
    const normalized = normalizeSubcontract(result);
    setSubcontracts((prev) => prev.map((s) => (String(s.id) === String(subcontractId) ? normalized : s)));
    return normalized;
  };

  const paySubcontractCompletedTasks = async (subcontractId: number) => {
    const result = await subcontractService.payCompletedTasks(subcontractId);
    const normalized = normalizeSubcontract(result.subcontract);
    setSubcontracts((prev) => prev.map((s) => (String(s.id) === String(subcontractId) ? normalized : s)));
    return { amount: Number(result.amount || 0), subcontract: normalized };
  };

  return (
    <DataContext.Provider value={{
      projects,
      setProjects,
      addProject,
      updateProject,
      deleteProject,
      transactions,
      addTransaction,
      incidents,
      addIncident,
      updateIncident,
      refreshIncidents,
      audits,
      addAudit,
      employees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      unassignEmployee,
      equipmentList,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      stockMovements,
      addStockMovement,
      tickets,
      addTicket,
      documents,
      addDocument,
      dailyReports,
      addDailyReport,
      updateDailyReport,
      subcontracts,
      addSubcontract,
      updateSubcontract,
      deleteSubcontract,
      toggleSubcontractTask,
      paySubcontractCompletedTasks,
      checklists,
      addChecklist,
      updateChecklist,
      deleteChecklist,
      toggleChecklistTask,
      purchases,
      addPurchase,
      addPurchaseBatch,
      updatePurchase,
      isDataSyncing,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
