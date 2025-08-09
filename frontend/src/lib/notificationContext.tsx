"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import NotificationModal from '@/components/NotificationModal';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  confirmText?: string;
  showConfirmButton?: boolean;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setCurrentNotification({ ...notification, id });
  };

  const hideNotification = () => {
    setCurrentNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      
      {/* Global Notification Modal */}
      <NotificationModal
        isOpen={!!currentNotification}
        onClose={hideNotification}
        title={currentNotification?.title || ""}
        message={currentNotification?.message || ""}
        type={currentNotification?.type || "info"}
        confirmText={currentNotification?.confirmText}
        showConfirmButton={currentNotification?.showConfirmButton}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 