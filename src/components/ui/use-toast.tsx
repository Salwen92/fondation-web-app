import { useState, useEffect } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastState {
  toasts: Toast[];
}

const toastState: ToastState = {
  toasts: []
};

let listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: { type: 'ADD_TOAST'; toast: Toast } | { type: 'REMOVE_TOAST'; id: string }) {
  switch (action.type) {
    case 'ADD_TOAST':
      toastState.toasts = [...toastState.toasts, action.toast];
      break;
    case 'REMOVE_TOAST':
      toastState.toasts = toastState.toasts.filter(t => t.id !== action.id);
      break;
  }
  
  listeners.forEach(listener => listener(toastState));
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast: ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: Toast = { id, title, description, variant };
      
      dispatch({ type: 'ADD_TOAST', toast });
      
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', id });
      }, 5000);
      
      return id;
    },
    dismiss: (id: string) => {
      dispatch({ type: 'REMOVE_TOAST', id });
    }
  };
}