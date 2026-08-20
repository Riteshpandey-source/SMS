import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

// Toast context
const ToastContext = createContext();

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

// Toast icons
const TOAST_ICONS = {
  [TOAST_TYPES.SUCCESS]: CheckCircle,
  [TOAST_TYPES.ERROR]: XCircle,
  [TOAST_TYPES.WARNING]: AlertTriangle,
  [TOAST_TYPES.INFO]: Info,
  [TOAST_TYPES.LOADING]: Loader2
};

// Toast colors
const TOAST_COLORS = {
  [TOAST_TYPES.SUCCESS]: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-400',
    text: 'text-green-800',
    button: 'text-green-500 hover:text-green-600'
  },
  [TOAST_TYPES.ERROR]: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-400',
    text: 'text-red-800',
    button: 'text-red-500 hover:text-red-600'
  },
  [TOAST_TYPES.WARNING]: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-400',
    text: 'text-yellow-800',
    button: 'text-yellow-500 hover:text-yellow-600'
  },
  [TOAST_TYPES.INFO]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-400',
    text: 'text-blue-800',
    button: 'text-blue-500 hover:text-blue-600'
  },
  [TOAST_TYPES.LOADING]: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-400',
    text: 'text-gray-800',
    button: 'text-gray-500 hover:text-gray-600'
  }
};

// Individual toast component
const Toast = ({ 
  id, 
  type = TOAST_TYPES.INFO, 
  title, 
  message, 
  duration = 5000,
  persistent = false,
  actions = [],
  onDismiss,
  progress = null
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  
  const Icon = TOAST_ICONS[type];
  const colors = TOAST_COLORS[type];

  // Auto dismiss
  React.useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, persistent]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.(id);
    }, 300);
  }, [id, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        max-w-sm w-full ${colors.bg} ${colors.border} border rounded-lg shadow-lg pointer-events-auto
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon 
              className={`w-5 h-5 ${colors.icon} ${type === TOAST_TYPES.LOADING ? 'animate-spin' : ''}`} 
            />
          </div>
          
          <div className="ml-3 w-0 flex-1">
            {title && (
              <p className={`text-sm font-medium ${colors.text}`}>
                {title}
              </p>
            )}
            {message && (
              <p className={`text-sm ${colors.text} ${title ? 'mt-1' : ''}`}>
                {message}
              </p>
            )}
            
            {/* Progress bar for loading toasts */}
            {progress !== null && type === TOAST_TYPES.LOADING && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-gray-400 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            {actions.length > 0 && (
              <div className="mt-3 flex space-x-3">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`text-sm font-medium ${colors.button} hover:underline`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Dismiss button */}
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleDismiss}
              className={`inline-flex ${colors.button} hover:bg-white/20 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast container
const ToastContainer = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-0 right-0 z-50 p-6 space-y-4 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

// Toast provider
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast = { id, ...toast };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const updateToast = useCallback((id, updates) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.SUCCESS,
      message,
      ...options
    });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.ERROR,
      message,
      duration: 8000, // Longer duration for errors
      ...options
    });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.WARNING,
      message,
      ...options
    });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.INFO,
      message,
      ...options
    });
  }, [addToast]);

  const loading = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.LOADING,
      message,
      persistent: true, // Loading toasts don't auto-dismiss
      ...options
    });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    loading
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Higher-order component for toast functionality
export const withToast = (Component) => {
  return function WrappedComponent(props) {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
};

// Utility functions for common toast patterns
export const toastUtils = {
  // API operation feedback
  apiOperation: async (operation, toast, messages = {}) => {
    const loadingId = toast.loading(messages.loading || 'Processing...');
    
    try {
      const result = await operation();
      toast.removeToast(loadingId);
      toast.success(messages.success || 'Operation completed successfully');
      return result;
    } catch (error) {
      toast.removeToast(loadingId);
      toast.error(messages.error || 'Operation failed');
      throw error;
    }
  },

  // File upload feedback
  fileUpload: (toast, onProgress) => {
    const loadingId = toast.loading('Uploading file...', { progress: 0 });
    
    return {
      updateProgress: (progress) => {
        toast.updateToast(loadingId, { 
          message: `Uploading file... ${Math.round(progress)}%`,
          progress 
        });
      },
      success: (message = 'File uploaded successfully') => {
        toast.removeToast(loadingId);
        toast.success(message);
      },
      error: (message = 'File upload failed') => {
        toast.removeToast(loadingId);
        toast.error(message);
      }
    };
  },

  // Bulk operation feedback
  bulkOperation: (toast, total, operation) => {
    let completed = 0;
    const loadingId = toast.loading(`Processing 0 of ${total} items...`);
    
    return {
      updateProgress: () => {
        completed++;
        const progress = (completed / total) * 100;
        toast.updateToast(loadingId, {
          message: `Processing ${completed} of ${total} items...`,
          progress
        });
      },
      complete: (successCount, errorCount = 0) => {
        toast.removeToast(loadingId);
        if (errorCount === 0) {
          toast.success(`Successfully processed ${successCount} items`);
        } else {
          toast.warning(`Processed ${successCount} items with ${errorCount} errors`);
        }
      },
      error: (message = 'Bulk operation failed') => {
        toast.removeToast(loadingId);
        toast.error(message);
      }
    };
  }
};

export default {
  ToastProvider,
  useToast,
  withToast,
  toastUtils,
  TOAST_TYPES
};