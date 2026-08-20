import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Create Year Context
const YearContext = createContext();

// Year Context Provider Component
export const YearProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [accessibleYears, setAccessibleYears] = useState([]);
  const [currentYearFilter, setCurrentYearFilter] = useState('all');
  const [yearPermissions, setYearPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize accessible years based on user role
  const initializeAccessibleYears = useCallback(() => {
    if (!user || !isAuthenticated) {
      setAccessibleYears([]);
      setCurrentYearFilter('all');
      setYearPermissions({});
      return;
    }

    let years = [];
    
    if (user.role === 'admin') {
      years = [1, 2, 3, 4];
    } else if (user.role === 'student') {
      years = [user.academicYear];
      setCurrentYearFilter(user.academicYear.toString());
    } else if (user.role === 'faculty') {
      years = user.accessibleYears || [];
      // Set default filter to first accessible year if only one, otherwise 'all'
      if (years.length === 1) {
        setCurrentYearFilter(years[0].toString());
      } else {
        setCurrentYearFilter('all');
      }
    }

    setAccessibleYears(years);
    
    // Build year permissions cache
    const permissions = {};
    [1, 2, 3, 4].forEach(year => {
      permissions[year] = years.includes(year);
    });
    setYearPermissions(permissions);
  }, [user, isAuthenticated]);

  // Initialize on user change
  useEffect(() => {
    initializeAccessibleYears();
  }, [initializeAccessibleYears]);

  // Check if user has access to a specific year
  const hasYearAccess = useCallback((year) => {
    if (!user || !isAuthenticated) return false;
    
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1 || yearNum > 4) return false;
    
    return yearPermissions[yearNum] || false;
  }, [user, isAuthenticated, yearPermissions]);

  // Check if user has access to multiple years
  const hasMultipleYearAccess = useCallback((years) => {
    if (!Array.isArray(years)) return false;
    return years.every(year => hasYearAccess(year));
  }, [hasYearAccess]);

  // Get years that user doesn't have access to
  const getDeniedYears = useCallback((requestedYears) => {
    if (!Array.isArray(requestedYears)) return [];
    return requestedYears.filter(year => !hasYearAccess(year));
  }, [hasYearAccess]);

  // Set current year filter with validation
  const setYearFilter = useCallback((year) => {
    if (year === 'all') {
      setCurrentYearFilter('all');
      return true;
    }

    const yearNum = parseInt(year);
    if (hasYearAccess(yearNum)) {
      setCurrentYearFilter(year.toString());
      return true;
    }

    setError(`You don't have access to ${yearNum}${yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th'} year`);
    return false;
  }, [hasYearAccess]);

  // Clear year filter (set to 'all' if multiple years, or user's year if single)
  const clearYearFilter = useCallback(() => {
    if (user?.role === 'student') {
      setCurrentYearFilter(user.academicYear.toString());
    } else if (accessibleYears.length === 1) {
      setCurrentYearFilter(accessibleYears[0].toString());
    } else {
      setCurrentYearFilter('all');
    }
    setError(null);
  }, [user, accessibleYears]);

  // Get year display text
  const getYearDisplayText = useCallback((year) => {
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return 'All Years';
    
    const suffix = yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th';
    return `${yearNum}${suffix} Year`;
  }, []);

  // Get current filter display text
  const getCurrentFilterDisplayText = useCallback(() => {
    if (currentYearFilter === 'all') {
      return 'All Years';
    }
    return getYearDisplayText(currentYearFilter);
  }, [currentYearFilter, getYearDisplayText]);

  // Get accessible years with display text
  const getAccessibleYearsWithDisplay = useCallback(() => {
    return accessibleYears.map(year => ({
      value: year,
      label: getYearDisplayText(year),
      isCurrent: currentYearFilter === year.toString()
    }));
  }, [accessibleYears, currentYearFilter, getYearDisplayText]);

  // Check if current filter is valid
  const isCurrentFilterValid = useCallback(() => {
    if (currentYearFilter === 'all') return true;
    return hasYearAccess(currentYearFilter);
  }, [currentYearFilter, hasYearAccess]);

  // Get user's role-specific context
  const getUserYearContext = useCallback(() => {
    if (!user) return null;

    return {
      role: user.role,
      department: user.department,
      academicYear: user.academicYear,
      accessibleYears: accessibleYears,
      canAccessMultipleYears: accessibleYears.length > 1,
      defaultYear: user.role === 'student' ? user.academicYear : 
                  accessibleYears.length === 1 ? accessibleYears[0] : null
    };
  }, [user, accessibleYears]);

  // Validate year access and return detailed result
  const validateYearAccess = useCallback((requestedYears) => {
    const years = Array.isArray(requestedYears) ? requestedYears : [requestedYears];
    const validYears = years.filter(year => hasYearAccess(year));
    const invalidYears = years.filter(year => !hasYearAccess(year));

    return {
      hasAccess: invalidYears.length === 0,
      validYears,
      invalidYears,
      accessibleYears,
      message: invalidYears.length > 0 
        ? `No access to: ${invalidYears.map(y => getYearDisplayText(y)).join(', ')}`
        : 'Access granted'
    };
  }, [hasYearAccess, accessibleYears, getYearDisplayText]);

  // Reset error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get year filter for API requests
  const getYearFilterForAPI = useCallback(() => {
    if (currentYearFilter === 'all') {
      return undefined; // Let backend handle filtering based on user permissions
    }
    return parseInt(currentYearFilter);
  }, [currentYearFilter]);

  // Check if user can create content for specific years
  const canCreateForYears = useCallback((targetYears) => {
    if (!user || !isAuthenticated) return false;
    
    // Admin can create for any years
    if (user.role === 'admin') return true;
    
    // Students can't create content for other years
    if (user.role === 'student') {
      return Array.isArray(targetYears) 
        ? targetYears.every(year => year === user.academicYear)
        : targetYears === user.academicYear;
    }
    
    // Faculty can only create for their accessible years
    if (user.role === 'faculty') {
      return hasMultipleYearAccess(Array.isArray(targetYears) ? targetYears : [targetYears]);
    }
    
    return false;
  }, [user, isAuthenticated, hasMultipleYearAccess]);

  // Context value
  const contextValue = {
    // State
    accessibleYears,
    currentYearFilter,
    yearPermissions,
    loading,
    error,
    
    // Actions
    setYearFilter,
    clearYearFilter,
    clearError,
    
    // Validation functions
    hasYearAccess,
    hasMultipleYearAccess,
    getDeniedYears,
    validateYearAccess,
    canCreateForYears,
    isCurrentFilterValid,
    
    // Utility functions
    getYearDisplayText,
    getCurrentFilterDisplayText,
    getAccessibleYearsWithDisplay,
    getUserYearContext,
    getYearFilterForAPI,
    
    // Computed properties
    canAccessMultipleYears: accessibleYears.length > 1,
    hasAnyYearAccess: accessibleYears.length > 0,
    isAdmin: user?.role === 'admin',
    isFaculty: user?.role === 'faculty',
    isStudent: user?.role === 'student'
  };

  return (
    <YearContext.Provider value={contextValue}>
      {children}
    </YearContext.Provider>
  );
};

// Custom hook to use Year Context
export const useYear = () => {
  const context = useContext(YearContext);
  
  if (!context) {
    throw new Error('useYear must be used within a YearProvider');
  }
  
  return context;
};

// HOC for components that need year context
export const withYearContext = (Component) => {
  return function YearContextComponent(props) {
    return (
      <YearProvider>
        <Component {...props} />
      </YearProvider>
    );
  };
};

// Hook for year-aware API calls
export const useYearAwareAPI = () => {
  const { getYearFilterForAPI, hasYearAccess, validateYearAccess } = useYear();
  
  const buildYearAwareParams = useCallback((baseParams = {}) => {
    const yearFilter = getYearFilterForAPI();
    
    return {
      ...baseParams,
      ...(yearFilter && { academicYear: yearFilter })
    };
  }, [getYearFilterForAPI]);
  
  const validateAPIAccess = useCallback((requiredYears) => {
    if (!requiredYears) return { canAccess: true };
    
    const validation = validateYearAccess(requiredYears);
    return {
      canAccess: validation.hasAccess,
      error: validation.hasAccess ? null : validation.message,
      details: validation
    };
  }, [validateYearAccess]);
  
  return {
    buildYearAwareParams,
    validateAPIAccess,
    hasYearAccess
  };
};

export default YearContext;