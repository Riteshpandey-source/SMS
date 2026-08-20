import React from 'react';
import { Loader2, RefreshCw, Upload, Download, Save, Trash2, Eye, Edit, Plus } from 'lucide-react';

// Basic spinner component
export const Spinner = ({ 
  size = 'md', 
  color = 'indigo', 
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    indigo: 'text-indigo-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`} 
    />
  );
};

// Loading button with different states
export const LoadingButton = ({ 
  loading = false,
  disabled = false,
  children,
  loadingText,
  icon: Icon,
  loadingIcon: LoadingIcon = RefreshCw,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500'
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <LoadingIcon className={`${iconSizes[size]} mr-2 animate-spin`} />
          {loadingText || 'Loading...'}
        </>
      ) : (
        <>
          {Icon && <Icon className={`${iconSizes[size]} mr-2`} />}
          {children}
        </>
      )}
    </button>
  );
};

// Skeleton loading components
export const SkeletonLine = ({ 
  width = 'full', 
  height = '4', 
  className = '' 
}) => {
  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4'
  };

  return (
    <div 
      className={`bg-gray-200 rounded animate-pulse h-${height} ${widthClasses[width]} ${className}`} 
    />
  );
};

export const SkeletonCard = ({ 
  lines = 3, 
  showAvatar = false, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 animate-pulse ${className}`}>
      {showAvatar && (
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full mr-3" />
          <div className="flex-1">
            <SkeletonLine width="1/2" height="4" className="mb-2" />
            <SkeletonLine width="1/3" height="3" />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLine 
            key={index}
            width={index === lines - 1 ? '3/4' : 'full'}
            height="4"
          />
        ))}
      </div>
    </div>
  );
};

export const SkeletonTable = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <SkeletonLine key={index} width="3/4" height="4" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <SkeletonLine 
                  key={colIndex} 
                  width={colIndex === 0 ? 'full' : Math.random() > 0.5 ? '3/4' : '1/2'} 
                  height="4" 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Loading overlay
export const LoadingOverlay = ({ 
  loading = false, 
  text = 'Loading...', 
  children,
  className = '',
  blur = true
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div className={`absolute inset-0 bg-white/80 flex items-center justify-center z-10 ${blur ? 'backdrop-blur-sm' : ''}`}>
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-2 text-sm text-gray-600">{text}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Progress bar
export const ProgressBar = ({ 
  progress = 0, 
  max = 100, 
  showPercentage = true,
  color = 'indigo',
  size = 'md',
  className = '' 
}) => {
  const percentage = Math.min(Math.max((progress / max) * 100, 0), 100);
  
  const colorClasses = {
    indigo: 'bg-indigo-600',
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    purple: 'bg-purple-600'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={className}>
      {showPercentage && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div 
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Action feedback states
export const ActionFeedback = ({ 
  type = 'loading', 
  message, 
  progress,
  onCancel,
  className = '' 
}) => {
  const icons = {
    loading: RefreshCw,
    uploading: Upload,
    downloading: Download,
    saving: Save,
    deleting: Trash2
  };

  const colors = {
    loading: 'text-blue-600 bg-blue-50 border-blue-200',
    uploading: 'text-green-600 bg-green-50 border-green-200',
    downloading: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    saving: 'text-purple-600 bg-purple-50 border-purple-200',
    deleting: 'text-red-600 bg-red-50 border-red-200'
  };

  const Icon = icons[type] || RefreshCw;

  return (
    <div className={`flex items-center p-3 rounded-lg border ${colors[type]} ${className}`}>
      <Icon className="w-5 h-5 mr-3 animate-spin" />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        {progress !== undefined && (
          <ProgressBar 
            progress={progress} 
            size="sm" 
            showPercentage={false}
            className="mt-2"
          />
        )}
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="ml-3 text-sm font-medium hover:underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

// Loading states for different components
export const LoadingStates = {
  // Card loading
  Card: ({ className = '' }) => (
    <SkeletonCard className={className} />
  ),

  // Table loading
  Table: ({ rows = 5, columns = 4, className = '' }) => (
    <SkeletonTable rows={rows} columns={columns} className={className} />
  ),

  // List loading
  List: ({ items = 5, className = '' }) => (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center p-3 bg-white rounded-lg border border-gray-200 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-full mr-3" />
          <div className="flex-1">
            <SkeletonLine width="3/4" height="4" className="mb-2" />
            <SkeletonLine width="1/2" height="3" />
          </div>
        </div>
      ))}
    </div>
  ),

  // Dashboard loading
  Dashboard: ({ className = '' }) => (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <SkeletonLine width="1/3" height="6" className="mb-2" />
        <SkeletonLine width="1/2" height="4" />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} lines={2} />
        ))}
      </div>
      
      {/* Content */}
      <SkeletonTable rows={8} columns={5} />
    </div>
  ),

  // Form loading
  Form: ({ fields = 5, className = '' }) => (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <SkeletonLine width="1/4" height="4" className="mb-2" />
          <div className="w-full h-10 bg-gray-200 rounded-lg" />
        </div>
      ))}
    </div>
  )
};

// Hook for managing loading states
export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = React.useState(initialState);
  const [progress, setProgress] = React.useState(0);

  const startLoading = React.useCallback(() => {
    setLoading(true);
    setProgress(0);
  }, []);

  const stopLoading = React.useCallback(() => {
    setLoading(false);
    setProgress(0);
  }, []);

  const updateProgress = React.useCallback((newProgress) => {
    setProgress(Math.min(Math.max(newProgress, 0), 100));
  }, []);

  return {
    loading,
    progress,
    startLoading,
    stopLoading,
    updateProgress,
    setLoading
  };
};

export default {
  Spinner,
  LoadingButton,
  SkeletonLine,
  SkeletonCard,
  SkeletonTable,
  LoadingOverlay,
  ProgressBar,
  ActionFeedback,
  LoadingStates,
  useLoadingState
};