import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../components/ui';
import { useNavigate } from 'react-router-dom';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  path?: string;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType, path?: string) => void;
  persistentNotifications: any[];
  setPersistentNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [persistentNotifications, setPersistentNotifications] = useState<any[]>([]);
  const navigate = useNavigate();

  const playSound = useCallback((type: NotificationType) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.1); // E6
      } else if (type === 'error') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.2); // A3
      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // E5
      }

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  }, []);

  const notify = useCallback((message: string, type: NotificationType = 'success', path?: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, path }]);
    
    // Add to persistent notifications for the modal
    setPersistentNotifications(prev => [{
      id,
      title: type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Information',
      desc: message,
      time: 'À l\'instant',
      type: type === 'success' ? 'success' : type === 'error' ? 'warning' : 'info',
      icon: type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info,
      read: false,
      path
    }, ...prev]);

    // playSound(type); // Son désactivé
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, [playSound]);

  return (
    <NotificationContext.Provider value={{ notify, persistentNotifications, setPersistentNotifications }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              onClick={() => {
                if (n.path) {
                  navigate(n.path);
                  setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                }
              }}
              className={cn(
                "pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] max-w-md",
                n.path && "cursor-pointer hover:scale-[1.02] transition-transform",
                n.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                n.type === 'error' ? "bg-red-50 border-red-100 text-red-800" :
                n.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-800" :
                "bg-blue-50 border-blue-100 text-blue-800"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                n.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                n.type === 'error' ? "bg-red-100 text-red-600" :
                n.type === 'warning' ? "bg-amber-100 text-amber-600" :
                "bg-blue-100 text-blue-600"
              )}>
                {n.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {n.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {n.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {n.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-black tracking-tight">{n.message}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                }}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 opacity-50" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
