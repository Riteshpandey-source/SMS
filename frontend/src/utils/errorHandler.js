import toast from 'react-hot-toast';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'PERMISSION_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

// Determine error type from response
export const getErrorType = (error) => {
  if (!error.response) {
    return ERROR_TYPES.NETWORK;
  }

  const status = error.response.status;
  
  if (status === 401) return ERROR_TYPES.AUTHENTICATION;
  if (status === 403) return ERROR_TYPES.AUTHORIZATION;
  if (status >= 400 && status < 500) return ERROR_TYPES.VALIDATION;
  if (status >= 500) return ERROR_TYPES.SERVER;
  if (error.code === 'ECONNABORTED') return ERROR_TYPES.TIMEOUT;
  
  return ERROR_TYPES.UNKNOWN;
};

// Get error severity
export const getErrorSeverity = (errorType, status) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.TIMEOUT:
      return ERROR_SEVERITY.HIGH;
    case ERROR_TYPES.AUTHENTICATION:
    case ERROR_TYPES.AUTHORIZATION:
      return ERROR_SEVERITY.MEDIUM;
    case ERROR_TYPES.SERVER:
      return status >= 500 ? ERROR_SEVERITY.CRITICAL : ERROR_SEVERITY.HIGH;
    case ERROR_TYPES.VALIDATION:
      return ERROR_SEVERITY.LOW;
    default:
      return ERROR_SEVERITY.MEDIUM;
  }
};

// Check if error is retryable
export const isRetryableError = (error) => {
  const errorType = getErrorType(error);
  const status = error.response?.status;
  
  // Don't retry client errors (4xx) except for specific cases
  if (status >= 400 && status < 500) {
    return status === 408 || status === 429; // Timeout or Rate Limited
  }
  
  // Retry network errors and server errors
  return [
    ERROR_TYPES.NETWORK,
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.SERVER
  ].includes(errorType);
};

// Calculate retry delay with exponential backoff
export const calculateRetryDelay = (attempt) => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
};

// Sleep utility for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced API call with retry logic
export const apiCallWithRetry = async (apiCall, options = {}) => {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    onRetry = null,
    retryCondition = isRetryableError,
    showToast = true
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      
      // Success - clear any previous error toasts
      if (attempt > 0 && showToast) {
        toast.success('Connection restored!');
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if error is retryable
      if (!retryCondition(error)) {
        break;
      }
      
      // Calculate delay and wait
      const delay = calculateRetryDelay(attempt);
      
      if (showToast && attempt === 0) {
        toast.error(`Connection failed. Retrying in ${delay / 1000}s...`, {
          id: 'retry-toast'
        });
      }
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }
      
      await sleep(delay);
    }
  }
  
  // All retries failed
  throw lastError;
};

// Format error message for display
export const formatErrorMessage = (error) => {
  const errorType = getErrorType(error);
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;
  
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection.';
    case ERROR_TYPES.AUTHENTICATION:
      return 'Your session has expired. Please log in again.';
    case ERROR_TYPES.AUTHORIZATION:
      return 'You don\'t have permission to perform this action.';
    case ERROR_TYPES.VALIDATION:
      return message || 'Please check your input and try again.';
    case ERROR_TYPES.SERVER:
      return status >= 500 
        ? 'Server error occurred. Please try again later.'
        : message || 'An error occurred while processing your request.';
    case ERROR_TYPES.TIMEOUT:
      return 'Request timed out. Please try again.';
    default:
      return message || 'An unexpected error occurred.';
  }
};

// Error handler class for managing application errors
export class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      showToast: true,
      logErrors: true,
      reportErrors: false,
      ...options
    };
  }

  // Handle API errors
  handleApiError = (error, context = {}) => {
    const errorType = getErrorType(error);
    const severity = getErrorSeverity(errorType, error.response?.status);
    const message = formatErrorMessage(error);
    
    // Log error
    if (this.options.logErrors) {
      console.error('API Error:', {
        type: errorType,
        severity,
        message,
        status: error.response?.status,
        context,
        error
      });
    }
    
    // Show toast notification
    if (this.options.showToast) {
      const toastOptions = {
        duration: severity === ERROR_SEVERITY.CRITICAL ? 8000 : 4000
      };
      
      switch (severity) {
        case ERROR_SEVERITY.CRITICAL:
          toast.error(message, toastOptions);
          break;
        case ERROR_SEVERITY.HIGH:
          toast.error(message, toastOptions);
          break;
        case ERROR_SEVERITY.MEDIUM:
          toast.error(message, toastOptions);
          break;
        case ERROR_SEVERITY.LOW:
          toast.error(message, toastOptions);
          break;
        default:
          toast.error(message, toastOptions);
      }
    }
    
    // Report error if enabled
    if (this.options.reportErrors) {
      this.reportError(error, context);
    }
    
    return {
      type: errorType,
      severity,
      message,
      retryable: isRetryableError(error)
    };
  };

  // Handle component errors
  handleComponentError = (error, errorInfo, context = {}) => {
    if (this.options.logErrors) {
      console.error('Component Error:', {
        error,
        errorInfo,
        context
      });
    }
    
    if (this.options.showToast) {
      toast.error('A component error occurred. Please refresh the page.');
    }
    
    if (this.options.reportErrors) {
      this.reportError(error, { ...errorInfo, ...context });
    }
  };

  // Report error to external service
  reportError = (error, context = {}) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context
    };
    
    // In a real app, send to error reporting service
    console.log('Error Report:', errorReport);
    
    // Example: Send to error reporting service
    // errorReportingService.report(errorReport);
  };
}

// Default error handler instance
export const defaultErrorHandler = new ErrorHandler();

// React hook for error handling
export const useErrorHandler = (options = {}) => {
  const errorHandler = React.useMemo(() => new ErrorHandler(options), [options]);
  
  const handleError = React.useCallback((error, context = {}) => {
    return errorHandler.handleApiError(error, context);
  }, [errorHandler]);
  
  const handleComponentError = React.useCallback((error, errorInfo, context = {}) => {
    return errorHandler.handleComponentError(error, errorInfo, context);
  }, [errorHandler]);
  
  return {
    handleError,
    handleComponentError,
    apiCallWithRetry: (apiCall, retryOptions = {}) => 
      apiCallWithRetry(apiCall, { ...retryOptions, onError: handleError })
  };
};

export default ErrorHandler;