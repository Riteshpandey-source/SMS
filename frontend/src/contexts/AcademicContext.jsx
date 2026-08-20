import React, { createContext, useContext, useReducer, useCallback } from 'react';
import academicService from '../services/academicService';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  // Current student data
  selectedStudent: null,
  academicRecord: null,
  
  // Academic data
  midTermMarks: [],
  attendance: [],
  debarments: [],
  
  // Loading states
  loading: {
    academicRecord: false,
    midTermMarks: false,
    attendance: false,
    debarments: false,
    updating: false
  },
  
  // Error states
  errors: {
    academicRecord: null,
    midTermMarks: null,
    attendance: null,
    debarments: null,
    updating: null
  },
  
  // UI state
  sidebarOpen: false,
  activeTab: 'marks', // 'marks', 'attendance', 'debarments'
  unsavedChanges: false,
  
  // Cache
  cache: new Map(),
  lastUpdated: null
};

// Action types
const ACTIONS = {
  // Student selection
  SET_SELECTED_STUDENT: 'SET_SELECTED_STUDENT',
  CLEAR_SELECTED_STUDENT: 'CLEAR_SELECTED_STUDENT',
  
  // Sidebar
  OPEN_SIDEBAR: 'OPEN_SIDEBAR',
  CLOSE_SIDEBAR: 'CLOSE_SIDEBAR',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  
  // Loading states
  SET_LOADING: 'SET_LOADING',
  CLEAR_LOADING: 'CLEAR_LOADING',
  
  // Error states
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  CLEAR_ALL_ERRORS: 'CLEAR_ALL_ERRORS',
  
  // Academic data
  SET_ACADEMIC_RECORD: 'SET_ACADEMIC_RECORD',
  SET_MIDTERM_MARKS: 'SET_MIDTERM_MARKS',
  SET_ATTENDANCE: 'SET_ATTENDANCE',
  SET_DEBARMENTS: 'SET_DEBARMENTS',
  
  // Data updates
  UPDATE_MIDTERM_MARKS: 'UPDATE_MIDTERM_MARKS',
  UPDATE_ATTENDANCE: 'UPDATE_ATTENDANCE',
  UPDATE_DEBARMENTS: 'UPDATE_DEBARMENTS',
  
  // UI state
  SET_UNSAVED_CHANGES: 'SET_UNSAVED_CHANGES',
  
  // Cache
  SET_CACHE: 'SET_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE'
};

// Reducer
const academicReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_SELECTED_STUDENT:
      return {
        ...state,
        selectedStudent: action.payload,
        lastUpdated: new Date().toISOString()
      };
      
    case ACTIONS.CLEAR_SELECTED_STUDENT:
      return {
        ...state,
        selectedStudent: null,
        academicRecord: null,
        midTermMarks: [],
        attendance: [],
        debarments: [],
        sidebarOpen: false,
        unsavedChanges: false,
        errors: { ...initialState.errors }
      };
      
    case ACTIONS.OPEN_SIDEBAR:
      return {
        ...state,
        sidebarOpen: true
      };
      
    case ACTIONS.CLOSE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: false,
        unsavedChanges: false
      };
      
    case ACTIONS.SET_ACTIVE_TAB:
      return {
        ...state,
        activeTab: action.payload
      };
      
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };
      
    case ACTIONS.CLEAR_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload]: false
        }
      };
      
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        }
      };
      
    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload]: null
        }
      };
      
    case ACTIONS.CLEAR_ALL_ERRORS:
      return {
        ...state,
        errors: { ...initialState.errors }
      };
      
    case ACTIONS.SET_ACADEMIC_RECORD:
      return {
        ...state,
        academicRecord: action.payload,
        lastUpdated: new Date().toISOString()
      };
      
    case ACTIONS.SET_MIDTERM_MARKS:
      return {
        ...state,
        midTermMarks: action.payload,
        lastUpdated: new Date().toISOString()
      };
      
    case ACTIONS.SET_ATTENDANCE:
      return {
        ...state,
        attendance: action.payload,
        lastUpdated: new Date().toISOString()
      };
      
    case ACTIONS.SET_DEBARMENTS:
      return {
        ...state,
        debarments: action.payload,
        lastUpdated: new Date().toISOString()
      };
      
    case ACTIONS.UPDATE_MIDTERM_MARKS:
      return {
        ...state,
        midTermMarks: action.payload,
        unsavedChanges: false,
        lastUpdated: new Date().toISOString()
      };
      
    case ACTIONS.UPDATE_ATTENDANCE:
      return {
        ...state,
        attendance: action.payload,
        unsavedChanges: false,
        lastUpdated: new Date().toISOString()
      };
      
    case ACTIONS.UPDATE_DEBARMENTS:
      return {
        ...state,
        debarments: action.payload,
        unsavedChanges: false,
        lastUpdated: new Date().toISOString()
      };
      
    case ACTIONS.SET_UNSAVED_CHANGES:
      return {
        ...state,
        unsavedChanges: action.payload
      };
      
    case ACTIONS.SET_CACHE:
      const newCache = new Map(state.cache);
      newCache.set(action.payload.key, action.payload.data);
      return {
        ...state,
        cache: newCache
      };
      
    case ACTIONS.CLEAR_CACHE:
      return {
        ...state,
        cache: new Map()
      };
      
    default:
      return state;
  }
};

// Create context
const AcademicContext = createContext();

// Provider component
export const AcademicProvider = ({ children }) => {
  const [state, dispatch] = useReducer(academicReducer, initialState);

  // Helper functions
  const setLoading = useCallback((key, value) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { key, value } });
  }, []);

  const clearLoading = useCallback((key) => {
    dispatch({ type: ACTIONS.CLEAR_LOADING, payload: key });
  }, []);

  const setError = useCallback((key, error) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: { key, error } });
  }, []);

  const clearError = useCallback((key) => {
    dispatch({ type: ACTIONS.CLEAR_ERROR, payload: key });
  }, []);

  const clearAllErrors = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ALL_ERRORS });
  }, []);

  // Student selection
  const selectStudent = useCallback((student) => {
    dispatch({ type: ACTIONS.SET_SELECTED_STUDENT, payload: student });
  }, []);

  const clearSelectedStudent = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_SELECTED_STUDENT });
  }, []);

  // Sidebar management
  const openSidebar = useCallback((student = null, tab = 'marks') => {
    if (student) {
      selectStudent(student);
    }
    dispatch({ type: ACTIONS.SET_ACTIVE_TAB, payload: tab });
    dispatch({ type: ACTIONS.OPEN_SIDEBAR });
  }, [selectStudent]);

  const closeSidebar = useCallback(() => {
    dispatch({ type: ACTIONS.CLOSE_SIDEBAR });
  }, []);

  const setActiveTab = useCallback((tab) => {
    dispatch({ type: ACTIONS.SET_ACTIVE_TAB, payload: tab });
  }, []);

  // Cache management
  const getCacheKey = useCallback((studentId, dataType, academicYear = null, semester = null) => {
    return `${studentId}-${dataType}-${academicYear || 'current'}-${semester || 'current'}`;
  }, []);

  const getCachedData = useCallback((key) => {
    return state.cache.get(key);
  }, [state.cache]);

  const setCachedData = useCallback((key, data) => {
    dispatch({ type: ACTIONS.SET_CACHE, payload: { key, data } });
  }, []);

  // Load academic record
  const loadAcademicRecord = useCallback(async (studentId, academicYear = null, semester = null) => {
    const cacheKey = getCacheKey(studentId, 'record', academicYear, semester);
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      dispatch({ type: ACTIONS.SET_ACADEMIC_RECORD, payload: cachedData });
      return cachedData;
    }

    setLoading('academicRecord', true);
    clearError('academicRecord');

    try {
      const response = await academicService.getAcademicRecords(studentId, academicYear, semester);
      const record = response.data?.records?.[0] || null;
      
      dispatch({ type: ACTIONS.SET_ACADEMIC_RECORD, payload: record });
      setCachedData(cacheKey, record);
      
      return record;
    } catch (error) {
      setError('academicRecord', error.message);
      throw error;
    } finally {
      clearLoading('academicRecord');
    }
  }, [getCacheKey, getCachedData, setCachedData, setLoading, clearError, setError, clearLoading]);

  // Load mid-term marks
  const loadMidTermMarks = useCallback(async (studentId, academicYear = null, semester = null) => {
    console.log(`📊 Loading mid-term marks for student: ${studentId}, Year: ${academicYear}, Semester: ${semester}`);
    
    const cacheKey = getCacheKey(studentId, 'marks', academicYear, semester);
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log(`📊 Using cached mid-term marks:`, cachedData);
      dispatch({ type: ACTIONS.SET_MIDTERM_MARKS, payload: cachedData });
      return cachedData;
    }

    setLoading('midTermMarks', true);
    clearError('midTermMarks');

    try {
      const response = await academicService.getMidTermMarks(studentId, academicYear, semester);
      console.log(`📊 API Response for mid-term marks:`, response);
      
      // Backend returns midTermMarks field
      const marks = response.data?.midTermMarks || response.data?.marks || [];
      console.log(`📊 Processed marks data:`, marks);
      
      // If no marks from API, return empty array (don't create defaults)
      // Faculty needs to enter actual data
      if (marks.length === 0) {
        console.log(`📊 No marks found in API response - returning empty array`);
        dispatch({ type: ACTIONS.SET_MIDTERM_MARKS, payload: [] });
        setCachedData(cacheKey, []);
        return [];
      }
      
      dispatch({ type: ACTIONS.SET_MIDTERM_MARKS, payload: marks });
      setCachedData(cacheKey, marks);
      
      return marks;
    } catch (error) {
      console.error(`❌ Failed to load mid-term marks:`, error);
      setError('midTermMarks', error.message);
      
      // Create fallback marks data
      const fallbackMarks = createDefaultMarks(studentId, academicYear);
      dispatch({ type: ACTIONS.SET_MIDTERM_MARKS, payload: fallbackMarks });
      return fallbackMarks;
    } finally {
      clearLoading('midTermMarks');
    }
  }, [getCacheKey, getCachedData, setCachedData, setLoading, clearError, setError, clearLoading]);

  // Load attendance
  const loadAttendance = useCallback(async (studentId, academicYear = null, semester = null) => {
    console.log(`📅 Loading attendance for student: ${studentId}, Year: ${academicYear}, Semester: ${semester}`);
    
    const cacheKey = getCacheKey(studentId, 'attendance', academicYear, semester);
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log(`📅 Using cached attendance:`, cachedData);
      dispatch({ type: ACTIONS.SET_ATTENDANCE, payload: cachedData });
      return cachedData;
    }

    setLoading('attendance', true);
    clearError('attendance');

    try {
      const response = await academicService.getAttendance(studentId, academicYear, semester);
      console.log(`📅 API Response for attendance:`, response);
      
      const attendance = response.data?.attendance?.[0]?.attendance || [];
      console.log(`📅 Processed attendance data:`, attendance);
      
      // If no attendance from API, return empty array (don't create defaults)
      // Faculty needs to enter actual data
      if (attendance.length === 0) {
        console.log(`📅 No attendance found in API response - returning empty array`);
        dispatch({ type: ACTIONS.SET_ATTENDANCE, payload: [] });
        setCachedData(cacheKey, []);
        return [];
      }
      
      dispatch({ type: ACTIONS.SET_ATTENDANCE, payload: attendance });
      setCachedData(cacheKey, attendance);
      
      return attendance;
    } catch (error) {
      console.error(`❌ Failed to load attendance:`, error);
      setError('attendance', error.message);
      
      // Create fallback attendance data
      const fallbackAttendance = createDefaultAttendance(studentId, academicYear);
      dispatch({ type: ACTIONS.SET_ATTENDANCE, payload: fallbackAttendance });
      return fallbackAttendance;
    } finally {
      clearLoading('attendance');
    }
  }, [getCacheKey, getCachedData, setCachedData, setLoading, clearError, setError, clearLoading]);

  // Load debarments
  const loadDebarments = useCallback(async (studentId) => {
    console.log(`⚠️ Loading debarments for student: ${studentId}`);
    
    const cacheKey = getCacheKey(studentId, 'debarments');
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log(`⚠️ Using cached debarments:`, cachedData);
      dispatch({ type: ACTIONS.SET_DEBARMENTS, payload: cachedData });
      return cachedData;
    }

    setLoading('debarments', true);
    clearError('debarments');

    try {
      const response = await academicService.getStudentDebarments(studentId);
      console.log(`⚠️ API Response for debarments:`, response);
      
      const debarments = response.data || {};
      console.log(`⚠️ Processed debarments data:`, debarments);
      
      // If no debarments from API, create default structure
      if (!debarments || Object.keys(debarments).length === 0) {
        console.log(`⚠️ No debarments found, creating default debarment structure`);
        const defaultDebarments = {
          isDebarred: false,
          debarments: [],
          manualDebarments: {},
          lastUpdated: new Date().toISOString()
        };
        dispatch({ type: ACTIONS.SET_DEBARMENTS, payload: defaultDebarments });
        setCachedData(cacheKey, defaultDebarments);
        return defaultDebarments;
      }
      
      dispatch({ type: ACTIONS.SET_DEBARMENTS, payload: debarments });
      setCachedData(cacheKey, debarments);
      
      return debarments;
    } catch (error) {
      console.error(`❌ Failed to load debarments:`, error);
      setError('debarments', error.message);
      
      // Create fallback debarment data
      const fallbackDebarments = {
        isDebarred: false,
        debarments: [],
        manualDebarments: {},
        lastUpdated: new Date().toISOString()
      };
      dispatch({ type: ACTIONS.SET_DEBARMENTS, payload: fallbackDebarments });
      return fallbackDebarments;
    } finally {
      clearLoading('debarments');
    }
  }, [getCacheKey, getCachedData, setCachedData, setLoading, clearError, setError, clearLoading]);

  // Update mid-term marks
  const updateMidTermMarks = useCallback(async (studentId, marks, academicYear = null, semester = null) => {
    setLoading('updating', true);
    clearError('updating');

    try {
      console.log('📊 Updating marks for student:', studentId, 'Marks count:', marks.length);
      const response = await academicService.updateMidTermMarks(studentId, marks, academicYear, semester);
      console.log('📊 Update response:', response);
      
      // Backend returns midTermMarks field
      const updatedMarks = response.data?.midTermMarks || response.data?.marks || marks;
      console.log('📊 Updated marks from backend:', updatedMarks);
      
      // Update state immediately
      dispatch({ type: ACTIONS.UPDATE_MIDTERM_MARKS, payload: updatedMarks });
      
      // IMPORTANT: Clear ALL cache entries for this student to force fresh fetch
      console.log('📊 Clearing all cache for student:', studentId);
      dispatch({ type: ACTIONS.CLEAR_CACHE });
      
      toast.success('Mid-term marks updated successfully');
      
      // Don't reload here - let the component reload if needed
      // The cache is cleared so next load will fetch fresh data
      
      return updatedMarks;
    } catch (error) {
      setError('updating', error.message);
      toast.error(`Failed to update marks: ${error.message}`);
      throw error;
    } finally {
      clearLoading('updating');
    }
  }, [setLoading, clearError, setError, clearLoading]);

  // Update attendance
  const updateAttendance = useCallback(async (studentId, subjectId, attendanceData) => {
    setLoading('updating', true);
    clearError('updating');

    try {
      const response = await academicService.updateAttendance(studentId, subjectId, attendanceData);
      
      // Update local attendance data
      const updatedAttendance = state.attendance.map(att => 
        att.subjectId === subjectId 
          ? { ...att, ...response.data.attendance }
          : att
      );
      
      dispatch({ type: ACTIONS.UPDATE_ATTENDANCE, payload: updatedAttendance });
      
      // Clear cache to force refresh
      const cacheKey = getCacheKey(studentId, 'attendance');
      setCachedData(cacheKey, updatedAttendance);
      
      toast.success('Attendance updated successfully');
      return response.data;
    } catch (error) {
      setError('updating', error.message);
      toast.error(`Failed to update attendance: ${error.message}`);
      throw error;
    } finally {
      clearLoading('updating');
    }
  }, [state.attendance, getCacheKey, setCachedData, setLoading, clearError, setError, clearLoading]);

  // Delete attendance
  const deleteAttendance = useCallback(async (studentId, subjectId) => {
    setLoading('updating', true);
    clearError('updating');

    try {
      console.log('🗑️ Deleting attendance:', { studentId, subjectId });
      await academicService.deleteAttendance(studentId, subjectId);
      
      // Remove from local state
      const updatedAttendance = state.attendance.filter(att => att.subjectId !== subjectId);
      dispatch({ type: ACTIONS.UPDATE_ATTENDANCE, payload: updatedAttendance });
      
      // Clear cache and reload
      const cacheKey = getCacheKey(studentId, 'attendance');
      setCachedData(cacheKey, updatedAttendance);
      
      // Reload to ensure we have latest data
      await loadAttendance(studentId);
      
      toast.success('Attendance deleted successfully');
      return true;
    } catch (error) {
      setError('updating', error.message);
      toast.error(`Failed to delete attendance: ${error.message}`);
      throw error;
    } finally {
      clearLoading('updating');
    }
  }, [state.attendance, getCacheKey, setCachedData, setLoading, clearError, setError, clearLoading, loadAttendance]);

  // Update debarment status
  const updateDebarmentStatus = useCallback(async (studentId, subject, isDebarred, reason = null) => {
    setLoading('updating', true);
    clearError('updating');

    try {
      const response = await academicService.updateStudentDebarment(studentId, subject, isDebarred, reason);
      
      // Update local debarment data
      const updatedDebarments = {
        ...state.debarments,
        manualDebarments: {
          ...state.debarments.manualDebarments,
          [subject]: {
            isDebarred,
            reason: reason || (isDebarred ? 'Manual debarment by faculty' : 'Manual override by faculty'),
            updatedAt: new Date().toISOString()
          }
        }
      };
      
      dispatch({ type: ACTIONS.UPDATE_DEBARMENTS, payload: updatedDebarments });
      
      // Clear cache to force refresh
      const cacheKey = getCacheKey(studentId, 'debarments');
      setCachedData(cacheKey, updatedDebarments);
      
      toast.success(`Student ${isDebarred ? 'debarred from' : 'undebarred from'} ${subject}`);
      return response.data;
    } catch (error) {
      setError('updating', error.message);
      toast.error(`Failed to update debarment: ${error.message}`);
      throw error;
    } finally {
      clearLoading('updating');
    }
  }, [state.debarments, getCacheKey, setCachedData, setLoading, clearError, setError, clearLoading]);

  // Load all academic data for a student
  const loadAllAcademicData = useCallback(async (studentId, academicYear = null, semester = null) => {
    console.log(`🎓 Loading all academic data for student ID: ${studentId}, Year: ${academicYear}, Semester: ${semester}`);
    try {
      const results = await Promise.allSettled([
        loadAcademicRecord(studentId, academicYear, semester),
        loadMidTermMarks(studentId, academicYear, semester),
        loadAttendance(studentId, academicYear, semester),
        loadDebarments(studentId)
      ]);
      
      // Log results for debugging
      results.forEach((result, index) => {
        const dataTypes = ['Academic Record', 'Mid-term Marks', 'Attendance', 'Debarments'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${dataTypes[index]} loaded successfully`);
        } else {
          console.log(`❌ ${dataTypes[index]} failed to load:`, result.reason);
        }
      });
      
    } catch (error) {
      console.error('Failed to load some academic data:', error);
    }
  }, [loadAcademicRecord, loadMidTermMarks, loadAttendance, loadDebarments]);

  // Create default attendance structure for a student
  const createDefaultAttendance = useCallback((studentId, academicYear) => {
    console.log(`📅 Creating default attendance for student: ${studentId}, Year: ${academicYear}`);
    
    // Default subjects based on academic year
    const defaultSubjects = {
      1: ['CS101', 'CS102', 'MATH101', 'PHY101', 'ENG101'],
      2: ['CS201', 'CS202', 'CS203', 'MATH201', 'STAT201'],
      3: ['CS301', 'CS302', 'CS303', 'CS304', 'CS305'],
      4: ['CS401', 'CS402', 'CS403', 'CS404']
    };
    
    const subjectNames = {
      'CS101': 'Programming Fundamentals',
      'CS102': 'Digital Logic Design',
      'MATH101': 'Engineering Mathematics I',
      'PHY101': 'Engineering Physics',
      'ENG101': 'Technical Communication',
      'CS201': 'Data Structures',
      'CS202': 'Object Oriented Programming',
      'CS203': 'Computer Organization',
      'MATH201': 'Discrete Mathematics',
      'STAT201': 'Probability and Statistics',
      'CS301': 'Algorithms',
      'CS302': 'Database Systems',
      'CS303': 'Operating Systems',
      'CS304': 'Computer Networks',
      'CS305': 'Software Engineering',
      'CS401': 'Machine Learning',
      'CS402': 'Compiler Design',
      'CS403': 'Distributed Systems',
      'CS404': 'Capstone Project'
    };
    
    const subjects = defaultSubjects[academicYear] || defaultSubjects[1];
    const attendanceData = subjects.map(subjectCode => ({
      _id: `${studentId}-${subjectCode}-attendance`,
      subjectId: subjectCode,
      subjectCode,
      subjectName: subjectNames[subjectCode] || subjectCode,
      attendedClasses: 0,
      totalClasses: 0,
      percentage: 0,
      isDebarred: false,
      lastUpdated: new Date().toISOString()
    }));
    
    console.log(`📅 Created ${attendanceData.length} default attendance records:`, attendanceData);
    return attendanceData;
  }, []);

  // Create default marks structure for a student
  const createDefaultMarks = useCallback((studentId, academicYear) => {
    console.log(`📊 Creating default marks for student: ${studentId}, Year: ${academicYear}`);
    
    // Default subjects based on academic year and department
    const defaultSubjects = {
      1: [
        { subjectCode: 'CS101', subjectName: 'Programming Fundamentals', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS102', subjectName: 'Digital Logic Design', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'MATH101', subjectName: 'Engineering Mathematics I', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'PHY101', subjectName: 'Engineering Physics', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'ENG101', subjectName: 'Technical Communication', maxMarks: 100, obtainedMarks: 0 }
      ],
      2: [
        { subjectCode: 'CS201', subjectName: 'Data Structures', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS202', subjectName: 'Object Oriented Programming', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS203', subjectName: 'Computer Organization', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'MATH201', subjectName: 'Discrete Mathematics', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'STAT201', subjectName: 'Probability and Statistics', maxMarks: 100, obtainedMarks: 0 }
      ],
      3: [
        { subjectCode: 'CS301', subjectName: 'Algorithms', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS302', subjectName: 'Database Systems', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS303', subjectName: 'Operating Systems', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS304', subjectName: 'Computer Networks', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS305', subjectName: 'Software Engineering', maxMarks: 100, obtainedMarks: 0 }
      ],
      4: [
        { subjectCode: 'CS401', subjectName: 'Machine Learning', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS402', subjectName: 'Compiler Design', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS403', subjectName: 'Distributed Systems', maxMarks: 100, obtainedMarks: 0 },
        { subjectCode: 'CS404', subjectName: 'Capstone Project', maxMarks: 100, obtainedMarks: 0 }
      ]
    };
    
    const subjects = defaultSubjects[academicYear] || defaultSubjects[1];
    const marksWithIds = subjects.map((subject, index) => ({
      ...subject,
      _id: `${studentId}-${subject.subjectCode}`,
      studentId,
      academicYear,
      semester: 'Current',
      examType: 'midterm',
      examDate: new Date().toISOString(),
      grade: 'N/A',
      isEditable: true
    }));
    
    console.log(`📊 Created ${marksWithIds.length} default marks:`, marksWithIds);
    return marksWithIds;
  }, []);

  // Set unsaved changes
  const setUnsavedChanges = useCallback((hasChanges) => {
    dispatch({ type: ACTIONS.SET_UNSAVED_CHANGES, payload: hasChanges });
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_CACHE });
  }, []);

  // Get complete student academic data
  const getStudentAcademicData = useCallback(async (studentId) => {
    console.log(`📚 Getting complete academic data for student: ${studentId}`);
    
    try {
      // Load all academic data
      const [marks, attendance, debarments] = await Promise.allSettled([
        loadMidTermMarks(studentId),
        loadAttendance(studentId),
        loadDebarments(studentId)
      ]);
      
      // Process results
      const academicData = {
        marks: {
          subjects: {}
        },
        attendance: {
          subjects: {}
        },
        debarment: {
          subjects: {}
        }
      };
      
      // Process marks data - Load from localStorage for this specific student
      const marksKey = `marks_${studentId}`;
      const storedMarks = JSON.parse(localStorage.getItem(marksKey) || '{}');
      
      if (Object.keys(storedMarks).length > 0) {
        // Use stored marks data for this student
        Object.entries(storedMarks).forEach(([subjectCode, mark]) => {
          academicData.marks.subjects[mark.subjectName || subjectCode] = {
            obtainedMarks: mark.obtainedMarks || 0,
            totalMarks: mark.maxMarks || 100
          };
        });
      } else if (marks.status === 'fulfilled' && marks.value) {
        // Fallback to API data if no stored data
        marks.value.forEach(mark => {
          academicData.marks.subjects[mark.subjectName || mark.subjectCode] = {
            obtainedMarks: mark.obtainedMarks || 0,
            totalMarks: mark.maxMarks || 100
          };
        });
      }
      
      // Process attendance data - Load from localStorage for this specific student
      const attendanceKey = `attendance_${studentId}`;
      const storedAttendance = JSON.parse(localStorage.getItem(attendanceKey) || '{}');
      
      if (Object.keys(storedAttendance).length > 0) {
        // Use stored attendance data for this student
        Object.entries(storedAttendance).forEach(([subjectCode, att]) => {
          academicData.attendance.subjects[att.subjectName || subjectCode] = {
            attended: att.attendedClasses || 0,
            total: att.totalClasses || 0,
            percentage: att.percentage || 0
          };
        });
      } else if (attendance.status === 'fulfilled' && attendance.value) {
        // Fallback to API data if no stored data
        attendance.value.forEach(att => {
          academicData.attendance.subjects[att.subjectName || att.subjectCode] = {
            attended: att.attendedClasses || 0,
            total: att.totalClasses || 0,
            percentage: att.percentage || 0
          };
        });
      }
      
      // Process debarment data - Load from localStorage for this specific student
      const debarmentKey = `debarment_${studentId}`;
      const storedDebarment = JSON.parse(localStorage.getItem(debarmentKey) || '{}');
      
      if (storedDebarment.subjects && Object.keys(storedDebarment.subjects).length > 0) {
        // Use stored debarment data for this student
        academicData.debarment.subjects = storedDebarment.subjects;
      } else if (debarments.status === 'fulfilled' && debarments.value && debarments.value.length > 0) {
        // Fallback to API data if no stored data
        debarments.value.forEach(debarment => {
          const subjectName = debarment.subjectName || debarment.subject || 'General';
          academicData.debarment.subjects[subjectName] = {
            isDebarred: debarment.isDebarred || false,
            eligibleForExams: !debarment.isDebarred,
            reason: debarment.reason || ''
          };
        });
      }
      
      console.log(`📚 Complete academic data for student ${studentId}:`, academicData);
      console.log(`📚 Marks loaded from localStorage:`, Object.keys(storedMarks).length > 0 ? 'YES' : 'NO');
      console.log(`📚 Attendance loaded from localStorage:`, Object.keys(storedAttendance).length > 0 ? 'YES' : 'NO');
      console.log(`📚 Debarment loaded from localStorage:`, storedDebarment.subjects ? 'YES' : 'NO');
      return academicData;
      
    } catch (error) {
      console.error('Failed to get student academic data:', error);
      throw error;
    }
  }, [loadMidTermMarks, loadAttendance, loadDebarments]);

  // Update student marks
  const updateStudentMarks = useCallback(async (studentId, marksData, studentAcademicYear = null) => {
    console.log(`📊 Updating marks for student: ${studentId}`, marksData);
    
    try {
      // Convert marks data to API format (only fields backend expects)
      const marksArray = Object.entries(marksData.subjects || {}).map(([subjectName, marks]) => {
        const obtainedMarks = parseFloat(marks.obtainedMarks) || 0;
        const totalMarks = parseFloat(marks.totalMarks) || 100;
        
        return {
          subjectCode: subjectName.replace(/\s+/g, '').toUpperCase(),
          subjectName: subjectName.trim(),
          obtainedMarks: obtainedMarks,
          maxMarks: totalMarks,
          examDate: new Date().toISOString()
        };
      });
      
      console.log(`📊 Converted marks array:`, marksArray);
      console.log(`📊 Marks count: ${marksArray.length}`);
      
      // Allow empty array (for deleting all marks)
      // if (marksArray.length === 0) {
      //   throw new Error('No marks data to update');
      // }
      
      // Call backend API to save marks
      try {
        // Get student's academic year (1, 2, 3, 4 - year of study, not calendar year)
        // Priority: 1. Passed parameter, 2. localStorage, 3. Default to 1
        let academicYear = studentAcademicYear;
        
        if (!academicYear) {
          const studentData = JSON.parse(localStorage.getItem(`student_${studentId}`) || '{}');
          academicYear = studentData.academicYear || 1;
        }
        
        console.log(`📊 Calling API to save marks for student ${studentId}, year ${academicYear} (passed: ${studentAcademicYear})`);
        
        // Call the API
        const response = await academicService.updateMidTermMarks(studentId, marksArray, academicYear, 'current');
        
        console.log(`📊 API response:`, response);
        
        // Also store in localStorage as backup
        const marksKey = `marks_${studentId}`;
        
        // IMPORTANT: Replace entire localStorage data (don't merge with old data)
        // This ensures deleted subjects are removed from localStorage too
        const newData = {};
        marksArray.forEach(record => {
          newData[record.subjectCode] = record;
        });
        
        localStorage.setItem(marksKey, JSON.stringify(newData));
        console.log(`📊 Marks data replaced in localStorage for student ${studentId}`);
        
      } catch (error) {
        console.error('❌ Failed to save marks data to API:', error);
        console.error('❌ Error details:', error.response?.data || error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('Error details:', error.response?.data || error.message);
        throw new Error('Failed to save marks data: ' + (error.response?.data?.error?.message || error.message));
      }
      
      console.log(`📊 Marks updated successfully`);
      return true;
    } catch (error) {
      console.error('Failed to update student marks:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  }, []);

  // Update student attendance
  const updateStudentAttendance = useCallback(async (studentId, attendanceData, studentAcademicYear = null) => {
    console.log(`📅 Updating attendance for student: ${studentId}`, attendanceData);
    
    try {
      // Convert attendance data to API format
      const attendanceArray = Object.entries(attendanceData.subjects || {}).map(([subjectName, attendance]) => {
        const attendedClasses = parseInt(attendance.attended) || 0;
        const totalClasses = parseInt(attendance.total) || 0;
        const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
        
        return {
          subjectName: subjectName.trim(),
          subjectCode: subjectName.replace(/\s+/g, '').toUpperCase(),
          attendedClasses: attendedClasses,
          totalClasses: totalClasses,
          percentage: percentage,
          studentId: studentId,
          academicYear: new Date().getFullYear(),
          semester: 'current',
          isDebarred: percentage < 75 // Auto-calculate debarment based on 75% rule
        };
      });
      
      console.log(`📅 Converted attendance array:`, attendanceArray);
      console.log(`📅 Attendance count: ${attendanceArray.length}`);
      
      // Allow empty array (for deleting all attendance)
      // if (attendanceArray.length === 0) {
      //   throw new Error('No attendance data to update');
      // }
      
      // Call backend API to save attendance using bulk update
      try {
        // Get student's academic year (1, 2, 3, 4 - year of study, not calendar year)
        // Priority: 1. Passed parameter, 2. localStorage, 3. Default to 1
        let academicYear = studentAcademicYear;
        
        if (!academicYear) {
          const studentData = JSON.parse(localStorage.getItem(`student_${studentId}`) || '{}');
          academicYear = studentData.academicYear || 1;
        }
        
        console.log(`📅 Calling API to save attendance for student ${studentId}, year ${academicYear} (passed: ${studentAcademicYear})`);
        
        // Prepare bulk update format
        const bulkUpdates = attendanceArray.map(record => ({
          studentId: studentId,
          subjectId: record.subjectCode,
          attendedClasses: record.attendedClasses,
          totalClasses: record.totalClasses
        }));
        
        // Call the bulk update API
        const response = await academicService.bulkUpdateAttendance(bulkUpdates, academicYear, 'current');
        
        console.log(`📅 API response:`, response);
        
        // Also store in localStorage as backup
        const attendanceKey = `attendance_${studentId}`;
        
        // IMPORTANT: Replace entire localStorage data (don't merge with old data)
        // This ensures deleted attendance records are removed from localStorage too
        const newData = {};
        attendanceArray.forEach(record => {
          newData[record.subjectCode] = record;
        });
        
        localStorage.setItem(attendanceKey, JSON.stringify(newData));
        console.log(`📅 Attendance data replaced in localStorage for student ${studentId}`);
        
        // IMPORTANT: Clear ALL cache to force fresh fetch
        console.log('📅 Clearing all cache for student:', studentId);
        dispatch({ type: ACTIONS.CLEAR_CACHE });
        
      } catch (error) {
        console.error('Failed to save attendance data to API:', error);
        console.error('Error details:', error.response?.data || error.message);
        throw new Error('Failed to save attendance data: ' + (error.response?.data?.error?.message || error.message));
      }
      
      console.log(`📅 Attendance updated successfully`);
      return true;
    } catch (error) {
      console.error('Failed to update student attendance:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  }, []);

  // Update student debarment
  const updateStudentDebarment = useCallback(async (studentId, debarmentData) => {
    console.log(`⚠️ Updating debarment for student: ${studentId}`, debarmentData);
    
    try {
      // Call backend API to save debarment status for each subject
      const debarmentPromises = Object.entries(debarmentData.subjects || {}).map(async ([subjectName, debarment]) => {
        const subjectCode = subjectName.replace(/\s+/g, '').toUpperCase();
        const isDebarred = debarment.isDebarred === true;
        const reason = debarment.reason || 'Manual debarment by faculty';
        
        console.log(`⚠️ Updating debarment for subject ${subjectCode}: ${isDebarred ? 'DEBARRED' : 'CLEARED'}`);
        
        try {
          const response = await academicService.updateStudentDebarment(studentId, subjectCode, isDebarred, reason);
          console.log(`⚠️ Debarment updated for ${subjectCode}:`, response);
          return response;
        } catch (error) {
          console.error(`Failed to update debarment for ${subjectCode}:`, error);
          throw error;
        }
      });
      
      // Wait for all debarment updates to complete
      await Promise.all(debarmentPromises);
      
      // Also store in localStorage as backup
      const debarmentKey = `debarment_${studentId}`;
      const debarmentRecord = {
        studentId,
        subjects: debarmentData.subjects || {},
        updatedAt: new Date().toISOString(),
        updatedBy: 'faculty'
      };
      
      localStorage.setItem(debarmentKey, JSON.stringify(debarmentRecord));
      console.log(`⚠️ Debarment data also stored locally as backup for student ${studentId}`);
      
      // IMPORTANT: Clear ALL cache to force fresh fetch
      console.log('⚠️ Clearing all cache for student:', studentId);
      dispatch({ type: ACTIONS.CLEAR_CACHE });
      
      console.log(`⚠️ Debarment status updated successfully`);
      return true;
    } catch (error) {
      console.error('Failed to update student debarment:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw new Error('Failed to save debarment data: ' + (error.response?.data?.error?.message || error.message));
    }
  }, []);

  // Context value
  const value = {
    // State
    ...state,
    
    // Student management
    selectStudent,
    clearSelectedStudent,
    
    // Sidebar management
    openSidebar,
    closeSidebar,
    setActiveTab,
    
    // Data loading
    loadAcademicRecord,
    loadMidTermMarks,
    loadAttendance,
    loadDebarments,
    loadAllAcademicData,
    getStudentAcademicData,
    
    // Data updating
    updateMidTermMarks,
    updateAttendance,
    deleteAttendance,
    updateDebarmentStatus,
    updateStudentMarks,
    updateStudentAttendance,
    updateStudentDebarment,
    
    // UI state
    setUnsavedChanges,
    
    // Error management
    clearError,
    clearAllErrors,
    
    // Cache management
    clearCache,
    
    // Data creation
    createDefaultMarks,
    createDefaultAttendance,
    
    // Utility functions
    calculateGrade: academicService.calculateGrade,
    calculateAttendancePercentage: academicService.calculateAttendancePercentage,
    getAttendanceStatus: academicService.getAttendanceStatus,
    isDebarred: academicService.isDebarred
  };

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  );
};

// Hook to use academic context
export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
};

export default AcademicContext;