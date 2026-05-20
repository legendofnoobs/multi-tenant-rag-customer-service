'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type AlertType = 'success' | 'error' | 'info';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (message: string, type?: AlertType) => void;
  hideAlert: () => void;
  showConfirm: (options: ConfirmOptions) => void;
  hideConfirm: () => void;
  alert: {
    message: string;
    type: AlertType;
    isVisible: boolean;
  };
  confirm: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
  };
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alert, setAlert] = useState<{
    message: string;
    type: AlertType;
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = useCallback((message: string, type: AlertType = 'info') => {
    setAlert({ message, type, isVisible: true });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideAlert();
    }, 5000);
  }, []);

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirm({
      isOpen: true,
      title: options.title || 'Are you sure?',
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      onConfirm: () => {
        options.onConfirm();
        hideConfirm();
      },
      onCancel: () => {
        if (options.onCancel) options.onCancel();
        hideConfirm();
      },
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirm((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, showConfirm, hideConfirm, alert, confirm }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
