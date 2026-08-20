// Error Reporting Service
class ErrorReportingService {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/errors',
      maxRetries: config.maxRetries || 3,
      batchSize: config.batchSize || 10,
      flushInterval: config.flushInterval || 30000, // 30 seconds
      enableConsoleLogging: config.enableConsoleLogging !== false,
      enableLocalStorage: config.enableLocalStorage !== false,
      maxStoredErrors: config.maxStoredErrors || 100,
      ...config
    };

    this.errorQueue = [];
    this.isOnline = navigator.onLine;
    this.flushTimer = null;

    this.init();
  }

  init() {
    // Set up periodic flushing
    this.startPeriodicFlush();

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for page unload to flush remaining errors
    window.addEventListener('beforeunload', this.flushSync);

    // Load any stored errors from localStorage
    this.loadStoredErrors();
  }

  handleOnline = () => {
    this.isOnline = true;
    this.flushErrors(); // Flush any queued errors when back online
  };

  handleOffline = () => {
    this.isOnline = false;
  };

  startPeriodicFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flushErrors();
    }, this.config.flushInterval);
  }

  // Report a single error
  report(error, context = {}) {
    const errorReport = this.createErrorReport(error, context);
    
    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      console.error('Error Report:', errorReport);
    }

    // Add to queue
    this.errorQueue.push(errorReport);

    // Store in localStorage if enabled
    if (this.config.enableLocalStorage) {
      this.storeError(errorReport);
    }

    // Flush immediately for critical errors
    if (errorReport.severity === 'critical') {
      this.flushErrors();
    }

    return errorReport.id;
  }

  // Create standardized error report
  createErrorReport(error, context = {}) {
    const timestamp = new Date().toISOString();
    const id = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      timestamp,
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name,
      type: context.type || 'javascript',
      severity: context.severity || this.determineSeverity(error),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: context.userId || this.getUserId(),
      sessionId: this.getSessionId(),
      buildVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
      environment: import.meta.env.MODE || 'development',
      context: {
        component: context.component,
        action: context.action,
        props: context.props,
        state: context.state,
        additionalInfo: context.additionalInfo,
        ...context.customContext
      },
      browserInfo: {
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth
        }
      },
      performance: this.getPerformanceMetrics()
    };
  }

  // Determine error severity
  determineSeverity(error) {
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return 'medium';
    }
    
    if (error.name === 'TypeError' && error.message.includes('Cannot read property')) {
      return 'high';
    }
    
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'medium';
    }
    
    return 'low';
  }

  // Get user ID (implement based on your auth system)
  getUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || user._id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  // Get or create session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('errorReporting_sessionId');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('errorReporting_sessionId', sessionId);
    }
    return sessionId;
  }

  // Get performance metrics
  getPerformanceMetrics() {
    if (!window.performance) return null;

    try {
      const navigation = performance.getEntriesByType('navigation')[0];
      const memory = performance.memory;

      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : null,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : null,
        memory: memory ? {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        } : null,
        timing: navigation ? {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart
        } : null
      };
    } catch (error) {
      return null;
    }
  }

  // Store error in localStorage
  storeError(errorReport) {
    try {
      const stored = JSON.parse(localStorage.getItem('errorReporting_errors') || '[]');
      stored.push(errorReport);
      
      // Keep only the most recent errors
      if (stored.length > this.config.maxStoredErrors) {
        stored.splice(0, stored.length - this.config.maxStoredErrors);
      }
      
      localStorage.setItem('errorReporting_errors', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to store error in localStorage:', error);
    }
  }

  // Load stored errors from localStorage
  loadStoredErrors() {
    try {
      const stored = JSON.parse(localStorage.getItem('errorReporting_errors') || '[]');
      this.errorQueue.push(...stored);
      
      // Clear stored errors after loading
      localStorage.removeItem('errorReporting_errors');
    } catch (error) {
      console.warn('Failed to load stored errors:', error);
    }
  }

  // Flush errors to server
  async flushErrors() {
    if (this.errorQueue.length === 0 || !this.isOnline) {
      return;
    }

    const batch = this.errorQueue.splice(0, this.config.batchSize);
    
    try {
      await this.sendErrorBatch(batch);
    } catch (error) {
      console.warn('Failed to send error batch:', error);
      
      // Put errors back in queue for retry
      this.errorQueue.unshift(...batch);
      
      // Store in localStorage as backup
      if (this.config.enableLocalStorage) {
        batch.forEach(errorReport => this.storeError(errorReport));
      }
    }
  }

  // Send error batch to server
  async sendErrorBatch(errors, retryCount = 0) {
    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        errors,
        metadata: {
          timestamp: new Date().toISOString(),
          batchSize: errors.length,
          retryCount
        }
      })
    });

    if (!response.ok) {
      if (retryCount < this.config.maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendErrorBatch(errors, retryCount + 1);
      }
      
      throw new Error(`Failed to send error batch: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Synchronous flush for page unload
  flushSync = () => {
    if (this.errorQueue.length === 0) return;

    try {
      // Use sendBeacon for reliable delivery during page unload
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          errors: this.errorQueue,
          metadata: {
            timestamp: new Date().toISOString(),
            batchSize: this.errorQueue.length,
            isPageUnload: true
          }
        });
        
        navigator.sendBeacon(this.config.apiEndpoint, data);
      }
    } catch (error) {
      console.warn('Failed to send errors on page unload:', error);
    }
  };

  // Get error statistics
  getStats() {
    return {
      queueSize: this.errorQueue.length,
      isOnline: this.isOnline,
      sessionId: this.getSessionId(),
      config: this.config
    };
  }

  // Clear error queue
  clearQueue() {
    this.errorQueue = [];
  }

  // Destroy service
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('beforeunload', this.flushSync);
    
    // Final flush
    this.flushSync();
  }
}

// Create default instance
const errorReportingService = new ErrorReportingService({
  enableConsoleLogging: import.meta.env.DEV,
  apiEndpoint: import.meta.env.VITE_ERROR_REPORTING_ENDPOINT || '/api/errors'
});

// Global error handlers
window.addEventListener('error', (event) => {
  errorReportingService.report(event.error || new Error(event.message), {
    type: 'javascript',
    severity: 'high',
    context: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorReportingService.report(event.reason, {
    type: 'promise',
    severity: 'high',
    context: {
      promise: event.promise
    }
  });
});

export default errorReportingService;
export { ErrorReportingService };