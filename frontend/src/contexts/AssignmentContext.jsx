import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { assignmentService } from '../services/assignmentService';
import toast from 'react-hot-toast';

// Create Assignment Context
const AssignmentContext = createContext();

// Assignment Context Provider Component
export const AssignmentProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [assignedFaculty, setAssignedFaculty] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [assignmentStats, setAssignmentStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Cache for assignment data to avoid repeated API calls
  const [cache, setCache] = useState({
    faculty: { data: [], timestamp: null },
    students: { data: [], timestamp: null },
    stats: { data: null, timestamp: null }
  });

  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Check if cached data is still valid
  const isCacheValid = useCallback((cacheEntry) => {
    if (!cacheEntry.timestamp) return false;
    return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
  }, []);

  // Clear all assignment data
  const clearAssignmentData = useCallback(() => {
    setAssignedFaculty([]);
    setAssignedStudents([]);
    setAssignmentStats(null);
    setError(null);
    setLastUpdated(null);
    setCache({
      faculty: { data: [], timestamp: null },
      students: { data: [], timestamp: null },
      stats: { data: null, timestamp: null }
    });
  }, []);

  // Load assigned faculty for students
  const loadAssignedFaculty = useCallback(async (forceRefresh = false) => {
    if (!user || !isAuthenticated || user.role !== 'student') {
      return;
    }

    // Check cache first
    if (!forceRefresh && isCacheValid(cache.faculty)) {
      setAssignedFaculty(cache.faculty.data);
      return cache.faculty.data;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await assignmentService.getMyFaculty();
      
      if (response.success) {
        const facultyData = response.data.faculty || [];
        setAssignedFaculty(facultyData);
        setLastUpdated(new Date());
        
        // Update cache
        setCache(prev => ({
          ...prev,
          faculty: { data: facultyData, timestamp: Date.now() }
        }));
        
        return facultyData;
      } else {
        throw new Error(response.error?.message || 'Failed to load assigned faculty');
      }
    } catch (error) {
      console.error('Error loading assigned faculty:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, cache.faculty, isCacheValid]);

  // Load assigned students for faculty
  const loadAssignedStudents = useCallback(async (forceRefresh = false) => {
    if (!user || !isAuthenticated || user.role !== 'faculty') {
      return;
    }

    // Check cache first
    if (!forceRefresh && isCacheValid(cache.students)) {
      setAssignedStudents(cache.students.data);
      return cache.students.data;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await assignmentService.getMyStudents();
      
      if (response.success) {
        const studentsData = response.data.studentsByYear || {};
        const flatStudents = Object.values(studentsData).flat();
        setAssignedStudents(flatStudents);
        setLastUpdated(new Date());
        
        // Update cache
        setCache(prev => ({
          ...prev,
          students: { data: flatStudents, timestamp: Date.now() }
        }));
        
        return flatStudents;
      } else {
        throw new Error(response.error?.message || 'Failed to load assigned students');
      }
    } catch (error) {
      console.error('Error loading assigned students:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, cache.students, isCacheValid]);

  // Load assignment statistics for admin
  const loadAssignmentStats = useCallback(async (forceRefresh = false) => {
    if (!user || !isAuthenticated || user.role !== 'admin') {
      return;
    }

    // Check cache first
    if (!forceRefresh && isCacheValid(cache.stats)) {
      setAssignmentStats(cache.stats.data);
      return cache.stats.data;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await assignmentService.getAssignmentStats();
      
      if (response.success) {
        const statsData = response.data;
        setAssignmentStats(statsData);
        setLastUpdated(new Date());
        
        // Update cache
        setCache(prev => ({
          ...prev,
          stats: { data: statsData, timestamp: Date.now() }
        }));
        
        return statsData;
      } else {
        throw new Error(response.error?.message || 'Failed to load assignment statistics');
      }
    } catch (error) {
      console.error('Error loading assignment statistics:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, cache.stats, isCacheValid]);

  // Refresh assignments for current user
  const refreshAssignments = useCallback(async (force = false) => {
    if (!user || !isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await assignmentService.refreshAssignments(force);
      
      if (response.success) {
        // Clear cache to force reload
        setCache({
          faculty: { data: [], timestamp: null },
          students: { data: [], timestamp: null },
          stats: { data: null, timestamp: null }
        });
        
        // Reload appropriate data based on user role
        if (user.role === 'student') {
          await loadAssignedFaculty(true);
        } else if (user.role === 'faculty') {
          await loadAssignedStudents(true);
        } else if (user.role === 'admin') {
          await loadAssignmentStats(true);
        }
        
        toast.success('Assignments refreshed successfully');
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to refresh assignments');
      }
    } catch (error) {
      console.error('Error refreshing assignments:', error);
      setError(error.message);
      toast.error('Failed to refresh assignments');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, loadAssignedFaculty, loadAssignedStudents, loadAssignmentStats]);

  // Initialize on user change
  useEffect(() => {
    if (!user || !isAuthenticated) {
      clearAssignmentData();
      return;
    }

    const initializeAssignments = async () => {
      try {
        if (user.role === 'student') {
          await loadAssignedFaculty();
        } else if (user.role === 'faculty') {
          await loadAssignedStudents();
        } else if (user.role === 'admin') {
          await loadAssignmentStats();
        }
      } catch (error) {
        console.error('Error initializing assignments:', error);
      }
    };

    initializeAssignments();
  }, [user?.id, user?.role, isAuthenticated]); // Only depend on user ID and role, not the entire user object

  // Check if user has assigned faculty (for students)
  const hasAssignedFaculty = useCallback(() => {
    return user?.role === 'student' && assignedFaculty.length > 0;
  }, [user, assignedFaculty]);

  // Check if user has assigned students (for faculty)
  const hasAssignedStudents = useCallback(() => {
    return user?.role === 'faculty' && assignedStudents.length > 0;
  }, [user, assignedStudents]);

  // Get faculty by ID
  const getFacultyById = useCallback((facultyId) => {
    return assignedFaculty.find(assignment => 
      assignment.faculty.id === facultyId || assignment.faculty._id === facultyId
    );
  }, [assignedFaculty]);

  // Get student by ID
  const getStudentById = useCallback((studentId) => {
    return assignedStudents.find(assignment => 
      assignment.student.id === studentId || assignment.student._id === studentId
    );
  }, [assignedStudents]);

  // Check if faculty is assigned to current student
  const isFacultyAssigned = useCallback((facultyId) => {
    if (user?.role !== 'student') return false;
    return assignedFaculty.some(assignment => 
      assignment.faculty.id === facultyId || assignment.faculty._id === facultyId
    );
  }, [user, assignedFaculty]);

  // Check if student is assigned to current faculty
  const isStudentAssigned = useCallback((studentId) => {
    if (user?.role !== 'faculty') return false;
    return assignedStudents.some(assignment => 
      assignment.student.id === studentId || assignment.student._id === studentId
    );
  }, [user, assignedStudents]);

  // Get assignment summary for current user
  const getAssignmentSummary = useCallback(() => {
    if (!user || !isAuthenticated) return null;

    if (user.role === 'student') {
      return {
        type: 'student',
        totalFaculty: assignedFaculty.length,
        hasAssignments: assignedFaculty.length > 0,
        departments: [...new Set(assignedFaculty.map(a => a.faculty.department))],
        lastUpdated
      };
    }

    if (user.role === 'faculty') {
      const studentsByYear = assignedStudents.reduce((acc, assignment) => {
        const year = assignment.student.academicYear;
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {});

      return {
        type: 'faculty',
        totalStudents: assignedStudents.length,
        hasAssignments: assignedStudents.length > 0,
        studentsByYear,
        accessibleYears: user.accessibleYears || [],
        lastUpdated
      };
    }

    if (user.role === 'admin') {
      return {
        type: 'admin',
        stats: assignmentStats,
        hasStats: assignmentStats !== null,
        lastUpdated
      };
    }

    return null;
  }, [user, isAuthenticated, assignedFaculty, assignedStudents, assignmentStats, lastUpdated]);

  // Get assignments grouped by year (for faculty)
  const getStudentsByYear = useCallback(() => {
    if (user?.role !== 'faculty') return {};

    return assignedStudents.reduce((acc, assignment) => {
      const year = assignment.student.academicYear;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(assignment);
      return acc;
    }, {});
  }, [user, assignedStudents]);

  // Get assignments grouped by department
  const getAssignmentsByDepartment = useCallback(() => {
    if (user?.role === 'student') {
      return assignedFaculty.reduce((acc, assignment) => {
        const dept = assignment.faculty.department;
        if (!acc[dept]) {
          acc[dept] = [];
        }
        acc[dept].push(assignment);
        return acc;
      }, {});
    }

    if (user?.role === 'faculty') {
      return assignedStudents.reduce((acc, assignment) => {
        const dept = assignment.student.department;
        if (!acc[dept]) {
          acc[dept] = [];
        }
        acc[dept].push(assignment);
        return acc;
      }, {});
    }

    return {};
  }, [user, assignedFaculty, assignedStudents]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if assignments are loading
  const isLoading = useCallback(() => {
    return loading;
  }, [loading]);

  // Get cache status
  const getCacheStatus = useCallback(() => {
    return {
      faculty: {
        cached: cache.faculty.timestamp !== null,
        valid: isCacheValid(cache.faculty),
        age: cache.faculty.timestamp ? Date.now() - cache.faculty.timestamp : null
      },
      students: {
        cached: cache.students.timestamp !== null,
        valid: isCacheValid(cache.students),
        age: cache.students.timestamp ? Date.now() - cache.students.timestamp : null
      },
      stats: {
        cached: cache.stats.timestamp !== null,
        valid: isCacheValid(cache.stats),
        age: cache.stats.timestamp ? Date.now() - cache.stats.timestamp : null
      }
    };
  }, [cache, isCacheValid]);

  // Context value
  const contextValue = {
    // State
    assignedFaculty,
    assignedStudents,
    assignmentStats,
    loading,
    error,
    lastUpdated,

    // Actions
    loadAssignedFaculty,
    loadAssignedStudents,
    loadAssignmentStats,
    refreshAssignments,
    clearError,
    clearAssignmentData,

    // Validation functions
    hasAssignedFaculty,
    hasAssignedStudents,
    isFacultyAssigned,
    isStudentAssigned,

    // Utility functions
    getFacultyById,
    getStudentById,
    getAssignmentSummary,
    getStudentsByYear,
    getAssignmentsByDepartment,
    isLoading,
    getCacheStatus,

    // Computed properties
    totalAssignedFaculty: assignedFaculty.length,
    totalAssignedStudents: assignedStudents.length,
    hasAnyAssignments: assignedFaculty.length > 0 || assignedStudents.length > 0,
    isStudent: user?.role === 'student',
    isFaculty: user?.role === 'faculty',
    isAdmin: user?.role === 'admin'
  };

  return (
    <AssignmentContext.Provider value={contextValue}>
      {children}
    </AssignmentContext.Provider>
  );
};

// Custom hook to use Assignment Context
export const useAssignment = () => {
  const context = useContext(AssignmentContext);
  
  if (!context) {
    throw new Error('useAssignment must be used within an AssignmentProvider');
  }
  
  return context;
};

// HOC for components that need assignment context
export const withAssignmentContext = (Component) => {
  return function AssignmentContextComponent(props) {
    return (
      <AssignmentProvider>
        <Component {...props} />
      </AssignmentProvider>
    );
  };
};

// Hook for assignment-aware API calls
export const useAssignmentAwareAPI = () => {
  const { 
    isFacultyAssigned, 
    isStudentAssigned, 
    hasAssignedFaculty, 
    hasAssignedStudents,
    assignedFaculty,
    assignedStudents 
  } = useAssignment();
  
  const validateContentAccess = useCallback((contentCreatorId, contentType = 'general') => {
    const { user } = useAuth();
    
    if (!user) {
      return { canAccess: false, reason: 'not_authenticated' };
    }

    // Admin can access everything
    if (user.role === 'admin') {
      return { canAccess: true, reason: 'admin_access' };
    }

    // Users can access their own content
    if (contentCreatorId === user._id || contentCreatorId === user.id) {
      return { canAccess: true, reason: 'own_content' };
    }

    // Student accessing faculty content
    if (user.role === 'student') {
      if (isFacultyAssigned(contentCreatorId)) {
        return { canAccess: true, reason: 'assigned_faculty_content' };
      }
      return { canAccess: false, reason: 'not_assigned_faculty' };
    }

    // Faculty accessing student content
    if (user.role === 'faculty') {
      if (isStudentAssigned(contentCreatorId)) {
        return { canAccess: true, reason: 'assigned_student_content' };
      }
      return { canAccess: false, reason: 'not_assigned_student' };
    }

    return { canAccess: false, reason: 'unknown_role' };
  }, [isFacultyAssigned, isStudentAssigned]);

  const getAssignedUserIds = useCallback(() => {
    const { user } = useAuth();
    
    if (!user) return [];

    if (user.role === 'student') {
      return assignedFaculty.map(assignment => assignment.faculty.id || assignment.faculty._id);
    }

    if (user.role === 'faculty') {
      return assignedStudents.map(assignment => assignment.student.id || assignment.student._id);
    }

    return [];
  }, [assignedFaculty, assignedStudents]);

  return {
    validateContentAccess,
    getAssignedUserIds,
    hasAssignedFaculty,
    hasAssignedStudents
  };
};

export default AssignmentContext;