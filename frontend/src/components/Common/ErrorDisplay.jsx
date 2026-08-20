import React from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  X, 
  ExternalLink,
  Bug,
  Wifi,
  Shield,
  Clock
} from 'lucide-react';

// Error type icons
const ERROR_ICONS = {
  NETWORK_ERROR: Wifi,
  AUTH_ERROR: Shield,
  PERMISSION_ERROR: Shield,
  VALIDATION_ERROR: AlertCircle,
  SERVER_ERROR: XCircle,
  TIMEOUT_ERROR: Clock,
  UNKNOWN_ERROR: AlertTriangle
};

// Error type colors
const ERROR_COLORS = {
  NETWORK_ERROR: 'text-orange-600 bg-orange-100',
  AUTH_ERROR: 'text-red-600 bg-red-100',
  PERMISSION_ERROR: 'text-red-600 bg-red-100',
  VALIDATION_ERROR: 'text-yellow-600 bg-yellow-100',
  SERVER_ERROR: 'text-red-600 bg-red-100',
  TIMEOUT_ERROR: 'text-blue-600 bg-blue-100',
  UNKNOWN_ERROR: 'text-gray-600 bg-gray-100'
};

// Inline error display for forms and components
export const InlineError = ({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '',
  showIcon = true,
  showRetry = true,
  showDismiss = true
}) => {
  if (!error) return null;

  const errorType = error.type || 'UNKNOWN_ERROR';
  const Icon = ERROR_ICONS[errorType] || AlertCircle;
  const colorClass = ERROR_COLORS[errorType] || ERROR_COLORS.UNKNOWN_ERROR;

  return (
    <div className={`flex items-start p-3 rounded-lg border ${colorClass.replace('text-', 'border-').replace('-600', '-200')} ${className}`}>
      {showIcon && (
        <Icon className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${colorClass.split(' ')[0]}`} />
      )}
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${colorClass.split(' ')[0]}`}>
          {error.message}
        </p>
        
        {error.details && (
          <p className={`text-xs mt-1 ${colorClass.split(' ')[0]} opacity-75`}>
            {error.details}
          </p>
        )}
        
        {(showRetry || showDismiss) && (
          <div className="flex items-center space-x-3 mt-2">
            {showRetry && onRetry && error.retryable && (
              <button
                onClick={onRetry}
                className={`text-xs font-medium ${colorClass.split(' ')[0]} hover:opacity-75 underline flex items-center`}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </button>
            )}
            
            {showDismiss && onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-xs font-medium ${colorClass.split(' ')[0]} hover:opacity-75 underline`}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
      
      {showDismiss && onDismiss && (
        <button
          onClick={onDismiss}
          className={`ml-3 flex-shrink-0 ${colorClass.split(' ')[0]} hover:opacity-75`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Banner error display for page-level errors
export const ErrorBanner = ({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '',
  variant = 'default' // 'default', 'minimal', 'detailed'
}) => {
  if (!error) return null;

  const errorType = error.type || 'UNKNOWN_ERROR';
  const Icon = ERROR_ICONS[errorType] || AlertCircle;
  const colorClass = ERROR_COLORS[errorType] || ERROR_COLORS.UNKNOWN_ERROR;

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${colorClass.replace('text-', 'border-').replace('-600', '-200')} ${className}`}>
        <div className="flex items-center">
          <Icon className={`w-4 h-4 mr-2 ${colorClass.split(' ')[0]}`} />
          <span className={`text-sm font-medium ${colorClass.split(' ')[0]}`}>
            {error.message}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {onRetry && error.retryable && (
            <button
              onClick={onRetry}
              className={`text-sm font-medium ${colorClass.split(' ')[0]} hover:opacity-75 underline`}
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`${colorClass.split(' ')[0]} hover:opacity-75`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${colorClass.replace('text-', 'border-').replace('-600', '-200')} ${className}`}>
      <div className={`p-4 ${colorClass.split(' ')[1]}`}>
        <div className="flex items-start">
          <Icon className={`w-6 h-6 mt-0.5 mr-3 flex-shrink-0 ${colorClass.split(' ')[0]}`} />
          
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold ${colorClass.split(' ')[0]} mb-1`}>
              {error.title || 'Error Occurred'}
            </h3>
            
            <p className={`text-sm ${colorClass.split(' ')[0]} mb-3`}>
              {error.message}
            </p>
            
            {variant === 'detailed' && error.details && (
              <div className={`text-xs ${colorClass.split(' ')[0]} opacity-75 mb-3`}>
                <details>
                  <summary className="cursor-pointer hover:opacity-100">
                    Show details
                  </summary>
                  <div className="mt-2 p-2 bg-white/50 rounded border">
                    {error.details}
                  </div>
                </details>
              </div>
            )}
            
            <div className="flex items-center space-x-4">
              {onRetry && error.retryable && (
                <button
                  onClick={onRetry}
                  className={`flex items-center text-sm font-medium ${colorClass.split(' ')[0]} hover:opacity-75 underline`}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Try Again
                </button>
              )}
              
              {error.helpUrl && (
                <a
                  href={error.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center text-sm font-medium ${colorClass.split(' ')[0]} hover:opacity-75 underline`}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Get Help
                </a>
              )}
              
              {import.meta.env.DEV && error.stack && (
                <button
                  onClick={() => console.log('Error Stack:', error.stack)}
                  className={`flex items-center text-sm font-medium ${colorClass.split(' ')[0]} hover:opacity-75 underline`}
                >
                  <Bug className="w-4 h-4 mr-1" />
                  Debug
                </button>
              )}
            </div>
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`ml-3 flex-shrink-0 ${colorClass.split(' ')[0]} hover:opacity-75`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Empty state with error
export const ErrorEmptyState = ({ 
  error, 
  onRetry, 
  title = 'Unable to load data',
  description = 'An error occurred while loading the content.',
  className = ''
}) => {
  const errorType = error?.type || 'UNKNOWN_ERROR';
  const Icon = ERROR_ICONS[errorType] || AlertCircle;

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        {error?.message || description}
      </p>
      
      {onRetry && error?.retryable && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  );
};

// Loading state with error fallback
export const LoadingWithError = ({ 
  loading, 
  error, 
  onRetry, 
  children,
  loadingComponent,
  errorComponent,
  className = ''
}) => {
  if (loading) {
    return loadingComponent || (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return errorComponent || (
      <ErrorEmptyState 
        error={error} 
        onRetry={onRetry} 
        className={className}
      />
    );
  }

  return children;
};

// Hook for managing error state
export const useErrorState = (initialError = null) => {
  const [error, setError] = React.useState(initialError);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const setErrorWithTimeout = React.useCallback((newError, timeout = 5000) => {
    setError(newError);
    if (timeout > 0) {
      setTimeout(clearError, timeout);
    }
  }, [clearError]);

  return {
    error,
    setError,
    clearError,
    setErrorWithTimeout,
    hasError: !!error
  };
};

export default {
  InlineError,
  ErrorBanner,
  ErrorEmptyState,
  LoadingWithError,
  useErrorState
};