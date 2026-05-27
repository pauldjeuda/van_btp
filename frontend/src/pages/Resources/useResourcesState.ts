/**
 * useResourcesState.ts
 * Centralise tous les états locaux de la page Ressources.
 * Regroupés par onglet pour plus de lisibilité.
 */
import { useState } from 'react';
import {
  ResourceTab, SubcontractTab, StockMovementType,
  StockView, AttendanceRecord, NewServiceProvider, getDefaultTab,
} from './resources.types';

export const useResourcesState = (role: string | null, firstProjectId: number = 0) => {

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState<ResourceTab>(getDefaultTab(role));
  const [stTab,     setStTab]       = useState<SubcontractTab>('contracts');

  // ── Achats ──────────────────────────────────────────────────────────────────
  const [isPurchaseModalOpen,  setIsPurchaseModalOpen]  = useState(false);
  const [purchaseStep,         setPurchaseStep]         = useState(1);
  const [isAllOrdersModalOpen, setIsAllOrdersModalOpen] = useState(false);
  const [isConfirmModalOpen,   setIsConfirmModalOpen]   = useState(false);
  const [purchaseToUpdate,     setPurchaseToUpdate]     = useState<any>(null);
  const [orderSearchQuery,     setOrderSearchQuery]     = useState('');
  const [orderFilterStatus,    setOrderFilterStatus]    = useState('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);

  // ── Stock ───────────────────────────────────────────────────────────────────
  const [stockSearchQuery,          setStockSearchQuery]          = useState('');
  const [selectedWarehouse,         setSelectedWarehouse]         = useState('Magasin Central');
  const [isStockMovementModalOpen,  setIsStockMovementModalOpen]  = useState(false);
  const [stockMovementStep,         setStockMovementStep]         = useState(1);
  const [stockMovementType,         setStockMovementType]         = useState<StockMovementType>('entry');
  const [isLogbookModalOpen,        setIsLogbookModalOpen]        = useState(false);
  const [isFullLogbookModalOpen,    setIsFullLogbookModalOpen]    = useState(false);
  const [isInventoryModalOpen,      setIsInventoryModalOpen]      = useState(false);
  const [selectedStockProject,      setSelectedStockProject]      = useState<number | null>(null);
  const [stockView,                 setStockView]                 = useState<StockView>(role === 'Gestionnaire de stocks' ? 'warehouse' : 'projects');

  // ── Équipements ─────────────────────────────────────────────────────────────
  const [isEquipmentModalOpen,       setIsEquipmentModalOpen]       = useState(false);
  const [isAssignModalOpen,          setIsAssignModalOpen]          = useState(false);
  const [assigningEquipment,         setAssigningEquipment]         = useState<any>(null);
  const [selectedEquipmentProject,   setSelectedEquipmentProject]   = useState<number | null>(null);
  const [selectedResource,           setSelectedResource]           = useState<any>(null);

  // ── RH ──────────────────────────────────────────────────────────────────────
  const [isEmployeeModalOpen,        setIsEmployeeModalOpen]        = useState(false);
  const [isAssignEmployeeModalOpen,  setIsAssignEmployeeModalOpen]  = useState(false);
  const [isConfirmDeleteModalOpen,   setIsConfirmDeleteModalOpen]   = useState(false);
  const [employeeToDelete,           setEmployeeToDelete]           = useState<any>(null);
  const [hrSearchQuery,              setHrSearchQuery]              = useState('');
  const [selectedProjectForAdd,      setSelectedProjectForAdd]      = useState<number>(firstProjectId);

  // ── Sous-traitance ──────────────────────────────────────────────────────────
  const [isSubcontractModalOpen,     setIsSubcontractModalOpen]     = useState(false);
  const [isContractDetailsModalOpen, setIsContractDetailsModalOpen] = useState(false);
  const [isManageContractModalOpen,  setIsManageContractModalOpen]  = useState(false);
  const [selectedContract,           setSelectedContract]           = useState<any>(null);
  const [isServiceProviderModalOpen, setIsServiceProviderModalOpen] = useState(false);
  const [newServiceProvider,         setNewServiceProvider]         = useState<NewServiceProvider>({
    name: '', projectId: firstProjectId, tasks: [], totalCost: '',
  });

  // ── Pointage ────────────────────────────────────────────────────────────────
  const [attendanceDate,         setAttendanceDate]         = useState(new Date().toISOString().split('T')[0]);
  const [attendanceProjectId,    setAttendanceProjectId]    = useState<number>(0);
  const [attendanceRecords,      setAttendanceRecords]      = useState<AttendanceRecord[]>([]);
  const [attendanceHistory,      setAttendanceHistory]      = useState<any[]>([]);
  const [isLoadingAttendance,    setIsLoadingAttendance]    = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  return {
    // Navigation
    activeTab, setActiveTab, stTab, setStTab,
    // Achats
    isPurchaseModalOpen, setIsPurchaseModalOpen,
    purchaseStep, setPurchaseStep,
    isAllOrdersModalOpen, setIsAllOrdersModalOpen,
    isConfirmModalOpen, setIsConfirmModalOpen,
    purchaseToUpdate, setPurchaseToUpdate,
    orderSearchQuery, setOrderSearchQuery,
    orderFilterStatus, setOrderFilterStatus,
    selectedProjectFilter, setSelectedProjectFilter,
    // Stock
    stockSearchQuery, setStockSearchQuery,
    selectedWarehouse, setSelectedWarehouse,
    isStockMovementModalOpen, setIsStockMovementModalOpen,
    stockMovementStep, setStockMovementStep,
    stockMovementType, setStockMovementType,
    isLogbookModalOpen, setIsLogbookModalOpen,
    isFullLogbookModalOpen, setIsFullLogbookModalOpen,
    isInventoryModalOpen, setIsInventoryModalOpen,
    selectedStockProject, setSelectedStockProject,
    stockView, setStockView,
    // Équipements
    isEquipmentModalOpen, setIsEquipmentModalOpen,
    isAssignModalOpen, setIsAssignModalOpen,
    assigningEquipment, setAssigningEquipment,
    selectedEquipmentProject, setSelectedEquipmentProject,
    selectedResource, setSelectedResource,
    // RH
    isEmployeeModalOpen, setIsEmployeeModalOpen,
    isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen,
    isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen,
    employeeToDelete, setEmployeeToDelete,
    hrSearchQuery, setHrSearchQuery,
    selectedProjectForAdd, setSelectedProjectForAdd,
    // Sous-traitance
    isSubcontractModalOpen, setIsSubcontractModalOpen,
    isContractDetailsModalOpen, setIsContractDetailsModalOpen,
    isManageContractModalOpen, setIsManageContractModalOpen,
    selectedContract, setSelectedContract,
    isServiceProviderModalOpen, setIsServiceProviderModalOpen,
    newServiceProvider, setNewServiceProvider,
    // Pointage
    attendanceDate, setAttendanceDate,
    attendanceProjectId, setAttendanceProjectId,
    attendanceRecords, setAttendanceRecords,
    attendanceHistory, setAttendanceHistory,
    isLoadingAttendance, setIsLoadingAttendance,
    isSubmittingAttendance, setIsSubmittingAttendance,
  };
};
