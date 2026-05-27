import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  equipmentRequestService,
  type EquipmentRequest,
  type EquipmentRequestStatus,
} from '../services/equipmentRequest.service';
import { useNotification } from '../context/NotificationContext';

const POLL_PENDING_MS = 4000;
const POLL_IDLE_MS = 12000;

type Options = {
  enabled: boolean;
  mine?: boolean;
};

export function useEquipmentRequestsLive({ enabled, mine }: Options) {
  const { t } = useTranslation();
  const { toast, pushPersistent } = useNotification();
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const statusByIdRef = useRef<Record<number, EquipmentRequestStatus>>({});
  const requestsRef = useRef<EquipmentRequest[]>([]);
  requestsRef.current = requests;

  const notifyLogisticsChange = useCallback(
    (message: string, type: 'success' | 'warning' | 'info') => {
      toast(message, type, '/resources');
      pushPersistent(message, type, '/resources');
    },
    [toast, pushPersistent],
  );

  const detectStatusChanges = useCallback(
    (list: EquipmentRequest[]) => {
      list.forEach((req) => {
        const prev = statusByIdRef.current[req.id];
        if (!prev || prev === req.status) return;

        const ref = req.externalId || req.ref;

        if (prev === 'En attente' && req.status === 'Approuvée') {
          notifyLogisticsChange(t('resources.equipment.live_approved', { ref }), 'success');
        } else if (prev === 'En attente' && req.status === 'Rejetée') {
          notifyLogisticsChange(t('resources.equipment.live_rejected', { ref }), 'warning');
        } else if (prev === 'En attente' && req.status === 'Annulée') {
          notifyLogisticsChange(t('resources.equipment.live_cancelled', { ref }), 'info');
        } else if (prev === 'Erreur envoi' && req.status === 'En attente') {
          notifyLogisticsChange(t('resources.equipment.live_resent', { ref }), 'info');
        } else if (prev === 'En attente' && req.status === 'Erreur envoi') {
          notifyLogisticsChange(t('resources.equipment.live_send_error', { ref }), 'warning');
        }
      });
      const next: Record<number, EquipmentRequestStatus> = {};
      list.forEach((r) => {
        next[r.id] = r.status;
      });
      statusByIdRef.current = next;
    },
    [notifyLogisticsChange, t],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean; notifyChanges?: boolean }) => {
      const silent = opts?.silent ?? false;
      const notifyChanges = opts?.notifyChanges ?? silent;
      if (!silent) setIsLoading(true);
      try {
        const list = await equipmentRequestService.getAll(mine ? { mine: true } : {});
        if (notifyChanges) detectStatusChanges(list);
        else {
          const next: Record<number, EquipmentRequestStatus> = {};
          list.forEach((r) => {
            next[r.id] = r.status;
          });
          statusByIdRef.current = next;
        }
        setRequests(list);
      } catch {
        if (!silent) setRequests([]);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [mine, detectStatusChanges],
  );

  useEffect(() => {
    if (!enabled) return undefined;
    load({ silent: false, notifyChanges: false });
    return undefined;
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) {
      setIsLive(false);
      return undefined;
    }

    setIsLive(true);
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (cancelled) return;
      try {
        const list = await equipmentRequestService.getAll(mine ? { mine: true } : {});
        if (!cancelled) {
          detectStatusChanges(list);
          setRequests(list);
        }
      } catch {
        /* ignore */
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const hasPending = requestsRef.current.some((r) => r.status === 'En attente');
      const ms = hasPending ? POLL_PENDING_MS : POLL_IDLE_MS;
      timeoutId = setTimeout(async () => {
        await poll();
        scheduleNext();
      }, ms);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      setIsLive(false);
      clearTimeout(timeoutId);
    };
  }, [enabled, mine, detectStatusChanges]);

  const upsertLocal = useCallback((item: EquipmentRequest) => {
    statusByIdRef.current[item.id] = item.status;
    setRequests((prev) => {
      const idx = prev.findIndex((r) => r.id === item.id);
      if (idx === -1) return [item, ...prev];
      const next = [...prev];
      next[idx] = item;
      return next;
    });
  }, []);

  return {
    requests,
    isLoading,
    isLive,
    load,
    upsertLocal,
  };
}
