import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import {
  ShoppingCart,
  Clock,
  Package,
  Truck,
  Users,
  Handshake,
  Plus,
  Minus,
  ArrowRightLeft,
  ArrowUpRight,
  History,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  HardHat,
  MapPin,
  UserPlus,
  ClipboardCheck,
  Settings2,
  Trash2,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { exportToCSV } from '../../lib/exportUtils';
import { formatCFA, formatNumber, formatQuantity, formatQuantityWithUnit } from '../../lib/formatters';
import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useHistory } from '../../context/HistoryContext';
import { useData } from '../../context/DataContext';
import { attendanceService } from '../../services/attendance.service';
import { equipmentRequestService, type EquipmentRequest } from '../../services/equipmentRequest.service';
import { useEquipmentRequestsLive } from '../../hooks/useEquipmentRequestsLive';
import { useNotification } from '../../context/NotificationContext';
import { useResourcesState } from './useResourcesState';
import { materialService } from '../../services/material.service';
import { StockManagementPanel } from './StockManagementPanel';
import { AttendancePanel } from './AttendancePanel';
import { EquipmentRequestsPanel } from './EquipmentRequestsPanel';
import { PurchaseOrderLines, createEmptyPurchaseLine, type PurchaseLineDraft } from './PurchaseOrderLines';
import { PurchaseHistoryAccordion } from './PurchaseHistoryAccordion';
import {
  getPayableAmount,
  getPaidAmount,
  hasPayableTasks,
  getPaymentStatusLabel,
  shouldShowPaymentStatus,
  sumTaskCosts,
  formatFcfa,
} from './subcontractUtils';

type TaskDraft = { title: string; cost: string };


export const ResourcesPage = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const today = new Date().toISOString().split('T')[0];
  const { role, profile } = useUser();
  const canManagePurchases = can('manage_purchases');
  const canManageEquipment = can('assign_equipment');
  const canManagePersonnel = can('assign_personnel') || can('manage_rh_assignments');
  const isChefSiteRole = role === 'Chef_chantier';
  const isDirecteurTechnique = role === 'Directeur technique';
  const name = profile?.name;
  const { addLog } = useHistory();
  const {
    projects,
    updateProject,
    employees,
    updateEmployee,
    addEmployee,
    deleteEmployee,
    unassignEmployee,
    equipmentList,
    updateEquipment,
    deleteEquipment,
    stockMovements,
    addStockMovement,
    purchases,
    addPurchaseBatch,
    updatePurchase,
    subcontracts,
    addSubcontract,
    updateSubcontract,
    deleteSubcontract,
    toggleSubcontractTask: contextToggleSubcontractTask,
    paySubcontractCompletedTasks,
    addTransaction,
  } = useData();

  const currentEmployee = employees.find(e =>
    String(e.matricule || '').trim().toUpperCase() === String(profile?.matricule || '').trim().toUpperCase()
  );
  const currentProjectId = currentEmployee?.projectId || 0;

  const chefProjects = useMemo(() => {
    if (role === 'Chef_chantier') return projects;
    return projects.filter(p => Number(p.chefId) === Number(profile?.id));
  }, [projects, profile, role]);

  const chefProjectIds = useMemo(() => {
    return chefProjects.map(p => Number(p.id));
  }, [chefProjects]);

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'purchases' | 'stock' | 'equipment' | 'hr' | 'subcontracting' | 'pointage'>(
    role === 'Gestionnaire de stocks' ? 'stock' : 'purchases',
  );
  // Pointage
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceProjectId, setAttendanceProjectId] = useState<number>(0);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState(1);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isUnassignedModalOpen, setIsUnassignedModalOpen] = useState(false);
  const [isEmployeeDetailModalOpen, setIsEmployeeDetailModalOpen] = useState(false);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<any>(null);
  const [isServiceProviderModalOpen, setIsServiceProviderModalOpen] = useState(false);
  const [newServiceProvider, setNewServiceProvider] = useState({
    name: '',
    projectId: projects[0]?.id || 0,
    tasks: [] as TaskDraft[],
  });
  const [newProviderTaskTitle, setNewProviderTaskTitle] = useState('');
  const [newProviderTaskCost, setNewProviderTaskCost] = useState('');
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [hrSearchQuery, setHrSearchQuery] = useState('');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(t('resources.stock.central_warehouse'));
  const [isStockMovementModalOpen, setIsStockMovementModalOpen] = useState(false);
  const [stockMovementStep, setStockMovementStep] = useState(1);
  const [stockMovementType, setStockMovementType] = useState<'entry' | 'exit' | 'transfer'>('entry');
  const [isLogbookModalOpen, setIsLogbookModalOpen] = useState(false);
  const [isSubcontractModalOpen, setIsSubcontractModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] = useState(false);
  const [assigningEquipment, setAssigningEquipment] = useState<any>(null);
  const [isAllOrdersModalOpen, setIsAllOrdersModalOpen] = useState(false);
  const [isContractDetailsModalOpen, setIsContractDetailsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [isManageContractModalOpen, setIsManageContractModalOpen] = useState(false);
  const [isFullLogbookModalOpen, setIsFullLogbookModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState('all');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [purchaseToUpdate, setPurchaseToUpdate] = useState<any>(null);
  const [selectedStockProject, setSelectedStockProject] = useState<number | null>(null);
  const [selectedEquipmentProject, setSelectedEquipmentProject] = useState<number | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  const [stTab, setStTab] = useState<'contracts' | 'providers'>('contracts');

  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [isSubmittingStockMovement, setIsSubmittingStockMovement] = useState(false);
  const [isSubmittingEquipment, setIsSubmittingEquipment] = useState(false);
  const [equipmentRequestForm, setEquipmentRequestForm] = useState({
    needDescription: '',
    desiredDate: '',
    projectId: 0,
  });
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [isUnassigningEmployee, setIsUnassigningEmployee] = useState(false);
  const [isAssigningEmployee, setIsAssigningEmployee] = useState(false);
  const [isSubmittingServiceProvider, setIsSubmittingServiceProvider] = useState(false);
  const [isPayingProvider, setIsPayingProvider] = useState(false);

  const [stockView, setStockView] = useState<'warehouse' | 'projects'>(
    role === 'Gestionnaire de stocks' ? 'warehouse' : 'projects',
  );

  useEffect(() => {
    if (role === 'Chef_chantier' && stockView === 'warehouse') {
      setStockView('projects');
    }
  }, [role, stockView]);

  const getProjectNameById = (projectId?: number) => {
    if (projectId === 0) return t('resources.stock.central_warehouse');
    return projects.find((p) => p.id === projectId)?.name || t('resources.project.unknown');
  };

  const getEmployeeProjectLabel = (projectId?: number) => {
    if (!projectId || projectId === 0) return t('resources.hr.no_assignment');
    return projects.find((p) => p.id === projectId)?.name || t('resources.hr.no_assignment');
  };
  const getProjectIdByName = (name?: string) => projects.find(p => p.name === name)?.id || 0;
  const { notify } = useNotification();

  const stockProjectList = useMemo(() => {
    if (role === 'Chef_chantier') return chefProjects;
    return projects;
  }, [role, chefProjects, projects]);

  const resolveStockProjectId = () => {
    if (role === 'Chef_chantier') {
      return selectedStockProject ?? stockProjectList[0]?.id ?? null;
    }
    if (stockView === 'warehouse') return 0;
    return selectedStockProject ?? stockProjectList[0]?.id ?? 0;
  };

  const openStockMovement = async (
    material?: { id: number; name: string; unit: string },
    preset: 'entry' | 'exit' | 'transfer' = 'entry',
  ) => {
    const defaultPid = resolveStockProjectId();
    if (defaultPid == null) {
      notify(t('resources.stock.no_project_available'), 'warning');
      return;
    }
    const defaultName =
      defaultPid === 0 ? t('resources.stock.central_warehouse') : getProjectNameById(defaultPid);

    try {
      const inv = await materialService.getInventory(defaultPid);
      setMovementMaterials(
        inv.items
          .filter((m) => m.id != null)
          .map((m) => ({ id: m.id, name: m.name, unit: m.unit })),
      );
      if (!material && inv.items.length === 0) {
        notify(t('resources.stock.add_material_first'), 'warning');
      }
    } catch {
      setMovementMaterials([]);
    }

    setStockMovementType(preset);
    setStockMovementStep(1);
    setStockMovementError(null);
    setNewStockMovement({
      item: material?.name || '',
      materialId: material?.id,
      qty: '',
      unit: material?.unit || '',
      fromProjectId: defaultPid,
      toProjectId: defaultPid,
      chantier: defaultName,
      fromChantier: defaultName,
      toChantier: defaultName,
      receiver: '',
      docRef: '',
    });
    setIsStockMovementModalOpen(true);
  };

  const handleAssign = async (emp: any, projectValue: string | number) => {
    const projectId = typeof projectValue === 'number' ? projectValue : getProjectIdByName(projectValue);
    const projectName = getProjectNameById(projectId);
    setIsAssigningEmployee(true);
    try {
      await updateEmployee(emp.id, { ...emp, projectId });
      setIsAssignEmployeeModalOpen(false);
      notify(t('resources.notifications.employee_assigned', { name: emp.name, project: projectName }), 'success', '/resources');
    } catch (err: any) {
      notify(err?.message || t('resources.errors.assignment_error'), 'error', '/resources');
    } finally {
      setIsAssigningEmployee(false);
    }
  };

  const [employeeToUnassign, setEmployeeToUnassign] = useState<any>(null);
  const [isConfirmUnassignModalOpen, setIsConfirmUnassignModalOpen] = useState(false);

  const handleRemoveAssignment = (emp: any) => {
    setEmployeeToUnassign(emp);
    setIsConfirmUnassignModalOpen(true);
  };

  const confirmUnassign = async () => {
    if (employeeToUnassign) {
      setIsUnassigningEmployee(true);
      try {
        await unassignEmployee(employeeToUnassign.id);
        notify(t('resources.notifications.employee_unassigned', { name: employeeToUnassign.name }), 'info', '/resources');
      } catch (err: any) {
        notify(err?.message || t('resources.errors.unassignment_error'), 'error', '/resources');
      } finally {
        setIsUnassigningEmployee(false);
        setIsConfirmUnassignModalOpen(false);
        setEmployeeToUnassign(null);
      }
    }
  };

  const [selectedProjectForAdd, setSelectedProjectForAdd] = useState<number>(0);

  const handleSubmitAttendance = async () => {
    if (!attendanceProjectId) { notify(t('resources.errors.select_project'), 'error'); return; }
    setIsSubmittingAttendance(true);
    try {
      await attendanceService.bulkCreate({
        projectId: attendanceProjectId,
        date: attendanceDate,
        records: attendanceRecords
      });
      notify(t('resources.notifications.attendance_recorded', { date: attendanceDate, count: attendanceRecords.length }), 'success');
      loadAttendance();
    } catch (err: any) { notify(err?.message || t('resources.errors.attendance_error'), 'error'); }
    finally { setIsSubmittingAttendance(false); }
  };

  const confirmDelete = async () => {
    if (employeeToDelete) {
      setIsDeletingEmployee(true);
      try {
        await deleteEmployee(employeeToDelete.id);
        notify(t('resources.notifications.employee_deleted', { name: employeeToDelete.name }), 'info', '/resources');
        setIsConfirmDeleteModalOpen(false);
        setEmployeeToDelete(null);
      } catch (err: any) {
        notify(err?.message || 'Erreur lors de la suppression', 'error');
      } finally {
        setIsDeletingEmployee(false);
      }
    }
  };

  const loadAttendance = async () => {
    setIsLoadingAttendance(true);
    try {
      let history;
      if (attendanceProjectId) {
        const res = await attendanceService.getAll({ projectId: attendanceProjectId }) as any;
        history = Array.isArray(res) ? res : res.data;
      }

      if (history) {
        setAttendanceHistory(history);

        // Update records for today (compatibility)
        const todayStr = new Date().toISOString().split('T')[0];
        const projectEmployees = employees.filter(e => Number(e.projectId) === attendanceProjectId);
        const todayRecords = projectEmployees.map(emp => {
          const existing = history.find((h: any) => String(h.employeeId) === String(emp.id) && h.date === todayStr);
          return {
            employeeId: emp.id,
            name: emp.name,
            matricule: emp.matricule,
            role: emp.role,
            arrivalTime: existing?.arrivalTime || '07:30',
            departureTime: existing?.departureTime || '17:00',
            status: existing?.status || t('resources.attendance.present'),
            note: existing?.note || ''
          };
        });
        setAttendanceRecords(todayRecords);
      }
    } catch (err) {
      setAttendanceHistory([]);
      setAttendanceRecords([]);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'pointage') {
      loadAttendance();
    }
  }, [activeTab, attendanceProjectId]);

  const [movementMaterials, setMovementMaterials] = useState<{ id: number; name: string; unit: string }[]>([]);
  const [stockInventoryKey, setStockInventoryKey] = useState(0);

  const defaultPurchaseHeader = () => ({
    provider: '',
    priority: 'Normale',
    projectId: projects[0]?.id || 0,
    chantier: projects[0]?.name || '',
    deliveryDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [purchaseHeader, setPurchaseHeader] = useState(defaultPurchaseHeader);
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLineDraft[]>([createEmptyPurchaseLine()]);

  const purchaseGroups = useMemo(() => {
    const sorted = [...purchases].sort(
      (a, b) => new Date(b.deliveryDate || b.date || 0).getTime() - new Date(a.deliveryDate || a.date || 0).getTime(),
    );
    const map = new Map<string, typeof purchases>();
    for (const p of sorted) {
      const key = p.orderRef || `single-${p.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.values()];
  }, [purchases]);

  const [newStockMovement, setNewStockMovement] = useState({
    item: '',
    materialId: undefined as number | undefined,
    qty: '',
    unit: '',
    fromProjectId: 0,
    toProjectId: 0,
    chantier: '',
    fromChantier: '',
    toChantier: '',
    receiver: '',
    docRef: ''
  });




  const resetPurchaseForm = () => {
    setPurchaseHeader(defaultPurchaseHeader());
    setPurchaseLines([createEmptyPurchaseLine()]);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseStep < 2) {
      setIsSubmittingPurchase(true);
      try {
        if (!purchaseHeader.projectId) {
          notify(t('resources.errors.select_project'), 'error', '/resources');
          setIsSubmittingPurchase(false);
          return;
        }

        const validLines = purchaseLines.filter((l) => l.item && Number(l.qty) > 0);
        if (validLines.length === 0) {
          notify(t('resources.errors.purchase_lines_required'), 'error', '/resources');
          setIsSubmittingPurchase(false);
          return;
        }

        await addPurchaseBatch({
          projectId: purchaseHeader.projectId,
          provider: purchaseHeader.provider,
          deliveryDate: purchaseHeader.deliveryDate,
          priority: purchaseHeader.priority,
          designation: purchaseHeader.notes,
          lines: validLines.map((l) => ({
            item: l.item,
            quantity: Number(l.qty),
            unit: l.unit,
            unitPrice: Number(l.unitPrice || 0),
          })),
        });

        const itemsSummary = validLines.map((l) => l.item).join(', ');
        addLog({
          module: 'Ressources',
          action: `Nouvelle DA (${validLines.length} ligne(s)): ${itemsSummary} pour ${getProjectNameById(purchaseHeader.projectId)}`,
          user: name || 'Utilisateur',
          type: 'info',
        });
        notify(
          t('resources.notifications.purchase_batch_created', { count: validLines.length }),
          'success',
          '/resources',
        );
        setPurchaseStep(purchaseStep + 1);
      } catch (err: any) {
        notify(err?.message || t('resources.errors.purchase_creation_error'), 'error', '/resources');
      } finally {
        setIsSubmittingPurchase(false);
      }
    } else {
      setIsPurchaseModalOpen(false);
      setPurchaseStep(1);
      resetPurchaseForm();
    }
  };

  // Compteur pour générer un matricule unique
  const generateMatricule = () => `VMAT${String(Date.now()).slice(-6)}`;

  // État pour protéger contre les clics multiples
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  // État pour gérer l'affectation du technicien actuel
  const [technicianAssignment, setTechnicianAssignment] = useState({
    projectId: projects[0]?.id || 0,
    assignmentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [editingContract, setEditingContract] = useState<any>(null);
  const [newSubcontractTask, setNewSubcontractTask] = useState('');
  const [newSubcontractTaskCost, setNewSubcontractTaskCost] = useState('');

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: t('resources.roles.technician'),
    matricule: '',
    contract: t('resources.contracts.cdi') as 'CDI' | 'CDD' | 'Intérim' | 'Prestataire' | 'Stage',
    niu: '',
    phone: '',
    projectId: 0,
    weeklySalary: '',
  });

  const [newSubcontract, setNewSubcontract] = useState({
    company: '',
    niu: '',
    projectId: projects[0]?.id || 0,
    task: '',
    amount: '',
    startDate: '',
    endDate: '',
    tasks: [] as TaskDraft[],
    lots: [] as { lotNumber: number; lotName: string; tasks: TaskDraft[] }[],
  });
  const [useLots, setUseLots] = useState(false);
  const [newLotName, setNewLotName] = useState('');
  const [newLotTask, setNewLotTask] = useState<Record<number, string>>({});
  const [newLotTaskCost, setNewLotTaskCost] = useState<Record<number, string>>({});

  const addLot = () => {
    const lotNumber = newSubcontract.lots.length + 1;
    setNewSubcontract(prev => ({
      ...prev,
      lots: [...prev.lots, { lotNumber, lotName: newLotName || `Lot ${lotNumber}`, tasks: [] }]
    }));
    setNewLotName('');
  };

  const removeLot = (lotIndex: number) => {
    setNewSubcontract(prev => ({
      ...prev,
      lots: prev.lots.filter((_, i) => i !== lotIndex).map((l, i) => ({ ...l, lotNumber: i + 1 }))
    }));
  };

  const addTaskToLot = (lotIndex: number) => {
    const title = newLotTask[lotIndex]?.trim();
    if (!title) return;
    const cost = newLotTaskCost[lotIndex] || '0';
    setNewSubcontract((prev) => {
      const lots = [...prev.lots];
      lots[lotIndex] = {
        ...lots[lotIndex],
        tasks: [...lots[lotIndex].tasks, { title, cost }],
      };
      return { ...prev, lots };
    });
    setNewLotTask((prev) => ({ ...prev, [lotIndex]: '' }));
    setNewLotTaskCost((prev) => ({ ...prev, [lotIndex]: '' }));
  };

  const buildTasksPayload = () => {
    const raw = useLots
      ? newSubcontract.lots.flatMap((lot) =>
          lot.tasks
            .filter((t) => t.title.trim() !== '')
            .map((t) => ({
              title: t.title.trim(),
              cost: Number(t.cost || 0),
              lotNumber: lot.lotNumber,
              lotName: lot.lotName,
            })),
        )
      : newSubcontract.tasks
          .filter((t) => t.title.trim() !== '')
          .map((t) => ({
            title: t.title.trim(),
            cost: Number(t.cost || 0),
            lotNumber: 1,
            lotName: 'Lot 1',
          }));
    return raw;
  };

  const removeTaskFromLot = (lotIndex: number, taskIndex: number) => {
    setNewSubcontract(prev => {
      const lots = [...prev.lots];
      lots[lotIndex] = { ...lots[lotIndex], tasks: lots[lotIndex].tasks.filter((_, i) => i !== taskIndex) };
      return { ...prev, lots };
    });
  };

  const isHrExcludedFromRegistry = useCallback((emp: (typeof employees)[number]) => {
    if ((emp as any)._virtual || (emp as any).isCurrentUser) return true;
    const r = (emp.role || '').toLowerCase();
    return r.includes('directeur');
  }, []);

  const hrRegistryEmployees = useMemo(
    () => employees.filter(emp => !isHrExcludedFromRegistry(emp)),
    [employees, isHrExcludedFromRegistry]
  );

  const displayedHrEmployees = useMemo(() => {
    const q = hrSearchQuery.toLowerCase();
    return hrRegistryEmployees.filter(emp => {
      const matchesSearch =
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        (emp.niu && emp.niu.toLowerCase().includes(q));
      const matchesProject = selectedProjectFilter === null || emp.projectId === selectedProjectFilter;

      if (role === 'Chef_chantier') {
        return (
          matchesSearch &&
          matchesProject &&
          emp.isLocal === true &&
          chefProjectIds.includes(Number(emp.projectId)) &&
          !emp.isOnLeave
        );
      }

      return matchesSearch && matchesProject && !emp.isOnLeave;
    });
  }, [hrRegistryEmployees, hrSearchQuery, selectedProjectFilter, role, chefProjectIds]);

  const unassignedEmployees = useMemo(
    () => hrRegistryEmployees.filter(emp => (!emp.projectId || emp.projectId === 0) && !emp.isOnLeave),
    [hrRegistryEmployees]
  );

  const isOnActiveProject = (projectId?: number) =>
    !!projectId && projectId !== 0 && projects.some((p) => p.id === projectId);

  const hrStats = useMemo(() => {
    const active = hrRegistryEmployees.filter(e => !e.isOnLeave);
    return {
      total: active.length,
      onSites: active.filter((e) => isOnActiveProject(e.projectId)).length,
      offDuty: hrRegistryEmployees.filter(e => e.isOnLeave).length,
    };
  }, [hrRegistryEmployees, projects]);





  const handleAddEmployee = async () => {
    if (!newEmployee.name.trim()) {
      notify('Le nom est obligatoire', 'error');
      return;
    }
    if (!newEmployee.role.trim()) {
      notify('Le poste est obligatoire', 'error');
      return;
    }
    if (role === 'Chef_chantier' && (!newEmployee.projectId || newEmployee.projectId === 0)) {
      notify('Veuillez sélectionner un chantier pour cet employé.', 'error');
      return;
    }
    if (role === 'Chef_chantier') {
      const salary = parseFloat(newEmployee.weeklySalary);
      if (!Number.isFinite(salary) || salary <= 0) {
        notify(t('resources.hr.weekly_salary_required'), 'error');
        return;
      }
    }
    setIsAddingEmployee(true);
    try {
      const selectedProjId = role === 'Chef_chantier' ? newEmployee.projectId : undefined;

      await addEmployee({
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        matricule: newEmployee.matricule.trim() || generateMatricule(),
        contract: role === 'Chef_chantier' ? 'CDD' : newEmployee.contract,
        niu: newEmployee.niu.trim(),
        phone: newEmployee.phone.trim(),
        projectId: selectedProjId,
        isLocal: role === 'Chef_chantier',
        weeklySalary: role === 'Chef_chantier' ? parseFloat(newEmployee.weeklySalary) : undefined,
      });
      addLog({
        module: 'Ressources',
        action: `Ajout du collaborateur : ${newEmployee.name} (${newEmployee.role})`,
        user: name || 'Utilisateur',
        type: 'success'
      });
      notify(t('resources.notifications.employee_added', { name: newEmployee.name }), 'success', '/resources');
      setNewEmployee({ name: '', role: t('resources.roles.technician'), matricule: '', contract: t('resources.contracts.cdi'), niu: '', phone: '', projectId: 0, weeklySalary: '' });
      setIsEmployeeModalOpen(false);
    } catch (err: any) {
      notify(err?.message || t('resources.errors.employee_add_error'), 'error', '/resources');
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const equipmentRequestsLive = useEquipmentRequestsLive({
    enabled: activeTab === 'equipment',
    mine: role === 'Chef_chantier',
  });
  const {
    requests: equipmentRequests,
    isLoading: isLoadingEquipmentRequests,
    isLive: isLiveEquipmentRequests,
    load: loadEquipmentRequests,
    upsertLocal: upsertEquipmentRequest,
  } = equipmentRequestsLive;

  const openEquipmentRequestModal = () => {
    const defaultProjectId = chefProjects[0]?.id ?? projects[0]?.id ?? 0;
    setEquipmentRequestForm({
      needDescription: '',
      desiredDate: today,
      projectId: Number(defaultProjectId),
    });
    setIsEquipmentModalOpen(true);
  };

  const handleSubmitEquipmentRequest = async () => {
    const { needDescription, desiredDate, projectId } = equipmentRequestForm;
    if (!needDescription.trim() || needDescription.trim().length < 10) {
      notify(t('resources.equipment.request_form.need_placeholder'), 'error', '/resources');
      return;
    }
    if (!desiredDate || !projectId) {
      notify(t('resources.equipment.request_submit_error'), 'error', '/resources');
      return;
    }
    setIsSubmittingEquipment(true);
    try {
      const created = await equipmentRequestService.create({
        needDescription: needDescription.trim(),
        desiredDate,
        projectId: Number(projectId),
      });
      addLog({
        module: 'Ressources',
        action: `Demande véhicule ${created.ref} : ${created.needDescription.slice(0, 60)}`,
        user: name || 'Utilisateur',
        type: 'info',
      });
      notify(
        t('resources.equipment.request_submitted', { ref: created.ref }),
        created.status === 'Erreur envoi' ? 'warning' : 'success',
        '/resources'
      );
      setIsEquipmentModalOpen(false);
      upsertEquipmentRequest(created);
      loadEquipmentRequests({ silent: true });
    } catch (err: any) {
      console.error('[VAN LOGISTIQUE FRONT] handleSubmitEquipmentRequest:', err?.message, err);
      notify(err?.message || t('resources.equipment.request_submit_error'), 'error', '/resources');
    } finally {
      setIsSubmittingEquipment(false);
    }
  };

  const handleCancelEquipmentRequest = async (req: EquipmentRequest) => {
    try {
      const updated = await equipmentRequestService.cancel(req.id);
      notify(t('resources.equipment.request_cancelled', { ref: updated.ref }), 'info', '/resources');
      upsertEquipmentRequest(updated);
    } catch (err: any) {
      notify(err?.message || t('resources.equipment.request_submit_error'), 'error', '/resources');
    }
  };

  const handleRetryEquipmentRequest = async (req: EquipmentRequest) => {
    try {
      const updated = await equipmentRequestService.retry(req.id);
      notify(
        t('resources.equipment.request_submitted', { ref: updated.ref }),
        updated.status === 'Erreur envoi' ? 'warning' : 'success',
        '/resources'
      );
      upsertEquipmentRequest(updated);
      loadEquipmentRequests({ silent: true });
    } catch (err: any) {
      console.error('[VAN LOGISTIQUE FRONT] handleRetryEquipmentRequest:', err?.message, err);
      notify(err?.message || t('resources.equipment.request_submit_error'), 'error', '/resources');
    }
  };

  const [isSubmittingSubcontract, setIsSubmittingSubcontract] = useState(false);
  const [stockMovementError, setStockMovementError] = useState<string | null>(null);

  // États pour les filtres du journal complet
  const [logbookFilters, setLogbookFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    projectId: 'all',
    type: 'all'
  });

  // État pour gérer les données d'inventaire
  const [inventoryData, setInventoryData] = useState<any[]>([]);

  // Fonction pour calculer le stock théorique réel par article
  const getTheoreticalStock = () => {
    const stockByItem: Record<string, { total: number; unit: string; items: string[] }> = {};

    // Calculer le stock pour chaque article en fonction des mouvements
    const items = Array.from(new Set(stockMovements.map((m: any) => m.item as string))).filter(Boolean) as string[];

    items.forEach(item => {
      const itemMovements = stockMovements.filter((m: any) => {
        const matchItem = m.item === item;
        if (stockView === 'warehouse') {
          return matchItem && (m.projectId == 0 || m.projectId === null);
        } else {
          const matchProject = selectedStockProject === null
            ? (m.projectId != 0 && m.projectId !== null)
            : (Number(m.projectId) === Number(selectedStockProject));
          return matchItem && matchProject;
        }
      });
      const totalEntries = itemMovements
        .filter((m: any) => m.type.startsWith('Entrée'))
        .reduce((sum: number, m: any) => sum + Number(m.qty || m.quantity || 0), 0);
      const totalExits = itemMovements
        .filter((m: any) => m.type.startsWith('Sortie') || m.type === 'Transfert')
        .reduce((sum: number, m: any) => sum + Number(m.qty || m.quantity || 0), 0);

      const unit = itemMovements[0]?.unit || 'unités';
      stockByItem[item] = {
        total: totalEntries - totalExits,
        unit: unit,
        items: [item]
      };
    });

    return stockByItem;
  };

  // Fonction pour initialiser les données d'inventaire
  const initializeInventoryData = () => {
    const theoreticalStock = getTheoreticalStock();
    const data = Object.entries(theoreticalStock).map(([item, data]) => ({
      item,
      theoretical: Math.max(0, data.total),
      observed: Math.max(0, data.total),
      unit: data.unit,
      variance: 0,
      justification: ''
    }));
    setInventoryData(data);
  };

  // Initialiser les données d'inventaire quand la modale s'ouvre
  React.useEffect(() => {
    if (isInventoryModalOpen) {
      initializeInventoryData();
    }
  }, [isInventoryModalOpen, stockMovements]);

  // Fonction pour filtrer les mouvements selon les filtres
  const getFilteredLogbook = () => {
    let filtered = stockMovements;

    // Filtrer par date
    if (logbookFilters.date) {
      filtered = filtered.filter((log: any) =>
        log.date && log.date.includes(logbookFilters.date)
      );
    }

    // Filtrer par projet
    if (logbookFilters.projectId !== 'all') {
      filtered = filtered.filter((log: any) =>
        Number(log.projectId) === Number(logbookFilters.projectId)
      );
    }

    // Filtrer par type
    if (logbookFilters.type !== 'all') {
      const typeMap: Record<string, string[]> = {
        'entries': ['Entrée', 'Entrées (Réceptions)'],
        'exits': ['Sortie', 'Sorties (Consommations)', 'Transfert']
      };
      filtered = filtered.filter((log: any) =>
        typeMap[logbookFilters.type]?.includes(log.type)
      );
    }

    return filtered;
  };

  const handleSubcontractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Protection contre les soumissions multiples
    if (isSubmittingSubcontract) {
      return;
    }

    // Validation frontend avant envoi au backend
    if (!newSubcontract.company?.trim()) {
      notify('Le nom de l\'entreprise est obligatoire', 'error', '/resources');
      return;
    }

    const tasksPayload = buildTasksPayload();
    const montant = sumTaskCosts(tasksPayload);
    if (!tasksPayload.length || montant <= 0) {
      notify('Ajoutez au moins une tâche avec un montant supérieur à 0', 'error', '/resources');
      return;
    }

    if (!newSubcontract.projectId || newSubcontract.projectId === 0) {
      notify(t('resources.errors.select_project'), 'error', '/resources');
      return;
    }


    try {
      setIsSubmittingSubcontract(true);

      if (editingContract) {
        const tasksWithIds = tasksPayload.map((t) => {
          const existing = (editingContract.tasks || []).find(
            (et: any) => et.title === t.title && (et.lotNumber || 1) === t.lotNumber,
          );
          return existing?.id ? { ...t, id: Number(existing.id), completed: existing.completed, paid: existing.paid } : t;
        });

        await updateSubcontract(editingContract.id, {
          entreprise: newSubcontract.company,
          objet: newSubcontract.task,
          projectId: newSubcontract.projectId,
          montant: Math.round(montant),
          startDate: newSubcontract.startDate || undefined,
          endDate: newSubcontract.endDate || undefined,
          niu: newSubcontract.niu,
          tasks: tasksWithIds,
        });
        notify(`Contrat de ${newSubcontract.company} mis à jour.`, 'success', '/resources');
      } else {
        await addSubcontract({
          entreprise: newSubcontract.company,
          objet: newSubcontract.task,
          projectId: newSubcontract.projectId,
          montant: Math.round(montant),
          progress: 0,
          startDate: newSubcontract.startDate || undefined,
          endDate: newSubcontract.endDate || undefined,
          niu: newSubcontract.niu,
          tasks: tasksPayload,
        });
        addLog({
          module: 'Ressources',
          action: `Nouveau contrat ST: ${newSubcontract.company} — ${newSubcontract.task}`,
          user: name || 'Utilisateur',
          type: 'success'
        });
        notify(t('resources.notifications.contract_created', { company: newSubcontract.company }), 'success', '/resources');
      }
    } catch (err: any) {
      notify(err?.message || t('resources.errors.contract_save_error'), 'error', '/resources');
      return;
    } finally {
      setIsSubmittingSubcontract(false);
    }

    setIsSubcontractModalOpen(false);
    setEditingContract(null);
    setNewSubcontract({
      company: '',
      niu: '',
      projectId: projects[0]?.id || 0,
      task: '',
      amount: '',
      startDate: '',
      endDate: '',
      tasks: [],
      lots: []
    });
    setUseLots(false);
  };

  const toggleSubcontractTask = async (contractId: number, taskId: string) => {
    const contract = subcontracts.find(c => c.id === contractId);
    if (!contract) return;

    // Optimistic UI update for selected contract view
    const updatedTasks = contract.tasks.map(t => String(t.id) === String(taskId) ? { ...t, completed: !t.completed } : t);
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;

    if (selectedContract && selectedContract.id === contractId) {
      setSelectedContract({ ...contract, tasks: updatedTasks, progress });
    }

    const normalized = await contextToggleSubcontractTask(contractId, taskId);
    if (selectedContract && selectedContract.id === contractId) {
      setSelectedContract(normalized);
    }
  };

  const handleServiceProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tasksPayload = newServiceProvider.tasks
      .filter((t) => t.title.trim() !== '')
      .map((t) => ({
        title: t.title.trim(),
        cost: Number(t.cost || 0),
        lotNumber: 1,
        lotName: 'Prestation',
      }));
    const montant = sumTaskCosts(tasksPayload);

    if (!newServiceProvider.name || !newServiceProvider.projectId) {
      notify('Le nom et le chantier sont obligatoires', 'error');
      return;
    }
    if (!tasksPayload.length || montant <= 0) {
      notify('Ajoutez au moins une tâche avec un montant supérieur à 0', 'error');
      return;
    }

    setIsSubmittingServiceProvider(true);
    try {
      await addSubcontract({
        entreprise: newServiceProvider.name,
        projectId: newServiceProvider.projectId,
        montant,
        type: 'provider',
        tasks: tasksPayload,
      });

      notify('Prestataire de service ajouté avec succès', 'success');
      setIsServiceProviderModalOpen(false);
      setNewServiceProvider({
        name: '',
        projectId: projects[0]?.id || 0,
        tasks: [],
      });
      setNewProviderTaskTitle('');
      setNewProviderTaskCost('');
    } catch (err: any) {
      notify(err?.message || t('resources.errors.provider_add_error'), 'error');
    } finally {
      setIsSubmittingServiceProvider(false);
    }
  };

  const handlePayProvider = async (provider: any) => {
    const payable = getPayableAmount(provider);
    if (payable <= 0) {
      notify('Cochez des tâches terminées avec un montant pour effectuer un paiement', 'warning', '/resources');
      return;
    }

    const taskLabels = (provider.tasks || [])
      .filter((t: any) => t.completed && !t.paid)
      .map((t: any) => t.title)
      .join(', ');

    if (
      !window.confirm(
        `Confirmer le paiement de ${formatFcfa(payable)} pour ${provider.company} ?\nTâches : ${taskLabels}`,
      )
    ) {
      return;
    }

    setIsPayingProvider(true);
    try {
      const { amount, subcontract: updatedContract } = await paySubcontractCompletedTasks(provider.id);

      await addTransaction({
        type: 'expense',
        category: provider.type === 'provider' ? "Main-d'œuvre - Prestataire" : 'Sous-traitance',
        provider: provider.company,
        projectId: provider.projectId,
        amount,
        description: `Paiement tâches terminées — ${provider.company}`,
        status: 'Validé',
        transactionDate: new Date().toISOString().split('T')[0],
      });

      if (selectedContract?.id === provider.id && updatedContract) {
        setSelectedContract(updatedContract);
      }

      notify(`Paiement de ${formatFcfa(amount)} enregistré pour ${provider.company}`, 'success', '/resources');
      addLog({
        module: 'Resources',
        action: `Paiement ${provider.type === 'provider' ? 'prestataire' : 'sous-traitant'}: ${provider.company} (${amount.toLocaleString()} FCFA)`,
        user: name || 'Chef Chantier',
        type: 'success',
      });
    } catch (err: any) {
      notify(err?.message || 'Erreur lors du paiement', 'error');
    } finally {
      setIsPayingProvider(false);
    }
  };

  const handleStockMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockMovementError(null); // Réinitialiser l'erreur

    // Toujours traiter le formulaire à l'étape 1
    if (stockMovementStep === 1) {
      setIsSubmittingStockMovement(true);
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString('fr-FR')} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      let projectLabel = '';

      // Validation de la quantité
      const qty = Number(newStockMovement.qty);
      if (!qty || qty <= 0) {
        notify(t('resources.errors.quantity_positive'), 'error', '/resources');
        setIsSubmittingStockMovement(false);
        return;
      }

      // Validation de l'article
      if (!newStockMovement.item || newStockMovement.item.trim() === '') {
        notify(t('resources.errors.select_item'), 'error', '/resources');
        setIsSubmittingStockMovement(false);
        return;
      }

      if (stockMovementType === 'transfer') {
        // Validation des projets pour les transferts
        // En mode warehouse, l'un des deux peut être 0 (Magasin Central)
        const fromId = Number(newStockMovement.fromProjectId);
        const toId = Number(newStockMovement.toProjectId);

        if (stockView === 'projects') {
          if (fromId === 0) { notify(t('resources.errors.select_project_source'), 'error', '/resources'); setIsSubmittingStockMovement(false); return; }
          if (toId === 0) { notify(t('resources.errors.select_project_destination'), 'error', '/resources'); setIsSubmittingStockMovement(false); return; }
        }

        if (fromId === toId) {
          notify('Les sites source et destination doivent être différents.', 'error', '/resources');
          setIsSubmittingStockMovement(false);
          return;
        }

        projectLabel = `${getProjectNameById(newStockMovement.fromProjectId)} -> ${getProjectNameById(newStockMovement.toProjectId)}`;

        try {
          // Un seul appel pour le transfert atomique (Sortie + Entrée gérées par le backend)
          await addStockMovement({
            movementDate: new Date().toISOString().split('T')[0],
            type: 'Transfert',
            item: newStockMovement.item,
            materialId: newStockMovement.materialId,
            quantity: Number(newStockMovement.qty || 0),
            unit: newStockMovement.unit,
            projectId: newStockMovement.fromProjectId,
            toProjectId: newStockMovement.toProjectId,
            note: `Transfert vers ${getProjectNameById(newStockMovement.toProjectId)}`,
          });
        } catch (err: any) {
          if (err?.message?.includes('Stock insuffisant') || err?.message?.includes('insufficient stock')) {
            setStockMovementError(err.message);
            setStockMovementStep(2);
            return;
          }
          notify(err?.message || 'Erreur lors du transfert', 'error', '/resources');
          return;
        } finally {
          setIsSubmittingStockMovement(false);
        }
        setStockInventoryKey((k) => k + 1);
        addLog({
          module: 'Ressources',
          action: `Mouvement de stock (Transfert): ${newStockMovement.item} (${newStockMovement.qty} ${newStockMovement.unit}) - ${projectLabel}`,
          user: name || 'Utilisateur',
          type: 'info',
        });
        notify('Mouvement de stock (Transfert) enregistré.', 'success', '/resources');
        setStockMovementStep(2);
        return;
      } else {
        const typeLabel = stockMovementType === 'entry' ? 'Entrée' : 'Sortie';
        const effectiveProjectId = stockMovementType === 'entry' ? newStockMovement.toProjectId : newStockMovement.fromProjectId;

        projectLabel = getProjectNameById(effectiveProjectId);

        // Validation: En mode projet, on ne veut pas de 0. En mode warehouse, on veut bien du 0.
        if (stockView === 'projects' && Number(effectiveProjectId) === 0) {
          notify(t('resources.errors.select_project_valid'), 'error', '/resources');
          setIsSubmittingStockMovement(false);
          return;
        }

        try {
          await addStockMovement({
            movementDate: new Date().toISOString().split('T')[0],
            type: typeLabel,
            item: newStockMovement.item,
            materialId: newStockMovement.materialId,
            quantity: Number(newStockMovement.qty || 0),
            unit: newStockMovement.unit,
            projectId: Number(effectiveProjectId),
          });
        } catch (err: any) {
          if (err?.message?.includes('Stock insuffisant') || err?.message?.includes('insufficient stock')) {
            setStockMovementError(err.message);
            setStockMovementStep(2);
            return;
          }
          notify(err?.message || 'Erreur lors du mouvement', 'error', '/resources');
          return;
        } finally {
          setIsSubmittingStockMovement(false);
        }
      }

      const labelForLog = stockMovementType === 'entry' ? 'Entrée' : stockMovementType === 'exit' ? 'Sortie' : 'Transfert';

      addLog({
        module: 'Ressources',
        action: `Mouvement de stock (${labelForLog}): ${newStockMovement.item} (${newStockMovement.qty} ${newStockMovement.unit}) - ${projectLabel}`,
        user: name || 'Utilisateur',
        type: stockMovementType === 'exit' ? 'warning' : 'info'
      });
      notify(`Mouvement de stock (${labelForLog}) enregistré.`, 'success', '/resources');
      setStockInventoryKey((k) => k + 1);

      // Passer à l'étape 2 pour afficher le message de succès
      setStockMovementStep(2);
      return;
    }

    // Si on est à l'étape 2, fermer la modale
    if (stockMovementStep === 2) {
      // Réinitialiser selon la vue active : warehouse → projectId=0, projects → premier projet
      const defaultPid = stockView === 'warehouse' ? 0 : (projects[0]?.id || 0);
      const defaultName = stockView === 'warehouse' ? 'Magasin Central' : (projects[0]?.name || '');
      setIsStockMovementModalOpen(false);
      setStockMovementStep(1);
      setStockMovementError(null);
      setNewStockMovement({
        item: '',
        materialId: undefined,
        qty: '',
        unit: '',
        fromProjectId: defaultPid,
        toProjectId: defaultPid,
        chantier: defaultName,
        fromChantier: defaultName,
        toChantier: defaultName,
        receiver: '',
        docRef: '',
      });
    }
  };

  React.useEffect(() => {
    const handleOpenLogbook = () => setIsFullLogbookModalOpen(true);
    const handleOpenInventory = () => setIsInventoryModalOpen(true);

    window.addEventListener('open-logbook', handleOpenLogbook);
    window.addEventListener('open-inventory', handleOpenInventory);

    return () => {
      window.removeEventListener('open-logbook', handleOpenLogbook);
      window.removeEventListener('open-inventory', handleOpenInventory);
    };
  }, []);

  const availableTabs = [
    { id: 'purchases', label: t('resources.tabs.purchases'), icon: ShoppingCart, roles: ['Directeur technique', 'Chef_chantier'] },
    { id: 'stock', label: t('resources.tabs.stock'), icon: Package, roles: ['Directeur technique', 'Gestionnaire de stocks', 'Chef_chantier'] },
    { id: 'equipment', label: t('resources.tabs.equipment'), icon: Truck, roles: ['Directeur technique', 'Chef_chantier'] },
    { id: 'hr', label: t('resources.tabs.hr'), icon: Users, roles: ['Directeur technique', 'Chef_chantier'] },
    { id: 'subcontracting', label: t('resources.tabs.subcontracting'), icon: Handshake, roles: ['Directeur technique', 'Chef_chantier'] },
    { id: 'pointage', label: t('resources.pointage.title'), icon: Clock, roles: ['Directeur technique', 'Chef_chantier'] },
  ].filter(tab => tab.roles.includes(role || ''));

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <Package className="w-4 h-4" />
            <span>{t('resources.execution_cameroon')}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{t('resources.title')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t('resources.header_desc')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManagePurchases && (
            <Button variant="outline" onClick={() => {
              resetPurchaseForm();
              setPurchaseStep(1);
              setIsPurchaseModalOpen(true);
            }} className="bg-white border-slate-200 font-bold">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Demande d'Achat (DA)
            </Button>
          )}

        </div>
      </div>

      {availableTabs.length > 1 && (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar w-full sm:w-fit">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0",
                activeTab === tab.id ? "bg-white shadow-md text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === 'purchases' ? 'Achats' :
                  tab.id === 'stock' ? 'Stocks' :
                    tab.id === 'equipment' ? 'Engins' :
                      tab.id === 'hr' ? 'Pers.' :
                        tab.id === 'subcontracting' ? 'ST' :
                          tab.id === 'pointage' ? 'Points' : tab.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'purchases' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{t('resources.purchases.history')}</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{t('resources.purchases.last_orders')}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 font-bold"
                        onClick={() => {
                          const dataToExport = purchases
                            .sort((a, b) => new Date(b.deliveryDate || b.date || 0).getTime() - new Date(a.deliveryDate || a.date || 0).getTime())
                            .map(p => ({
                              'RÉFÉRENCE': p.orderRef || p.ref || `BC-${p.id}`,
                              'DATE': p.deliveryDate || p.date ? new Date(p.deliveryDate || p.date).toLocaleDateString('fr-FR') : 'N/A',
                              'PROJET': getProjectNameById(p.projectId),
                              'DÉSIGNATION': p.item,
                              'FOURNISSEUR': p.provider || 'N/A',
                              'QUANTITÉ': p.quantity || p.qty || 0,
                              'PRIX UNITAIRE (FCFA)': p.unitPrice || 0,
                              'MONTANT TOTAL (FCFA)': p.total || (Number(p.quantity || p.qty || 0) * Number(p.unitPrice || 0)),
                              'STATUT': p.status
                            }));
                          exportToCSV(dataToExport, `historique_achats_${new Date().toISOString().split('T')[0]}`);
                        }}
                      >
                        Exporter
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 px-4 font-bold">Filtres</Button>
                    </div>
                  </div>
                  <PurchaseHistoryAccordion
                    groups={purchaseGroups}
                    getProjectName={getProjectNameById}
                    onConfirmDelivery={(p) => {
                      setPurchaseToUpdate(p);
                      setIsConfirmModalOpen(true);
                    }}
                  />
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <StockManagementPanel
              key={stockInventoryKey}
              stockView={stockView}
              setStockView={setStockView}
              selectedStockProject={selectedStockProject}
              setSelectedStockProject={setSelectedStockProject}
              projects={stockProjectList}
              stockMovements={stockMovements}
              role={role}
              canManageStock={role === 'Gestionnaire de stocks' || role === 'Directeur technique'}
              siteOnlyMode={role === 'Chef_chantier'}
              onOpenMovement={openStockMovement}
              onOpenLogbook={() => setIsFullLogbookModalOpen(true)}
              onOpenInventory={() => setIsInventoryModalOpen(true)}
              stockSearchQuery={stockSearchQuery}
              setStockSearchQuery={setStockSearchQuery}
              showViewToggle={role === 'Directeur technique'}
              onInventoryChange={() => setStockInventoryKey((k) => k + 1)}
            />
          )}

          {activeTab === 'equipment' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('resources.equipment.fleet_title')}</h3>
                  {projects.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Filter className="w-3 h-3 text-slate-400" />
                      <select
                        value={selectedEquipmentProject ?? ''}
                        onChange={(e) => setSelectedEquipmentProject(e.target.value ? Number(e.target.value) : null)}
                        className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-transparent outline-none cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                      >
                        <option key="filter-all-sites" value="">{t('resources.all_sites')}</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {canManageEquipment && (
                  <Button onClick={openEquipmentRequestModal} className="font-bold shadow-lg shadow-blue-900/10">
                    <Plus className="w-4 h-4 mr-2" /> {t('resources.equipment.request')}
                  </Button>
                )}
              </div>

              <EquipmentRequestsPanel
                requests={equipmentRequests}
                isLoading={isLoadingEquipmentRequests}
                isLive={isLiveEquipmentRequests}
                showCancel={canManageEquipment}
                getProjectLabel={(req) => req.project?.name || getProjectNameById(req.projectId)}
                onCancel={handleCancelEquipmentRequest}
                onRetry={handleRetryEquipmentRequest}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {equipmentList
                  .filter(item => selectedEquipmentProject === null || item.projectId === selectedEquipmentProject)
                  .map((item, i) => (
                    <Card
                      key={`equipment-${i}`}
                      className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-2xl transition-all group cursor-pointer"
                      onClick={() => setSelectedResource({ ...item, type: 'equipment' })}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                          <Truck className="w-6 h-6" />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md",
                          item.status === 'En service' ? "bg-emerald-100 text-emerald-700" :
                            item.status === 'En cours' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {item.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mb-1">{item.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{item.ref}</p>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center text-xs font-bold text-slate-600">
                          <MapPin className="w-3 h-3 mr-2 text-slate-400" /> {item.location.startsWith('Demande') ? item.location : `Localisation: ${item.location}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {item.status === 'En cours' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50 font-bold"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteEquipment(item.id);
                              notify(`Demande pour ${item.name} annulée.`, 'info', '/resources');
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> {t('resources.equipment.cancel_request')}
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'hr' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('resources.hr.title')}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{t('resources.hr.management')}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    onChange={(e) => setSelectedProjectFilter(e.target.value ? Number(e.target.value) : null)}
                    value={selectedProjectFilter ?? ''}
                  >
                    <option key="filter-all-projects" value="">Tous les chantiers</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {canManagePersonnel && (
                    <div className="flex gap-2">
                      {isChefSiteRole && (
                        <Button onClick={() => setIsEmployeeModalOpen(true)} className="font-bold shadow-lg shadow-blue-900/10">
                          <Plus className="w-4 h-4 mr-2" /> {t('resources.modals.add_worker_site')}
                        </Button>
                      )}
                      {role === 'Directeur technique' && (
                        <Button onClick={() => setIsUnassignedModalOpen(true)} className="font-bold shadow-lg shadow-blue-900/10" variant="outline">
                          <UserPlus className="w-4 h-4 mr-2" /> Affecter du Personnel
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {role !== 'Chef_chantier' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="p-6 border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('resources.hr.total_staff')}</p>
                      <p className="text-2xl font-black text-slate-900">{hrStats.total}</p>
                    </div>
                  </Card>
                  <Card className="p-6 border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                      <HardHat className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('resources.hr.on_sites')}</p>
                      <p className="text-2xl font-black text-slate-900">{hrStats.onSites}</p>
                    </div>
                  </Card>
                  <Card className="p-6 border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('resources.hr.off_duty')}</p>
                      <p className="text-2xl font-black text-slate-900">{hrStats.offDuty}</p>
                    </div>
                  </Card>
                </div>
              )}

              <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {role === 'Chef_chantier' ? "Liste de vos Ouvriers Locaux" : t('resources.hr.title')}
                  </h3>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t('common.search_placeholder')}
                      value={hrSearchQuery}
                      onChange={(e) => setHrSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                        <th className="px-6 py-4">Employé</th>
                        {role !== 'Chef_chantier' && <th className="px-6 py-4">Matricule</th>}
                        <th className="px-6 py-4">Poste / Qualification</th>
                        {role === 'Chef_chantier' && <th className="px-6 py-4">Téléphone</th>}
                        {role === 'Chef_chantier' && <th className="px-6 py-4">{t('resources.hr.table.weekly_salary')}</th>}
                        <th className="px-6 py-4">{role === 'Chef_chantier' ? "Chantier d'affectation" : "Affectation"}</th>
                        {role !== 'Chef_chantier' && <th className="px-6 py-4">Type Contrat</th>}
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayedHrEmployees.map((emp, i) => (
                        <tr
                          key={`employee-${i}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {emp.avatar ? (
                                <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-100" />
                              ) : (
                                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-[10px] border-2 border-slate-50">
                                  {emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 leading-tight">{emp.name}</span>
                                {role !== 'Chef_chantier' && (
                                  <span className="text-[10px] font-bold text-slate-400 lowercase">{emp.email || 'Pas d\'email'}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          {role !== 'Chef_chantier' && (
                            <td className="px-6 py-4 text-xs font-bold text-slate-500">{emp.matricule}</td>
                          )}
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">
                            <div className="flex flex-col">
                              <span>{emp.role}</span>
                              {role !== 'Chef_chantier' && emp.category && emp.category !== 'N/A' && (
                                <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{emp.category}</span>
                              )}
                            </div>
                          </td>
                          {role === 'Chef_chantier' && (
                            <td className="px-6 py-4 text-xs font-bold text-slate-500">{emp.phone || 'Pas de numéro'}</td>
                          )}
                          {role === 'Chef_chantier' && (
                            <td className="px-6 py-4 text-xs font-black text-emerald-700">
                              {emp.weeklySalary != null && emp.weeklySalary > 0
                                ? formatCFA(emp.weeklySalary)
                                : '—'}
                            </td>
                          )}
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">
                            {(!emp.projectId || emp.projectId === 0) ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                <AlertCircle className="w-3 h-3" /> Non assigné
                              </span>
                            ) : (
                              <span className="text-slate-700 font-bold">{getEmployeeProjectLabel(emp.projectId)}</span>
                            )}
                          </td>
                          {role !== 'Chef_chantier' && (
                            <td className="px-6 py-4 text-xs font-bold text-slate-900">{emp.contract}</td>
                          )}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              {/* Voir Détails */}
                              {role !== 'Chef_chantier' && (
                                <button
                                  title={t('resources.modals.view_details')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmployeeForDetail(emp);
                                    setIsEmployeeDetailModalOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}

                              {/* Changer Affectation */}
                              <button
                                title={t('resources.modals.change_assignment')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedResource({ ...emp, type: 'hr' });
                                  setIsAssignEmployeeModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              >
                                <Settings2 className="w-4 h-4" />
                              </button>

                              {/* Supprimer (Uniquement pour les employés locaux) */}
                              {emp.isLocal && (
                                <button
                                  title={t('resources.modals.delete')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmployeeToDelete(emp);
                                    setIsConfirmDeleteModalOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          )}

          {activeTab === 'subcontracting' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('resources.subcontracting.title')}</h3>
                  <div className="flex gap-1 mt-3 p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                      onClick={() => setStTab('contracts')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        stTab === 'contracts' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Contrats de Sous-traitance
                    </button>
                    <button
                      onClick={() => setStTab('providers')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        stTab === 'providers' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Prestataires de Services
                    </button>
                  </div>
                </div>

                {isDirecteurTechnique && (stTab === 'contracts' ? (
                  <Button onClick={() => {
                    setEditingContract(null);
                    setNewSubcontract({
                      company: '',
                      niu: '',
                      projectId: projects[0]?.id || 0,
                      task: '',
                      amount: '',
                      startDate: '',
                      endDate: '',
                      tasks: [],
                      lots: []
                    });
                    setIsSubcontractModalOpen(true);
                  }} className="font-bold shadow-lg shadow-blue-900/10">
                    <Plus className="w-4 h-4 mr-2" /> Nouveau Contrat ST
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsServiceProviderModalOpen(true)}
                    className="font-bold shadow-lg shadow-blue-900/10"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Ajouter un Prestataire
                  </Button>
                ))}
              </div>

              {stTab === 'contracts' ? (
                <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
                  {subcontracts.filter(st => st.type === 'subcontract').length === 0 ? (
                    <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed border-2">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                        <Handshake className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Aucun contrat de sous-traitance</h4>
                      <p className="text-xs text-slate-400 mt-1">Les contrats avec lots et tâches complexes s'affichent ici.</p>
                    </Card>
                  ) : (
                    subcontracts.filter(st => st.type === 'subcontract').map((st, i) => (
                      <Card key={`subcontract-${i}`} className="p-6 border-none shadow-lg shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:shadow-xl transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Handshake className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900">{st.entreprise}</h4>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{st.objet} • {getProjectNameById(st.projectId)}</p>
                          </div>
                        </div>
                        <div className="flex-1 max-w-xs">
                          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-1">
                            <span>Avancement</span>
                            <span>{st.progress}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${st.progress}%` }}></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Montant contrat</p>
                          <p className="text-lg font-black text-slate-900">{st.montant.toLocaleString()} FCFA</p>
                          {getPaidAmount(st) > 0 && (
                            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                              Payé : {getPaidAmount(st).toLocaleString()} FCFA
                            </p>
                          )}
                          {hasPayableTasks(st) && (
                            <p className="text-[10px] font-bold text-amber-600 mt-0.5">
                              À payer : {getPayableAmount(st).toLocaleString()} FCFA
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="font-bold rounded-xl" onClick={() => {
                            setSelectedContract(st);
                            setIsContractDetailsModalOpen(true);
                          }}>{t('common.details')}</Button>

                          {hasPayableTasks(st) && (
                            <Button
                              size="sm"
                              onClick={() => handlePayProvider(st)}
                              disabled={isPayingProvider}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20"
                            >
                              {isPayingProvider ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                              )}
                              Payer ({getPayableAmount(st).toLocaleString()})
                            </Button>
                          )}

                          {getPaymentStatusLabel(st) === 'Payé' && !hasPayableTasks(st) && (
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Payé
                            </span>
                          )}

                          {isDirecteurTechnique && (
                          <Button variant="ghost" size="sm" className="font-bold text-blue-600 hover:bg-blue-50 rounded-xl" onClick={() => {
                            const reconstructedLots: { lotNumber: number; lotName: string; tasks: TaskDraft[] }[] = [];
                            (st.tasks || []).forEach((t: any) => {
                              const lotNum = t.lotNumber || 1;
                              let lot = reconstructedLots.find((l) => l.lotNumber === lotNum);
                              if (!lot) {
                                lot = { lotNumber: lotNum, lotName: t.lotName || `Lot ${lotNum}`, tasks: [] };
                                reconstructedLots.push(lot);
                              }
                              lot.tasks.push({ title: t.title, cost: String(t.cost || 0) });
                            });

                            setEditingContract(st);
                            setNewSubcontract({
                              company: st.entreprise,
                              niu: st.niu || '',
                              projectId: st.projectId,
                              task: st.objet,
                              amount: st.montant.toString(),
                              startDate: st.startDate || '',
                              endDate: st.endDate || '',
                              tasks: st.tasks.map((t: any) => ({ title: t.title, cost: String(t.cost || 0) })),
                              lots: reconstructedLots,
                            });
                            setUseLots(reconstructedLots.length > 1 || st.tasks.some((t: any) => t.lotNumber > 1 || (t.lotName && t.lotName !== 'Lot 1')));
                            setIsSubcontractModalOpen(true);
                          }}>{t('common.edit')}</Button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/50">
                            <th className="px-6 py-4 text-center w-16">#</th>
                            <th className="px-6 py-4">Prestataire / Partenaire</th>
                            <th className="px-6 py-4">Chantier</th>
                            <th className="px-6 py-4">Prestations</th>
                            {subcontracts.some((s) => s.type === 'provider' && shouldShowPaymentStatus(s)) && (
                              <th className="px-6 py-4">État Paiement</th>
                            )}
                            <th className="px-6 py-4 text-right">Montant</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {subcontracts.filter(s => s.type === 'provider').length === 0 ? (
                            <tr>
                              <td
                                colSpan={
                                  subcontracts.some((s) => s.type === 'provider' && shouldShowPaymentStatus(s))
                                    ? 7
                                    : 6
                                }
                                className="px-6 py-16 text-center"
                              >
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                                  <Users className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-bold text-slate-400">Aucun prestataire de service enregistré</p>
                                <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-widest">Utilisez le bouton ajouter pour commencer</p>
                              </td>
                            </tr>
                          ) : (
                            subcontracts.filter(s => s.type === 'provider').map((provider, idx) => (
                              <tr key={provider.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 text-center">
                                  <span className="text-[10px] font-black text-slate-300">{idx + 1}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 font-black text-[10px]">
                                      {provider.company.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{provider.company}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-600">{getProjectNameById(provider.projectId)}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {(provider.tasks || []).map((t: any, i: number) => (
                                      <span
                                        key={i}
                                        className={cn(
                                          'px-2 py-0.5 text-[9px] font-bold rounded-md border',
                                          t.paid
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : t.completed
                                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                                              : 'bg-slate-100 text-slate-600 border-slate-200',
                                        )}
                                      >
                                        {t.title}
                                        {Number(t.cost) > 0 && ` · ${Number(t.cost).toLocaleString()}`}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                {subcontracts.some((s) => s.type === 'provider' && shouldShowPaymentStatus(s)) && (
                                  <td className="px-6 py-4">
                                    {shouldShowPaymentStatus(provider) ? (
                                      <span
                                        className={cn(
                                          'px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border flex items-center gap-1.5 w-fit',
                                          getPaymentStatusLabel(provider) === 'Payé'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100',
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            'w-1.5 h-1.5 rounded-full',
                                            getPaymentStatusLabel(provider) === 'Payé' ? 'bg-emerald-500' : 'bg-amber-500',
                                          )}
                                        />
                                        {getPaymentStatusLabel(provider)}
                                      </span>
                                    ) : null}
                                  </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                  <span className="text-sm font-black text-slate-900">
                                    {Number(provider.montant).toLocaleString()}{' '}
                                    <span className="text-[10px] text-slate-400 ml-1">FCFA</span>
                                  </span>
                                  {hasPayableTasks(provider) && (
                                    <p className="text-[10px] font-bold text-amber-600 mt-0.5">
                                      À payer : {getPayableAmount(provider).toLocaleString()}
                                    </p>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-3 text-[10px] font-black"
                                      onClick={() => {
                                        setSelectedContract(provider);
                                        setIsContractDetailsModalOpen(true);
                                      }}
                                    >
                                      {t('common.details')}
                                    </Button>
                                    {hasPayableTasks(provider) ? (
                                      <Button
                                        size="sm"
                                        onClick={() => handlePayProvider(provider)}
                                        disabled={isPayingProvider}
                                        className="h-8 px-4 text-[10px] font-black uppercase tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 rounded-xl"
                                      >
                                        {isPayingProvider ? (
                                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Payer
                                          </>
                                        )}
                                      </Button>
                                    ) : getPaymentStatusLabel(provider) === 'Payé' ? (
                                      <span className="h-8 px-3 flex items-center text-[10px] font-black text-emerald-600 uppercase">
                                        Payé
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={t('resources.modals.confirm_delivery')}
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600">Êtes-vous sûr de vouloir changer le statut de la commande {purchaseToUpdate?.item} en "Livré" ? Cette action est irréversible.</p>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => {
              updatePurchase(purchaseToUpdate.id, { status: 'Livré' });
              setIsConfirmModalOpen(false);
              notify(`Commande ${purchaseToUpdate.item} marquée comme livrée.`, 'success', '/resources');
            }}>{t('common.confirm')}</Button>
          </div>
        </div>
      </Modal>

      {/* Purchase Modal (Workflow) */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title={t('resources.purchases.new_request')}
        size="xl"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                purchaseStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handlePurchaseSubmit} className="space-y-8">
            {purchaseStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                      {t('resources.purchases.wizard.step_logistics')}
                    </h4>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">{t('resources.purchases.wizard.chantier_label')}</label>
                      <select
                        value={purchaseHeader.projectId}
                        onChange={(e) => {
                          const projectId = Number(e.target.value);
                          setPurchaseHeader({
                            ...purchaseHeader,
                            projectId,
                            chantier: getProjectNameById(projectId),
                          });
                        }}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label={`${t('resources.purchases.supplier')} (optionnel)`}
                      type="text"
                      placeholder="Ex: FOKOU, QUIFEUROU..."
                      value={purchaseHeader.provider}
                      onChange={(e) => setPurchaseHeader({ ...purchaseHeader, provider: e.target.value })}
                    />
                    <Input
                      label={t('resources.purchases.wizard.delivery_date')}
                      type="date"
                      min={today}
                      value={purchaseHeader.deliveryDate}
                      onChange={(e) => setPurchaseHeader({ ...purchaseHeader, deliveryDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                      {t('resources.purchases.wizard.priority_label')}
                    </h4>
                    <div className="flex gap-2">
                      {['Basse', 'Normale', 'Urgente'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPurchaseHeader({ ...purchaseHeader, priority: p })}
                          className={cn(
                            'flex-1 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                            purchaseHeader.priority === p
                              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50',
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">{t('resources.purchases.wizard.notes')}</label>
                      <textarea
                        className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder={t('resources.purchases.wizard.notes')}
                        value={purchaseHeader.notes}
                        onChange={(e) => setPurchaseHeader({ ...purchaseHeader, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <PurchaseOrderLines lines={purchaseLines} onChange={setPurchaseLines} />
              </div>
            )}

            {purchaseStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">Demande d'Achat Créée</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">La DA a été transmise au service Achats pour consultation des fournisseurs (FOKOU, QUIFEUROU, etc.).</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => {
                if (purchaseStep > 1) {
                  setPurchaseStep(1);
                } else {
                  setIsPurchaseModalOpen(false);
                  setPurchaseStep(1);
                }
              }} className="font-bold">
                {purchaseStep === 1 ? 'Annuler' : 'Fermer'}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20" disabled={isSubmittingPurchase}>
                {isSubmittingPurchase ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  purchaseStep === 2 ? 'Fermer' : 'Valider la Demande'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>



      {/* Employee Modal — Création avec affectation pour le chef de chantier */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setNewEmployee({ name: '', role: 'Technicien', matricule: '', contract: 'CDI', niu: '', phone: '', projectId: 0, weeklySalary: '' });
        }}
        title={role === 'Chef_chantier' ? t('resources.modals.add_worker_site') : t('resources.modals.add_collaborator_registry')}
        size="lg"
      >
        <div className="space-y-6">
          {role !== 'Chef_chantier' && (
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-xs font-bold text-blue-700">
                ℹ️ L'affectation à un chantier se fait dans un second temps, depuis le registre du personnel.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Nom complet *</label>
              <input
                type="text"
                placeholder="Ex: Jean Mbarga"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee(p => ({ ...p, name: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Poste / Qualification *</label>
              <select
                value={newEmployee.role}
                onChange={(e) => setNewEmployee(p => ({ ...p, role: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {['Technicien', 'Chef de Chantier', 'Maçon', 'Électricien', 'Plombier', 'Conducteur d\'engins', 'Topographe', 'Ingénieur', 'Administratif', 'Gardien', 'Manœuvre'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Téléphone</label>
              <input
                type="text"
                placeholder="6XX XX XX XX"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee(p => ({ ...p, phone: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {role === 'Chef_chantier' ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest">{t('resources.hr.weekly_salary')} *</label>
                  <input
                    type="number"
                    min={1}
                    step={100}
                    placeholder={t('resources.hr.weekly_salary_placeholder')}
                    value={newEmployee.weeklySalary}
                    onChange={(e) => setNewEmployee(p => ({ ...p, weeklySalary: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-bold text-emerald-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Chantier d'affectation *</label>
                  <select
                    value={newEmployee.projectId}
                    onChange={(e) => setNewEmployee(p => ({ ...p, projectId: Number(e.target.value) }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-bold text-slate-700"
                  >
                    <option value={0}>— Sélectionner un chantier —</option>
                    {chefProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Matricule</label>
                  <input
                    type="text"
                    placeholder="Auto-généré si vide"
                    value={newEmployee.matricule}
                    onChange={(e) => setNewEmployee(p => ({ ...p, matricule: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Type de Contrat</label>
                  <select
                    value={newEmployee.contract}
                    onChange={(e) => setNewEmployee(p => ({ ...p, contract: e.target.value as any }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {['CDI', 'CDD', 'Intérim', 'Prestataire', 'Stage'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest">NIU / CNPS</label>
                  <input
                    type="text"
                    placeholder="Numéro d'identification"
                    value={newEmployee.niu}
                    onChange={(e) => setNewEmployee(p => ({ ...p, niu: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => { setIsEmployeeModalOpen(false); setIsServiceProviderModalOpen(true); }}
              className="text-xs font-bold text-blue-600 hover:bg-blue-50"
            >
              Ajouter un prestataire
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsEmployeeModalOpen(false)}>{t('common.cancel')}</Button>
              <Button
                className="font-bold shadow-lg shadow-blue-900/20"
                disabled={
                  !newEmployee.name.trim()
                  || isAddingEmployee
                  || (role === 'Chef_chantier' && (
                    !newEmployee.projectId
                    || !Number.isFinite(parseFloat(newEmployee.weeklySalary))
                    || parseFloat(newEmployee.weeklySalary) <= 0
                  ))
                }
                onClick={handleAddEmployee}
              >
                {isAddingEmployee ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Ajouter au registre
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isServiceProviderModalOpen}
        onClose={() => setIsServiceProviderModalOpen(false)}
        title={t('resources.modals.new_service_provider')}
        size="lg"
      >
        <form onSubmit={handleServiceProviderSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Identité & Chantier</label>
                <div className="p-5 bg-white border-2 border-slate-100 rounded-3xl space-y-4 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Nom du prestataire</label>
                    <Input
                      placeholder="Ex: SARL Construction Plus"
                      value={newServiceProvider.name}
                      onChange={(e) => setNewServiceProvider({ ...newServiceProvider, name: e.target.value })}
                      className="h-12 px-4 rounded-xl border-slate-200 font-bold text-sm focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Chantier d'affectation</label>
                    <select
                      value={newServiceProvider.projectId}
                      onChange={(e) => setNewServiceProvider({ ...newServiceProvider, projectId: Number(e.target.value) })}
                      className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                    >
                      <option value={0}>Sélectionner un chantier</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-blue-50/50 border-2 border-blue-100/50 rounded-3xl">
                <p className="text-[9px] font-bold text-blue-600 uppercase">Total estimé du contrat</p>
                <p className="text-2xl font-black text-blue-700 mt-1">
                  {sumTaskCosts(newServiceProvider.tasks).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-[10px] text-blue-500/70 font-medium mt-1">
                  Somme des montants attribués à chaque tâche.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tâches à effectuer</label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!newProviderTaskTitle.trim()) return;
                    setNewServiceProvider({
                      ...newServiceProvider,
                      tasks: [
                        ...newServiceProvider.tasks,
                        { title: newProviderTaskTitle.trim(), cost: newProviderTaskCost || '0' },
                      ],
                    });
                    setNewProviderTaskTitle('');
                    setNewProviderTaskCost('');
                  }}
                  className="h-8 px-3 text-[10px] uppercase font-black text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter une tâche
                </Button>
              </div>

              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Intitulé de la tâche"
                  value={newProviderTaskTitle}
                  onChange={(e) => setNewProviderTaskTitle(e.target.value)}
                  className="flex-1 h-11 text-xs font-bold"
                />
                <Input
                  type="number"
                  placeholder="Montant FCFA"
                  value={newProviderTaskCost}
                  onChange={(e) => setNewProviderTaskCost(e.target.value)}
                  className="w-36 h-11 text-xs font-bold"
                  min="0"
                />
              </div>

              <div className="p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl space-y-3 min-h-[280px] max-h-[400px] overflow-y-auto">
                {newServiceProvider.tasks.map((task, idx) => (
                  <div key={idx} className="flex gap-2 group animate-in slide-in-from-right-2 duration-200">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder={`Tâche #${idx + 1}`}
                        value={task.title}
                        onChange={(e) => {
                          const updated = [...newServiceProvider.tasks];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setNewServiceProvider({ ...newServiceProvider, tasks: updated });
                        }}
                        className="h-11 rounded-xl border-slate-200 bg-white font-bold text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Montant FCFA"
                        value={task.cost}
                        onChange={(e) => {
                          const updated = [...newServiceProvider.tasks];
                          updated[idx] = { ...updated[idx], cost: e.target.value };
                          setNewServiceProvider({ ...newServiceProvider, tasks: updated });
                        }}
                        className="h-11 rounded-xl border-slate-200 bg-white font-bold text-xs"
                        min="0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = newServiceProvider.tasks.filter((_, i) => i !== idx);
                        setNewServiceProvider({ ...newServiceProvider, tasks: updated });
                      }}
                      className="h-11 w-11 p-0 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {newServiceProvider.tasks.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                      <ClipboardCheck className="w-6 h-6 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-black uppercase tracking-tight">Liste des tâches vide</p>
                      <p className="text-[10px] text-slate-400 font-medium">Décrivez les travaux que le prestataire doit réaliser.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsServiceProviderModalOpen(false)}
              className="px-6 h-12 font-bold text-slate-500 border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingServiceProvider}
              className="px-10 h-12 font-black uppercase tracking-[0.15em] text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl shadow-blue-200 transition-all active:scale-95"
            >
              {isSubmittingServiceProvider ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Traitement...
                </>
              ) : (
                "Enregistrer le prestataire"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Equipment Request Modal */}
      <Modal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        title={t('resources.modals.request_equipment')}
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">{t('resources.equipment.request_form.need_label')}</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-y"
                value={equipmentRequestForm.needDescription}
                onChange={(e) => setEquipmentRequestForm({ ...equipmentRequestForm, needDescription: e.target.value })}
                placeholder={t('resources.equipment.request_form.need_placeholder')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">{t('resources.equipment.request_form.date_label')}</label>
                <Input
                  type="date"
                  min={today}
                  value={equipmentRequestForm.desiredDate}
                  onChange={(e) => setEquipmentRequestForm({ ...equipmentRequestForm, desiredDate: e.target.value })}
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">{t('resources.equipment.request_form.project_label')}</label>
                <select
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={equipmentRequestForm.projectId}
                  onChange={(e) => setEquipmentRequestForm({ ...equipmentRequestForm, projectId: Number(e.target.value) })}
                >
                  {(role === 'Chef_chantier' ? chefProjects : projects).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-3 text-amber-800 mb-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">{t('resources.equipment.request_status.pending')}</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                {t('resources.equipment.request_form.pending_info')}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEquipmentModalOpen(false)}>{t('common.cancel')}</Button>
            <Button
              disabled={
                equipmentRequestForm.needDescription.trim().length < 10 ||
                !equipmentRequestForm.desiredDate ||
                !equipmentRequestForm.projectId ||
                isSubmittingEquipment
              }
              onClick={handleSubmitEquipmentRequest}
              className="px-8 font-bold shadow-lg shadow-blue-900/20"
            >
              {isSubmittingEquipment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('common.processing', { defaultValue: 'Traitement...' })}
                </>
              ) : (
                t('resources.equipment.request_form.submit')
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Simplified Assign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={t('resources.modals.assign_equipment')}
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[var(--color-primary)]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{assigningEquipment?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{assigningEquipment?.ref}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Choisir le Chantier de Destination</label>
            <div className="grid grid-cols-1 gap-2">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={async () => {
                    await updateEquipment(assigningEquipment.id, { location: p.name, status: 'En mission' });
                    setIsAssignModalOpen(false);
                    notify(`L'engin ${assigningEquipment.name} a été affecté à ${p.name}.`, 'success', '/resources');
                  }}
                  className="w-full p-4 text-left rounded-xl border border-slate-100 hover:border-[var(--color-primary)] hover:bg-blue-50 transition-all flex items-center justify-between group"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-[var(--color-primary)]">{p.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--color-primary)]" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>
      {/* Stock Movement Modal */}
      <Modal
        isOpen={isStockMovementModalOpen}
        onClose={() => setIsStockMovementModalOpen(false)}
        title={t('resources.modals.stock_movement')}
        size="lg"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                stockMovementStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form className="space-y-6" onSubmit={handleStockMovementSubmit}>
            {stockMovementStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Type de Mouvement</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStockMovementType('entry');
                        if (stockView === 'warehouse') {
                          setNewStockMovement(prev => ({ ...prev, toProjectId: 0, chantier: 'Magasin Central' }));
                        }
                      }}
                      className={cn(
                        "p-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all",
                        stockMovementType === 'entry' ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <Plus className="w-5 h-5" /> {stockView === 'warehouse' ? 'Entrée Magasin' : 'Entrée'}
                    </button>

                    {stockView === 'projects' ? (
                      <button
                        type="button"
                        onClick={() => setStockMovementType('exit')}
                        className={cn(
                          "p-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all",
                          stockMovementType === 'exit' ? "bg-red-50 border-red-500 text-red-700 shadow-md" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <Minus className="w-5 h-5" /> Sortie
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setStockMovementType('transfer');
                          setNewStockMovement(prev => ({
                            ...prev,
                            fromProjectId: 0,
                            fromChantier: 'Magasin Central',
                            toProjectId: projects[0]?.id || 0, // Reset destination to a real project
                            toChantier: projects[0]?.name || ''
                          }));
                        }}
                        className={cn(
                          "p-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all",
                          stockMovementType === 'transfer' && newStockMovement.fromProjectId === 0 && newStockMovement.toProjectId !== 0 ? "bg-blue-50 border-blue-500 text-blue-700 shadow-md" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <ArrowUpRight className="w-5 h-5" /> Transfert vers Chantier
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setStockMovementType('transfer');
                        if (stockView === 'warehouse') {
                          setNewStockMovement(prev => ({
                            ...prev,
                            toProjectId: 0,
                            toChantier: 'Magasin Central',
                            chantier: 'Magasin Central',
                            fromProjectId: projects[0]?.id || 0, // Reset source to a real project
                            fromChantier: projects[0]?.name || ''
                          }));
                        }
                      }}
                      className={cn(
                        "p-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all",
                        stockMovementType === 'transfer' && (stockView === 'projects' || (stockView === 'warehouse' && newStockMovement.toProjectId === 0)) ? "bg-blue-50 border-blue-500 text-blue-700 shadow-md" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <Truck className="w-5 h-5" /> {stockView === 'warehouse' ? 'Retour Chantier' : 'Transfert'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Article</label>
                      <select
                        value={newStockMovement.materialId ?? ''}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          const mat = movementMaterials.find((m) => m.id === id);
                          setNewStockMovement({
                            ...newStockMovement,
                            materialId: id || undefined,
                            item: mat?.name || '',
                            unit: mat?.unit || '',
                          });
                        }}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        required
                      >
                        <option value="">{t('resources.stock.select_material')}</option>
                        {movementMaterials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Quantité"
                        type="number" min="0"
                        placeholder="0"
                        required
                        value={newStockMovement.qty}
                        onChange={(e) => setNewStockMovement({ ...newStockMovement, qty: e.target.value })}
                      />
                      <Input label="Unité" value={newStockMovement.unit} disabled />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(stockMovementType === 'exit' || stockMovementType === 'transfer') && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Source</label>
                        <select
                          value={newStockMovement.fromProjectId}
                          disabled={stockView === 'warehouse' && stockMovementType === 'transfer' && newStockMovement.fromProjectId === 0}
                          onChange={(e) => { const fromProjectId = Number(e.target.value); setNewStockMovement({ ...newStockMovement, fromProjectId, fromChantier: getProjectNameById(fromProjectId) }); }}
                          className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-60"
                          required
                        >
                          {/* En mode transfert vers chantier, la source est forcée à 0, donc on affiche que ça. En mode retour chantier, la source doit être un chantier. */}
                          {stockView === 'warehouse' && stockMovementType === 'transfer' && newStockMovement.fromProjectId === 0 ? (
                            <option value={0}>Magasin Central</option>
                          ) : (
                            projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                          )}
                        </select>
                      </div>
                    )}
                    {(stockMovementType === 'entry' || stockMovementType === 'transfer') && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Destination</label>
                        <select
                          value={newStockMovement.toProjectId}
                          disabled={stockView === 'warehouse' && (stockMovementType === 'entry' || newStockMovement.toProjectId === 0)}
                          onChange={(e) => { const toProjectId = Number(e.target.value); setNewStockMovement({ ...newStockMovement, toProjectId, chantier: getProjectNameById(toProjectId), toChantier: getProjectNameById(toProjectId) }); }}
                          className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-60"
                          required
                        >
                          {/* En mode retour chantier, la destination est forcée à 0. En mode transfert vers chantier, la destination doit être un chantier. */}
                          {stockView === 'warehouse' && (stockMovementType === 'entry' || (stockMovementType === 'transfer' && newStockMovement.toProjectId === 0)) ? (
                            <option value={0}>Magasin Central</option>
                          ) : (
                            projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Commentaires / Observations</label>
                  <textarea className="w-full h-20 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Précisez les détails du mouvement..."></textarea>
                </div>
              </div>
            )}

            {stockMovementStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                {stockMovementError ? (
                  // Affichage de l'alerte d'erreur de stock
                  <div className="space-y-6">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-50">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h4 className="text-2xl font-black text-red-900 tracking-tight">
                      Stock Insuffisant
                    </h4>
                    <div className="max-w-md mx-auto">
                      <p className="text-red-700 font-medium mb-4">
                        {stockMovementError}
                      </p>
                      <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-sm text-red-600">
                          Veuillez vérifier le stock disponible et ajuster la quantité demandée.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Affichage normal de succès
                  <div className="space-y-6">
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
                      stockMovementType === 'entry' ? "bg-emerald-50 text-emerald-500" :
                        stockMovementType === 'exit' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                    )}>
                      {stockMovementType === 'entry' ? <Plus className="w-10 h-10" /> :
                        stockMovementType === 'exit' ? <ArrowRightLeft className="w-10 h-10" /> : <Truck className="w-10 h-10" />}
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                      {stockMovementType === 'entry' ? 'Entrée de Stock Validée' :
                        stockMovementType === 'exit' ? 'Sortie de Stock Validée' : 'Transfert Inter-Chantier Validé'}
                    </h4>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto">
                      Le mouvement a été enregistré avec succès. Le stock théorique a été mis à jour et le document justificatif a été archivé.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => stockMovementStep > 1 ? setStockMovementStep(1) : setIsStockMovementModalOpen(false)} className="font-bold">
                {stockMovementStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20" disabled={isSubmittingStockMovement}>
                {isSubmittingStockMovement ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  stockMovementStep === 2 ? 'Fermer' : 'Confirmer le Mouvement'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Assign Equipment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={t('resources.modals.assign_equipment_named', { name: assigningEquipment?.name })}
      >
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsAssignModalOpen(false); }}>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-6">
            <p className="text-xs font-bold text-blue-700">L'engin est actuellement à: <span className="font-black">{assigningEquipment?.location}</span></p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Chantier de Destination</label>
            <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Conducteur Assigné</label>
            <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              <option>Paul Abena</option>
              <option>Jean Ebollo</option>
              <option>Ahmed Bello</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date Début" type="date" min={today} required />
            <Input label="Date Fin Prévue" type="date" min={today} required />
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsAssignModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="font-bold shadow-lg shadow-blue-900/20" onClick={() => notify(`Engin ${assigningEquipment?.name} affecté avec succès.`, 'success', '/resources')}>Confirmer l'Affectation</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Employee Modal */}
      <Modal
        isOpen={isAssignEmployeeModalOpen}
        onClose={() => setIsAssignEmployeeModalOpen(false)}
        title={t('resources.modals.assign_resource', { name: selectedResource?.name })}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center text-[var(--color-primary)] font-black text-sm">
              {selectedResource?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{selectedResource?.name}</p>
              <p className="text-xs font-bold text-slate-500">{selectedResource?.role} · {selectedResource?.contract}</p>
              {selectedResource?.projectId ? (
                <p className="text-xs text-amber-600 font-bold mt-1">
                  ⚠️ Actuellement sur : {getProjectNameById(selectedResource.projectId)}
                </p>
              ) : (
                <p className="text-xs text-emerald-600 font-bold mt-1">✓ Disponible</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Chantier de Destination *</label>
            <select
              id="assign-project-select"
              defaultValue=""
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option key="assign-project-placeholder" value="" disabled>— Sélectionner un chantier —</option>
              {projects.map((p, i) => (
                <option key={p.id != null && p.id !== '' ? p.id : `project-${i}`} value={p.id}>{p.name} ({p.status})</option>
              ))}
            </select>
          </div>

          <div className={`pt-6 border-t border-slate-100 flex ${selectedResource?.projectId ? 'justify-between' : 'justify-end'} gap-3`}>
            {selectedResource?.projectId ? (
              <Button
                variant="outline"
                className="text-amber-600 border-amber-200 hover:bg-amber-50 font-bold"
                onClick={() => {
                  setIsAssignEmployeeModalOpen(false);
                  handleRemoveAssignment(selectedResource);
                }}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Désaffecter
              </Button>
            ) : null}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsAssignEmployeeModalOpen(false)}>{t('common.cancel')}</Button>
              <Button
                className="font-bold shadow-lg shadow-blue-900/20"
                disabled={isAssigningEmployee}
                onClick={() => {
                  const sel = document.getElementById('assign-project-select') as HTMLSelectElement;
                  if (!sel.value) { notify(t('resources.errors.select_project'), 'error'); return; }
                  handleAssign(selectedResource, Number(sel.value));
                }}
              >
                {isAssigningEmployee ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                Confirmer l'Affectation
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Désaffectation — retirer du chantier sans supprimer */}
      <Modal
        isOpen={isConfirmUnassignModalOpen}
        onClose={() => { setIsConfirmUnassignModalOpen(false); setEmployeeToUnassign(null); }}
        title={t('resources.modals.remove_from_site')}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-amber-900">Désaffectation</p>
              <p className="text-xs text-amber-700">
                <strong>{employeeToUnassign?.name}</strong> sera retiré de <strong>{getProjectNameById(employeeToUnassign?.projectId)}</strong> et passera en statut Disponible.
                Il restera dans le registre du personnel.
              </p>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setIsConfirmUnassignModalOpen(false); setEmployeeToUnassign(null); }}>{t('common.cancel')}</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold" onClick={confirmUnassign} disabled={isUnassigningEmployee}>
              {isUnassigningEmployee ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              Retirer du Chantier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Suppression définitive — action séparée et explicite */}
      <Modal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        title={t('resources.modals.delete_from_registry')}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-900">Suppression Définitive</p>
              <p className="text-xs text-red-700">
                Êtes-vous sûr de vouloir supprimer <strong>{employeeToDelete?.name}</strong> du registre ?
                Cette action est irréversible et supprime tout l'historique associé.
              </p>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsConfirmDeleteModalOpen(false)}>{t('common.cancel')}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/20" onClick={confirmDelete} disabled={isDeletingEmployee}>
              {isDeletingEmployee ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              Supprimer Définitivement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logbook Modal */}
      <Modal
        isOpen={isLogbookModalOpen}
        onClose={() => setIsLogbookModalOpen(false)}
        title={t('resources.modals.equipment_logbook')}
        size="lg"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Heures Moteur</p>
              <p className="text-xl font-black text-slate-900">1,245 h</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conso. Moyenne</p>
              <p className="text-xl font-black text-slate-900">12.5 L/h</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponibilité</p>
              <p className="text-xl font-black text-emerald-600">98%</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Historique des Événements</h4>
            <div className="space-y-3">
              {[
                { date: '12/04/2024', type: 'Plein Gazole', detail: '250 Litres - Station Chantier PK 45', author: 'Jean Chauffeur' },
                { date: '10/04/2024', type: 'Entretien', detail: 'Vidange moteur + Changement filtres', author: 'Garage Central' },
                { date: '08/04/2024', type: 'Affectation', detail: 'Transfert Section Edéa -> Section Boumnyebel', author: 'Logistique' },
              ].map((event, i) => (
                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{event.type}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.detail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">{event.date}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{event.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsLogbookModalOpen(false)} className="font-bold">{t('common.close')}</Button>
          </div>
        </div>
      </Modal>

      {/* Subcontract Modal */}
      <Modal
        isOpen={isSubcontractModalOpen}
        onClose={() => {
          setIsSubcontractModalOpen(false);
          setEditingContract(null);
          setNewSubcontract({
            company: '',
            niu: '',
            projectId: projects[0]?.id || 0,
            task: '',
            amount: '',
            startDate: '',
            endDate: '',
            tasks: [],
            lots: []
          });
          setUseLots(false);
          setNewLotName('');
          setNewLotTask({});
        }}
        title={editingContract ? t('resources.modals.edit_subcontract') : t('resources.modals.new_subcontract')}
        size="lg"
      >
        <form className="space-y-6" onSubmit={handleSubcontractSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informations ST</h4>
              <Input
                label="Nom de l'Entreprise ST"
                placeholder="Ex: ETS BTP SERVICES"
                required
                value={newSubcontract.company}
                onChange={(e) => setNewSubcontract({ ...newSubcontract, company: e.target.value })}
              />
              <Input
                label="NIU de l'Entreprise"
                placeholder="Numéro Identifiant Unique"
                required
                value={newSubcontract.niu}
                onChange={(e) => setNewSubcontract({ ...newSubcontract, niu: e.target.value })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Chantier d'Affectation</label>
                <select
                  value={newSubcontract.projectId}
                  onChange={(e) => setNewSubcontract({ ...newSubcontract, projectId: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Détails du Marché ST</h4>
              <Input
                label="Objet Principal"
                placeholder="Ex: Terrassement, Électricité..."
                required
                value={newSubcontract.task}
                onChange={(e) => setNewSubcontract({ ...newSubcontract, task: e.target.value })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Montant du contrat (FCFA)</label>
                <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900">
                  {sumTaskCosts(buildTasksPayload()).toLocaleString('fr-FR')}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Calculé automatiquement à partir des montants des tâches.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Date Début"
                  type="date" min={today}
                  required
                  value={newSubcontract.startDate}
                  onChange={(e) => setNewSubcontract({ ...newSubcontract, startDate: e.target.value })}
                />
                <Input
                  label="Date Fin"
                  type="date" min={today}
                  required
                  value={newSubcontract.endDate}
                  onChange={(e) => setNewSubcontract({ ...newSubcontract, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tâches / Lots</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Mode lots</span>
                    <button type="button" onClick={() => setUseLots(!useLots)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${useLots ? 'bg-[var(--color-primary)]' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${useLots ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {!useLots ? (
                  /* Mode liste simple */
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubcontractTask}
                        onChange={(e) => setNewSubcontractTask(e.target.value)}
                        placeholder="Intitulé de la tâche..."
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50"
                      />
                      <input
                        type="number"
                        value={newSubcontractTaskCost}
                        onChange={(e) => setNewSubcontractTaskCost(e.target.value)}
                        placeholder="Montant"
                        min="0"
                        className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSubcontractTask.trim()) return;
                          setNewSubcontract({
                            ...newSubcontract,
                            tasks: [
                              ...newSubcontract.tasks,
                              { title: newSubcontractTask.trim(), cost: newSubcontractTaskCost || '0' },
                            ],
                          });
                          setNewSubcontractTask('');
                          setNewSubcontractTaskCost('');
                        }}
                        className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {newSubcontract.tasks.map((task, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700 flex-1">{task.title}</span>
                          <span className="text-xs font-black text-slate-900">{Number(task.cost || 0).toLocaleString()} FCFA</span>
                          <button type="button" onClick={() => setNewSubcontract({ ...newSubcontract, tasks: newSubcontract.tasks.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                      {newSubcontract.tasks.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Aucune tâche ajoutée</p>}
                    </div>
                  </div>
                ) : (
                  /* Mode lots */
                  <div className="space-y-3">
                    {(newSubcontract.lots || []).map((lot, lotIdx) => (
                      <div key={lotIdx} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                          <span className="text-sm font-black text-slate-700"> {lot.lotName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{lot.tasks.length} tâche(s)</span>
                            <button type="button" onClick={() => removeLot(lotIdx)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {lot.tasks.map((task, taskIdx) => (
                            <div key={taskIdx} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100">
                              <span className="text-xs text-slate-700 flex-1">{task.title}</span>
                              <span className="text-[10px] font-black text-slate-900">{Number(task.cost || 0).toLocaleString()} FCFA</span>
                              <button type="button" onClick={() => removeTaskFromLot(lotIdx, taskIdx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newLotTask[lotIdx] || ''}
                              placeholder="Tâche..."
                              onChange={(e) => setNewLotTask((prev) => ({ ...prev, [lotIdx]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTaskToLot(lotIdx); } }}
                              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none bg-slate-50"
                            />
                            <input
                              type="number"
                              value={newLotTaskCost[lotIdx] || ''}
                              placeholder="FCFA"
                              min="0"
                              onChange={(e) => setNewLotTaskCost((prev) => ({ ...prev, [lotIdx]: e.target.value }))}
                              className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none bg-slate-50"
                            />
                            <button type="button" onClick={() => addTaskToLot(lotIdx)}
                              className="px-2 py-1.5 bg-slate-700 text-white rounded-lg text-xs hover:bg-slate-800">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Ajouter un lot */}
                    <div className="flex gap-2">
                      <input type="text" value={newLotName} placeholder="Nom du nouveau lot (ex: Lot Fondations)..."
                        onChange={e => setNewLotName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLot(); } }}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                      <button type="button" onClick={addLot}
                        className="flex items-center gap-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold hover:opacity-90">
                        <Plus className="w-4 h-4" /> Lot
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-between">
            {editingContract ? (
              <Button
                type="button"
                onClick={() => {
                  deleteSubcontract(editingContract.id);
                  setIsSubcontractModalOpen(false);
                  setEditingContract(null);
                  notify(`Contrat supprimé avec succès.`, 'info', '/resources');
                }}
                className="font-bold text-red-600 bg-red-50 hover:bg-red-100 border-none"
              >
                Supprimer le contrat
              </Button>
            ) : <div />}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" type="button" onClick={() => {
                setIsSubcontractModalOpen(false);
                setEditingContract(null);
              }}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={isSubmittingSubcontract} className="font-bold shadow-lg shadow-blue-900/20">
                {isSubmittingSubcontract ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {editingContract ? "Modification en cours..." : "Création en cours..."}
                  </span>
                ) : (
                  editingContract ? "Enregistrer les modifications" : "Créer le Contrat ST"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      {/* All Orders Modal */}
      <Modal
        isOpen={isAllOrdersModalOpen}
        onClose={() => setIsAllOrdersModalOpen(false)}
        title={t('resources.modals.all_orders')}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une commande..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={orderFilterStatus}
                onChange={(e) => setOrderFilterStatus(e.target.value)}
                className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="all">Tous les statuts</option>
                <option value="En cours">En cours</option>
                <option value="Validé">Validé</option>
                <option value="Livré">Livré</option>
              </select>
            </div>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {purchases
              .filter(order => {
                const matchesSearch = order.item.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                  (getProjectNameById(order.projectId) || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                  (order.id && order.id.toString().includes(orderSearchQuery));
                const matchesFilter = orderFilterStatus === 'all' || order.status === orderFilterStatus;
                return matchesSearch && matchesFilter;
              })
              .map((order, i) => (
                <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 flex justify-between items-center hover:shadow-md transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-900">CMD-{order.id || i}</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                        order.status === 'En cours' ? "bg-blue-100 text-blue-700" :
                          order.status === 'Livré' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{order.item} ({order.qty} {order.unit})</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {getProjectNameById(order.projectId)} • {order.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{order.priority}</p>
                  </div>
                </div>
              ))}
            {purchases.filter(order => {
              const matchesSearch = order.item.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                (getProjectNameById(order.projectId) || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                (order.id && order.id.toString().includes(orderSearchQuery));
              const matchesFilter = orderFilterStatus === 'all' || order.status === orderFilterStatus;
              return matchesSearch && matchesFilter;
            }).length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-bold">Aucune commande trouvée</p>
                </div>
              )}
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="outline" onClick={() => setIsAllOrdersModalOpen(false)}>{t('common.close')}</Button>
          </div>
        </div>
      </Modal>

      {/* Contract Details Modal */}
      <Modal
        isOpen={isContractDetailsModalOpen}
        onClose={() => setIsContractDetailsModalOpen(false)}
        title={t('resources.modals.subcontract_details')}
      >
        {selectedContract && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedContract.company}</h3>
                <p className="text-sm font-bold text-slate-500">NIU: M098765432109</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Actif
                </span>
                {shouldShowPaymentStatus(selectedContract) && getPaymentStatusLabel(selectedContract) && (
                  <span
                    className={cn(
                      'px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border flex items-center gap-1.5 w-fit',
                      getPaymentStatusLabel(selectedContract) === 'Payé'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100',
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        getPaymentStatusLabel(selectedContract) === 'Payé' ? 'bg-emerald-500' : 'bg-amber-500',
                      )}
                    />
                    {getPaymentStatusLabel(selectedContract)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lot / Tâche</p>
                <p className="text-sm font-black text-slate-900">{selectedContract.objet}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chantier</p>
                <p className="text-sm font-black text-slate-900">{getProjectNameById(selectedContract.projectId)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Montant Total</p>
                <p className="text-sm font-black text-slate-900">{selectedContract.montant.toLocaleString()} FCFA</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Période</p>
                <p className="text-sm font-black text-slate-900">{selectedContract.date}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Suivi des Tâches</h4>
                <span className="text-xs font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-lg">
                  {selectedContract.progress}% complété
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedContract.progress}%` }}
                  className="h-full bg-[var(--color-primary)]"
                />
              </div>
              {(() => {
                const tasks = selectedContract.tasks || [];
                if (tasks.length === 0) return (
                  <p className="text-sm text-slate-400 italic text-center py-4">Aucune tâche définie pour ce contrat</p>
                );
                // Vérifier si le contrat a des lots (lotNumber défini)
                const hasLots = tasks.some((t: any) => t.lotNumber);
                if (hasLots) {
                  // Grouper par lot
                  const lots: Record<string, { lotName: string; tasks: any[] }> = {};
                  tasks.forEach((t: any) => {
                    const key = String(t.lotNumber || 1);
                    if (!lots[key]) lots[key] = { lotName: t.lotName || `Lot ${key}`, tasks: [] };
                    lots[key].tasks.push(t);
                  });
                  return (
                    <div className="space-y-3">
                      {Object.entries(lots).map(([lotNum, lot]) => {
                        const doneCount = lot.tasks.filter((t: any) => t.completed).length;
                        const lotPct = Math.round((doneCount / lot.tasks.length) * 100);
                        return (
                          <div key={lotNum} className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                              <span className="text-sm font-bold text-slate-700"> {lot.lotName}</span>
                              <span className="text-xs font-bold text-[var(--color-primary)]">{doneCount}/{lot.tasks.length} — {lotPct}%</span>
                            </div>
                            <div className="p-2 space-y-1">
                              {lot.tasks.map((task: any, taskIdx: number) => (
                                <div
                                  key={task.id != null && task.id !== '' ? task.id : `sub-task-${lotNum}-${taskIdx}`}
                                  onClick={() => !task.paid && toggleSubcontractTask(selectedContract.id, task.id)}
                                  className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg border transition-all',
                                    task.paid ? 'bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed' :
                                      task.completed ? 'bg-emerald-50 border-emerald-100 cursor-pointer' :
                                        'bg-white border-slate-100 hover:border-[var(--color-primary)] cursor-pointer',
                                  )}
                                >
                                  <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0',
                                    task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white')}>
                                    {task.completed && <ClipboardCheck className="w-2.5 h-2.5" />}
                                  </div>
                                  <span className={cn('text-sm flex-1', task.completed ? 'line-through text-slate-400' : 'text-slate-700')}>{task.title}</span>
                                  <span className="text-xs font-black text-slate-900">{Number(task.cost || 0).toLocaleString()} FCFA</span>
                                  {task.paid && <span className="text-[9px] font-black uppercase text-emerald-600">Payé</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                // Mode liste simple
                return (
                  <div className="space-y-1.5">
                    {tasks.map((task: any, taskIdx: number) => (
                      <div
                        key={task.id != null && task.id !== '' ? task.id : `sub-task-${taskIdx}`}
                        onClick={() => !task.paid && toggleSubcontractTask(selectedContract.id, task.id)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                          task.paid ? 'bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed' :
                            task.completed ? 'bg-emerald-50 border-emerald-100 cursor-pointer' :
                              'bg-white border-slate-100 hover:border-[var(--color-primary)] cursor-pointer',
                        )}
                      >
                        <div className={cn('w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                          task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white')}>
                          {task.completed && <ClipboardCheck className="w-3.5 h-3.5" />}
                        </div>
                        <span className={cn('text-sm font-medium flex-1', task.completed ? 'line-through text-slate-400' : 'text-slate-700')}>{task.title}</span>
                        <span className="text-xs font-black text-slate-900">{Number(task.cost || 0).toLocaleString()} FCFA</span>
                        {task.paid && <span className="text-[9px] font-black uppercase text-emerald-600">Payé</span>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
              <div className="text-xs font-bold text-slate-500">
                {hasPayableTasks(selectedContract) && (
                  <span className="text-amber-600">
                    À payer (tâches terminées) : {formatFcfa(getPayableAmount(selectedContract))}
                  </span>
                )}
                {getPaidAmount(selectedContract) > 0 && (
                  <span className="block text-emerald-600 mt-0.5">
                    Déjà payé : {formatFcfa(getPaidAmount(selectedContract))}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {hasPayableTasks(selectedContract) && (
                  <Button
                    onClick={() => handlePayProvider(selectedContract)}
                    disabled={isPayingProvider}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Payer {formatFcfa(getPayableAmount(selectedContract))}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsContractDetailsModalOpen(false)}>{t('common.close')}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Manage HR Contract Modal */}
      <Modal
        isOpen={isManageContractModalOpen}
        onClose={() => setIsManageContractModalOpen(false)}
        title={t('resources.modals.manage_employee_contract')}
      >
        {selectedResource && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 bg-[var(--color-primary)] text-white rounded-xl flex items-center justify-center font-black text-xl">
                {selectedResource.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedResource.name}</h3>
                <p className="text-sm font-bold text-slate-500">{selectedResource.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type de Contrat</p>
                <p className="text-sm font-black text-slate-900">{selectedResource.contract || 'CDD'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Statut</p>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Actif</span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date de Début</p>
                <p className="text-sm font-black text-slate-900">15/01/2023</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date de Fin</p>
                <p className="text-sm font-black text-slate-900">{selectedResource.contract === 'CDI' ? 'Indéterminée' : '31/12/2024'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coût Mensuel</p>
                <p className="text-sm font-black text-slate-900">350,000 FCFA</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Affectation Actuelle</p>
                <p className="text-sm font-black text-slate-900">{getProjectNameById(selectedResource?.projectId) || selectedResource?.project}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button variant="outline" className="font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => { notify("Fonctionnalité à venir", "info"); setIsManageContractModalOpen(false); }}>Renouveler</Button>
              <Button variant="outline" className="font-bold text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => { notify("Fonctionnalité à venir", "info"); setIsManageContractModalOpen(false); }}>Suspendre</Button>
              <Button variant="outline" className="font-bold text-slate-600 border-slate-200 hover:bg-slate-50" onClick={() => { notify("Fonctionnalité à venir", "info"); setIsManageContractModalOpen(false); }}>{t('common.edit')}</Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setIsManageContractModalOpen(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Full Logbook Modal */}
      <Modal
        isOpen={isFullLogbookModalOpen}
        onClose={() => setIsFullLogbookModalOpen(false)}
        title={t('common.full_log') + " des Mouvements"}
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date du mouvement</label>
              <Input
                type="date"
                min={today}
                value={logbookFilters.date}
                onChange={(e) => setLogbookFilters({ ...logbookFilters, date: e.target.value })}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chantier concerné</label>
                <select
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={logbookFilters.projectId}
                  onChange={(e) => setLogbookFilters({ ...logbookFilters, projectId: e.target.value })}
                >
                  <option value="all">Tous les chantiers</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type de mouvement</label>
                <select
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={logbookFilters.type}
                  onChange={(e) => setLogbookFilters({ ...logbookFilters, type: e.target.value })}
                >
                  <option value="all">Tous les types</option>
                  <option value="entries">Entrées (Réceptions)</option>
                  <option value="exits">Sorties (Consommations)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {getFilteredLogbook().map((log, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    log.type === 'Sortie' ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                  )}>
                    {log.type === 'Sortie' ? <ArrowRightLeft className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{log.item}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {log.date} • {log.user}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black",
                    log.type === 'Sortie' ? "text-red-600" : "text-emerald-600"
                  )}>
                    {log.type === 'Sortie' ? '-' : '+'}{formatQuantityWithUnit(log.qty, log.unit)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{log.project}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFullLogbookModalOpen(false)}>{t('common.close')}</Button>
            <Button
              className="font-bold"
              onClick={() => {
                const dataToExport = stockMovements
                  .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                  .map(m => ({
                    'TYPE': m.type,
                    'ARTICLE': m.item,
                    'QUANTITÉ': m.quantity || m.qty || 0,
                    'UNITÉ': m.unit,
                    'PROJET / CHANTIER': m.chantier || getProjectNameById(m.projectId),
                    'UTILISATEUR': m.user || 'N/A',
                    'DATE': m.date ? new Date(m.date).toLocaleDateString('fr-FR') : 'N/A'
                  }));
                exportToCSV(dataToExport, `mouvements_stock_${new Date().toISOString().split('T')[0]}`);
              }}
            >
              Exporter (CSV)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inventory Modal */}
      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title={t('resources.modals.physical_inventory')}
        size="lg"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm font-medium">
            Saisissez les quantités physiquement constatées en magasin. Les écarts seront automatiquement calculés.
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {inventoryData.map((item, i) => {
              const variance = item.observed - item.theoretical;
              const hasVariance = variance !== 0;

              return (
                <div key={i} className={cn(
                  "p-4 border rounded-xl space-y-3",
                  hasVariance ? "border-amber-200 bg-amber-50" : "border-slate-100"
                )}>
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-900">{item.item}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">Théorique: {item.theoretical} {item.unit}</span>
                      {hasVariance && (
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-full",
                          variance > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {variance > 0 ? '+' : ''}{variance} {item.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Quantité Constatée</label>
                      <input
                        type="number"
                        min="0"
                        value={item.observed}
                        onChange={(e) => {
                          const newData = [...inventoryData];
                          newData[i].observed = Number(e.target.value) || 0;
                          newData[i].variance = newData[i].observed - newData[i].theoretical;
                          setInventoryData(newData);
                        }}
                        className={cn(
                          "w-full h-10 px-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
                          hasVariance ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                        )}
                      />
                    </div>
                    <div>
                      <label className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1 block",
                        hasVariance ? "text-amber-600" : "text-slate-400"
                      )}>
                        Justification {hasVariance ? "(obligatoire)" : "(si écart)"}
                      </label>
                      <input
                        type="text"
                        value={item.justification}
                        onChange={(e) => {
                          const newData = [...inventoryData];
                          newData[i].justification = e.target.value;
                          setInventoryData(newData);
                        }}
                        placeholder={hasVariance ? "Veuillez justifier l'écart..." : "Raison de l'écart..."}
                        className={cn(
                          "w-full h-10 px-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
                          hasVariance ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                        )}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsInventoryModalOpen(false)}>{t('common.cancel')}</Button>
            <Button
              className="font-bold shadow-lg shadow-blue-900/20"
              onClick={() => {
                // Valider qu'il y a des justifications pour tous les écarts
                const itemsWithVariance = inventoryData.filter(item => item.variance !== 0);
                const unjustifiedItems = itemsWithVariance.filter(item => !item.justification || item.justification.trim() === '');

                if (unjustifiedItems.length > 0) {
                  notify(`Veuillez justifier les écarts pour: ${unjustifiedItems.map(item => item.item).join(', ')}`, 'error', '/resources');
                  return;
                }

                // Enregistrer l'inventaire
                const inventoryRecord = {
                  date: new Date().toISOString().split('T')[0],
                  items: inventoryData.map(item => ({
                    item: item.item,
                    theoretical: item.theoretical,
                    observed: item.observed,
                    variance: item.variance,
                    justification: item.justification,
                    unit: item.unit
                  })),
                  user: name || 'Utilisateur'
                };

                // Ajouter un log pour l'inventaire
                addLog({
                  module: 'Ressources',
                  action: `Inventaire physique réalisé - ${inventoryData.length} articles contrôlés`,
                  user: name || 'Utilisateur',
                  type: 'info'
                });

                notify("Inventaire enregistré avec succès", "success", '/resources');
                setIsInventoryModalOpen(false);
              }}
            >
              Valider l'Inventaire
            </Button>
          </div>
        </div>
      </Modal>

      {/* === TAB POINTAGE === */}
      {/* === TAB POINTAGE (Historique) === */}
      {activeTab === 'pointage' && (
        <AttendancePanel
          role={role as any}
          projects={projects}
          employees={employees}
          chefProjectIds={chefProjectIds}
        />
      )}

      {/* === ONGLET POINTAGE === */}
      {/* === MODALE : LISTE DES EMPLOYÉS NON ASSIGNÉS === */}
      <Modal
        isOpen={isUnassignedModalOpen}
        onClose={() => setIsUnassignedModalOpen(false)}
        title={t('resources.modals.assign_personnel')}
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <p className="text-xs text-slate-500 font-medium">
            liste des collaborateurs disponibles dans le système et attachés a vos chantiers.
          </p>

          <div className="max-h-[400px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
            {unassignedEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-sm">
                Aucun employé disponible pour le moment.
              </div>
            ) : (
              unassignedEmployees.map((emp) => (
                <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-[10px]">
                        {emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900">{emp.name}</span>
                      <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase">{emp.role}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="h-8 px-4 text-[10px] font-black uppercase tracking-widest"
                    onClick={() => {
                      setSelectedResource({ ...emp, type: 'hr' });
                      setIsUnassignedModalOpen(false);
                      setIsAssignEmployeeModalOpen(true);
                    }}
                  >
                    <MapPin className="w-3 h-3 mr-2" /> Affecter
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => setIsUnassignedModalOpen(false)} className="font-bold">Fermer</Button>
          </div>
        </div>
      </Modal>

      {/* === MODALE : DÉTAILS DE L'EMPLOYÉ === */}
      <Modal
        isOpen={isEmployeeDetailModalOpen}
        onClose={() => setIsEmployeeDetailModalOpen(false)}
        title={t('resources.modals.employee_profile')}
        maxWidth="lg"
      >
        {selectedEmployeeForDetail && (
          <div className="space-y-8">
            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              {selectedEmployeeForDetail.avatar ? (
                <img src={selectedEmployeeForDetail.avatar} alt={selectedEmployeeForDetail.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-lg">
                  <Users className="w-10 h-10" />
                </div>
              )}
              <div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">{selectedEmployeeForDetail.name}</h4>
                <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mt-1">{selectedEmployeeForDetail.role}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">{selectedEmployeeForDetail.matricule}</span>
                  <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase">{selectedEmployeeForDetail.contract}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                <p className="text-sm font-bold text-slate-700">{selectedEmployeeForDetail.email || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Téléphone</p>
                <p className="text-sm font-bold text-slate-700">{selectedEmployeeForDetail.phone || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Affectation Actuelle</p>
                <p className="text-sm font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded">{getEmployeeProjectLabel(selectedEmployeeForDetail.projectId)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Service / Département</p>
                <p className="text-sm font-bold text-slate-700">{selectedEmployeeForDetail.service || 'Non spécifié'}</p>
              </div>
            </div>

            {selectedEmployeeForDetail.assignmentHistory?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Historique des chantiers</p>
                <div className="space-y-2">
                  {selectedEmployeeForDetail.assignmentHistory.map((h: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button onClick={() => setIsEmployeeDetailModalOpen(false)} className="font-bold">Fermer la fiche</Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

const ResourceKpiCard = ({ title, value, icon: Icon, color }: any) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  return (
    <Card className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={cn("p-4 rounded-2xl transition-colors", colors[color as keyof typeof colors])}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mt-1">{value}</h3>
        </div>
      </div>
    </Card>
  );
};
