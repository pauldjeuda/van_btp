import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { scrollToHashElement } from '../lib/scrollToHash';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: NotificationType;
  path?: string;
}

export interface PersistentNotification {
  id: number;
  title: string;
  desc: string;
  time: string;
  type: 'success' | 'warning' | 'info';
  icon: typeof CheckCircle2;
  read: boolean;
  path?: string;
}

interface NotificationContextType {
  /** Toast éphémère (coin bas-droit) */
  toast: (message: string, type?: NotificationType, path?: string) => void;
  /** Entrée dans le tiroir notifications (cloche) */
  pushPersistent: (message: string, type?: NotificationType, path?: string) => void;
  /** Toast + notification persistante */
  notify: (message: string, type?: NotificationType, path?: string) => void;
  persistentNotifications: PersistentNotification[];
  setPersistentNotifications: React.Dispatch<React.SetStateAction<PersistentNotification[]>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const TOAST_DURATION_MS = 5000;

function persistentTitle(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'Succès';
    case 'error':
      return 'Erreur';
    case 'warning':
      return 'Avertissement';
    default:
      return 'Information';
  }
}

function persistentVisualType(type: NotificationType): PersistentNotification['type'] {
  if (type === 'success') return 'success';
  if (type === 'error' || type === 'warning') return 'warning';
  return 'info';
}

function persistentIcon(type: NotificationType) {
  if (type === 'success') return CheckCircle2;
  if (type === 'error' || type === 'warning') return AlertCircle;
  return Info;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [persistentNotifications, setPersistentNotifications] = useState<PersistentNotification[]>([]);
  const [portalReady, setPortalReady] = useState(false);
  const navigate = useNavigate();
  const toastSeqRef = useRef(0);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setPortalReady(true);
    return () => {
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toast = useCallback((message: string, type: NotificationType = 'success', path?: string) => {
    const id = `toast-${Date.now()}-${++toastSeqRef.current}`;
    setToasts((prev) => [...prev, { id, message, type, path }]);

    const timer = setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    toastTimersRef.current.set(id, timer);
  }, [dismissToast]);

  const pushPersistent = useCallback(
    (message: string, type: NotificationType = 'success', path?: string) => {
      const id = Date.now() + ++toastSeqRef.current;
      setPersistentNotifications((prev) => [
        {
          id,
          title: persistentTitle(type),
          desc: message,
          time: "À l'instant",
          type: persistentVisualType(type),
          icon: persistentIcon(type),
          read: false,
          path,
        },
        ...prev,
      ]);
    },
    [],
  );

  const notify = useCallback(
    (message: string, type: NotificationType = 'success', path?: string) => {
      toast(message, type, path);
      pushPersistent(message, type, path);
    },
    [toast, pushPersistent],
  );

  const toastHost =
    portalReady &&
    createPortal(
      <div
        className="fixed bottom-6 right-6 z-[10050] flex flex-col-reverse gap-3 pointer-events-none max-w-[min(100vw-1.5rem,28rem)] px-3 sm:px-0"
        aria-live="polite"
        aria-label="Notifications toast"
      >
        <AnimatePresence initial={false}>
          {toasts.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={() => {
                if (n.path) {
                  const [pathname, hashPart] = n.path.split('#');
                  if (hashPart) {
                    navigate({ pathname: pathname || '/dashboard', hash: hashPart });
                    scrollToHashElement(`#${hashPart}`);
                  } else {
                    navigate(n.path);
                  }
                  dismissToast(n.id);
                }
              }}
              className={cn(
                'pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border min-w-[280px]',
                n.path && 'cursor-pointer hover:scale-[1.02] transition-transform',
                n.type === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-900',
                n.type === 'error' && 'bg-red-50 border-red-200 text-red-900',
                n.type === 'warning' && 'bg-amber-50 border-amber-200 text-amber-900',
                n.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-900',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  n.type === 'success' && 'bg-emerald-100 text-emerald-600',
                  n.type === 'error' && 'bg-red-100 text-red-600',
                  n.type === 'warning' && 'bg-amber-100 text-amber-600',
                  n.type === 'info' && 'bg-blue-100 text-blue-600',
                )}
              >
                {n.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {n.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {n.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {n.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              <p className="flex-1 text-sm font-bold leading-snug">{n.message}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(n.id);
                }}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors shrink-0"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 opacity-50" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>,
      document.body,
    );

  return (
    <NotificationContext.Provider
      value={{ toast, pushPersistent, notify, persistentNotifications, setPersistentNotifications }}
    >
      {children}
      {toastHost}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
