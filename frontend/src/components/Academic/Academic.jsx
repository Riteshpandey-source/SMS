import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  Edit3,
  Save,
  Plus,
  Trash2,
  Search,
  Filter,
  UserCheck,
  Clock
} from 'lucide-react';
import AcademicOverview from './AcademicOverview';
import AttendanceCard from './AttendanceCard';
import MarksCard from './MarksCard';
import YearFilter from '../Common/YearFilter';
import AccessIndicator from '../Common/AccessIndicator';
import { mockAcademicRecord, mockParentNotifications } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';
import { useYear } from '../../contexts/YearContext';
import { facultyService } from '../../services/facultyService';
import academicService from '../../services/academicService';
import examMarksService from '../../services/examMarksService';
import toast from 'react-hot-toast';
import StudentExamMarksView from '../Student/StudentExamMarksView';

const Academic = ({ initialSection = 'overview', onNavigate }) => {
  const { user } = useAuth();
  const { 
    currentYearFilter, 
    getYearFilterForAPI, 
    accessibleYears,
    hasYearAccess,
    isStudent,
    isFaculty,
    isAdmin
  } = useYear();
  
  const [activeTab, setActiveTab] = useState(initialSection);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentAcademicData, setStudentAcademicData] = useState(null);

  // Update activeTab when initialSection prop changes
  useEffect(() => {
    setActiveTab(initialSection);
  }, [initialSection]);

  // Fetch data based on user role and year filter
  useEffect(() => {
    console.log('🔍 Academic useEffect triggered:', { user, isFaculty, isStudent });
    
    if (isFaculty) {
      console.log('👨‍🏫 Faculty detected, fetching department students');
      fetchDepartmentStudents();
    } else if (isStudent) {
      console.log('👨‍🎓 Student detected, fetching academic data');
      fetchStudentAcademicData();
    } else {
      console.log('⚠️ No role detected or user not loaded');
    }
  }, [user, currentYearFilter, isFaculty, isStudent]);

  // Auto-refresh for students - fetch latest data every 2 minutes
  useEffect(() => {
    if (!isStudent) return;

    console.log('🔄 Setting up auto-refresh for student academic data (2 min interval)');
    
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing student academic data...');
      fetchStudentAcademicData();
    }, 120000); // 2 minutes (120 seconds)

    // Cleanup interval on unmount
    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [isStudent, user]); // Re-setup if user changes

  const fetchDepartmentStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching department students...');
      
      // Get year filter for API
      const yearFilter = getYearFilterForAPI();
      const params = yearFilter ? { academicYear: yearFilter } : {};
      
      const response = await facultyService.getDepartmentStudents(params);
      console.log('Students response:', response);
      
      // Filter students by accessible years on frontend as well
      let filteredStudents = response.users || [];
      if (isFaculty && accessibleYears.length > 0) {
        filteredStudents = filteredStudents.filter(student => 
          hasYearAccess(student.academicYear)
        );
      }
      
      setStudents(filteredStudents);
      console.log('Students set:', filteredStudents);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to load students data');
      
      // Add mock data filtered by accessible years
      const mockStudents = [
        {
          _id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          academicYear: 1
        },
        {
          _id: '2', 
          name: 'Jane Smith',
          email: 'jane@example.com',
          academicYear: 2
        },
        {
          _id: '3',
          name: 'Bob Johnson', 
          email: 'bob@example.com',
          academicYear: 1
        },
        {
          _id: '4',
          name: 'Alice Wilson',
          email: 'alice@example.com',
          academicYear: 3
        }
      ];
      
      // Filter mock students by accessible years
      let filteredMockStudents = mockStudents;
      if (isFaculty && accessibleYears.length > 0) {
        filteredMockStudents = mockStudents.filter(student => 
          hasYearAccess(student.academicYear)
        );
      }
      
      setStudents(filteredMockStudents);
      console.log('Using filtered mock students:', filteredMockStudents);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAcademicData = async () => {
    // Check if user is loaded (use user.id, not user._id)
    const userId = user?._id || user?.id;
    if (!user || !userId) {
      console.log('📚 User not loaded yet, skipping fetch. User:', user);
      return;
    }
    
    console.log('✅ User loaded successfully:', { id: userId, name: user.name, role: user.role });
    
    try {
      setLoading(true);
      console.log('📚 Fetching student academic data for user:', userId);
      
      // Fetch marks, attendance, and debarments
      // Don't pass academicYear to get latest record by default
      const [marksRes, attendanceRes, debarmentRes] = await Promise.allSettled([
        examMarksService.getStudentMarks(userId), // Fetch from examMarks collection
        academicService.getAttendance(userId, null, null), // null = fetch latest
        academicService.getStudentDebarments(userId)
      ]);
      
      console.log('📚 Marks response:', marksRes);
      console.log('📚 Attendance response:', attendanceRes);
      console.log('📚 Debarment response:', debarmentRes);
      
      // Process marks
      let marks = [];
      if (marksRes.status === 'fulfilled') {
        const marksData = marksRes.value?.data || {};
        marks = marksData.data || marksData.midTermMarks || marksData.marks || [];
      }
      
      // Process attendance
      const attendance = attendanceRes.status === 'fulfilled' && attendanceRes.value?.data?.attendance
        ? attendanceRes.value.data.attendance
        : [];
      
      // Process debarments
      const debarments = debarmentRes.status === 'fulfilled' && debarmentRes.value?.data
        ? debarmentRes.value.data
        : { isDebarred: false, debarredSubjects: [], manualDebarments: {} };
      
      // Calculate overall attendance
      const overallAttendance = attendance.length > 0
        ? attendance.reduce((sum, att) => sum + (att.percentage || 0), 0) / attendance.length
        : 0;
      
      // Build academic record
      const academicData = {
        studentId: userId,
        academicYear: user.academicYear,
        semester: 'current',
        department: user.department,
        cgpa: 0,
        sgpa: 0,
        overallAttendance: overallAttendance,
        isDebarred: debarments.isDebarred || false,
        debarredSubjects: debarments.debarredSubjects || [],
        manualDebarments: debarments.manualDebarments || {},
        midTermMarks: marks,
        attendance: attendance
      };
      
      console.log('📚 Processed academic data:', academicData);
      setStudentAcademicData(academicData);
      
    } catch (error) {
      console.error('❌ Failed to fetch student academic data:', error);
      toast.error('Failed to load academic data');
      // Fallback to mock data
      setStudentAcademicData(mockAcademicRecord);
    } finally {
      setLoading(false);
    }
  };

  // For student/parent - use fetched data or mock data as fallback
  const academicRecord = studentAcademicData || mockAcademicRecord;
  const parentNotifications = mockParentNotifications;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return AlertTriangle;
      case 'high':
        return AlertTriangle;
      case 'medium':
        return Calendar;
      default:
        return BookOpen;
    }
  };

  // Faculty CRUD Component
  const FacultyAcademicCRUD = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [attendanceEditValue, setAttendanceEditValue] = useState('');
    const [editingTotalMarks, setEditingTotalMarks] = useState(null);
    const [totalMarksEditValue, setTotalMarksEditValue] = useState('');
    const [studentMarks, setStudentMarks] = useState({});
    const [studentAttendanceData, setStudentAttendanceData] = useState({});
    const [manualDebarments, setManualDebarments] = useState({}); // Faculty can manually debar/undebar students

    // Dynamic subjects based on faculty department and preferences
    const [subjects, setSubjects] = useState([]);
    const [customSubject, setCustomSubject] = useState('');
    const [showAddSubject, setShowAddSubject] = useState(false);
    // Simple custom faculty mode - no complex templates
    const [showCustomSettings, setShowCustomSettings] = useState(false);

    // Get subjects based on faculty department
    const getDepartmentSubjects = (department) => {
      const subjectsByDepartment = {
        'CS': ['CS101', 'CS102', 'CS201', 'CS202', 'CS301', 'CS302'],
        'ECE': ['ECE101', 'ECE102', 'ECE201', 'ECE202', 'ECE301'],
        'ME': ['ME101', 'ME102', 'ME201', 'ME202', 'ME301'],
        'EE': ['EE101', 'EE102', 'EE201', 'EE202', 'EE301'],
        'IT': ['IT101', 'IT102', 'IT201', 'IT202', 'IT301'],
        'CSAI': ['CSAI101', 'CSAI102', 'CSAI201', 'CSAI202', 'CSAI301'],
        'AIDS': ['AIDS101', 'AIDS102', 'AIDS201', 'AIDS202', 'AIDS301'],
        'CIVIL': ['CIVIL101', 'CIVIL102', 'CIVIL201', 'CIVIL202', 'CIVIL301']
      };
      return subjectsByDepartment[department] || ['SUB101', 'SUB102', 'SUB201', 'SUB202', 'SUB301'];
    };

    // Simple custom faculty mode - no complex templates needed

    // Get default total marks based on subject type and faculty preferences
    // Simple default total marks - faculty can edit each subject individually
    const getDefaultTotalMarks = (subject) => {
      // Simple defaults - faculty can edit each subject's total marks individually
      if (subject.includes('LAB') || subject.includes('PRAC')) {
        return 50;
      } else if (subject.includes('PROJ') || subject.includes('PROJECT')) {
        return 200;
      } else if (subject.includes('VIVA') || subject.includes('ORAL')) {
        return 25;
      } else if (subject.includes('ASSIGN') || subject.includes('HOMEWORK')) {
        return 20;
      }
      return 100; // Default for theory subjects - faculty can edit this
    };

    // Initialize subjects based on user's department
    useEffect(() => {
      if (user?.department) {
        const departmentSubjects = getDepartmentSubjects(user.department);
        setSubjects(departmentSubjects);
      } else {
        setSubjects(['SUB101', 'SUB102', 'SUB201', 'SUB202', 'SUB301']);
      }
    }, [user?.department]);



    console.log('FacultyAcademicCRUD rendering');
    console.log('Students in CRUD:', students);
    console.log('Student marks:', studentMarks);

    // Initialize marks and attendance for all students (including new ones)
    useEffect(() => {
      if (students.length > 0) {
        // Initialize marks
        setStudentMarks(prevMarks => {
          const updatedMarks = { ...prevMarks };
          let hasChanges = false;
          
          students.forEach(student => {
            const studentId = student._id || student.id || `student-${Math.random().toString(36).substr(2, 9)}`;
            if (!updatedMarks[studentId]) {
              updatedMarks[studentId] = {};
              subjects.forEach(subject => {
                // Generate consistent marks based on student ID and subject to avoid random changes
                const safeStudentId = studentId.toString();
                const seed = safeStudentId.slice(-2) + subject.slice(-2);
                const totalMarks = getDefaultTotalMarks(subject);
                const obtainedMarks = Math.min(parseInt(seed, 16) % 40 + 40, totalMarks); // Ensure obtained <= total
                updatedMarks[studentId][subject] = {
                  obtained: obtainedMarks,
                  total: totalMarks,
                  percentage: Math.round((obtainedMarks / totalMarks) * 100)
                };
              });
              hasChanges = true;
            }
          });
          
          return hasChanges ? updatedMarks : prevMarks;
        });

        // Initialize attendance data
        setStudentAttendanceData(prevAttendance => {
          const updatedAttendance = { ...prevAttendance };
          let hasChanges = false;
          
          students.forEach(student => {
            const studentId = student._id || student.id || `student-${Math.random().toString(36).substr(2, 9)}`;
            if (!updatedAttendance[studentId]) {
              updatedAttendance[studentId] = {};
              subjects.forEach(subject => {
                // Generate consistent attendance based on student ID and subject
                const safeStudentId = studentId.toString();
                const seed = safeStudentId.slice(-2) + subject.slice(-2);
                const baseAttendance = (parseInt(seed, 16) % 30) + 70; // 70-100% attendance
                updatedAttendance[studentId][subject] = baseAttendance;
              });
              hasChanges = true;
            }
          });
          
          return hasChanges ? updatedAttendance : prevAttendance;
        });
      }
    }, [students.length]); // Only depend on students length, not the array itself

    // Filter students based on role
    const filteredStudents = students.filter(student => {
      // Role-based filtering first
      const studentId = student._id || student.id;
      if (user?.role === 'student') {
        // Students only see their own data
        if (studentId !== user._id) return false;
      } else if (user?.role === 'parent') {
        // Parents only see their child's data (assuming parent has childId)
        if (studentId !== user.childId) return false;
      }
      // Faculty see all students in their department (already filtered by fetchDepartmentStudents)
      
      // Then apply search and year filters
      const matchesSearch = !searchTerm || 
        student.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = currentYearFilter === 'all' || 
        student.academicYear === parseInt(currentYearFilter);
      return matchesSearch && matchesYear;
    });

    // Get marks for a specific student (read-only, no state updates during render)
    const getStudentMarks = (studentId) => {
      return studentMarks[studentId] || {};
    };

    // Get marks details for display
    const getMarksDetails = (studentId, subject) => {
      const marks = getStudentMarks(studentId);
      const subjectMarks = marks[subject];
      
      if (typeof subjectMarks === 'object' && subjectMarks !== null) {
        return {
          obtained: subjectMarks.obtained || 0,
          total: subjectMarks.total || 100,
          percentage: subjectMarks.percentage || 0
        };
      } else {
        // Handle legacy format (just number)
        const obtainedMarks = subjectMarks || 0;
        return {
          obtained: obtainedMarks,
          total: 100,
          percentage: obtainedMarks
        };
      }
    };

    // Get debarment status for a specific student and subject
    const getDebarmentStatus = (studentId, subject) => {
      // Check manual debarment first (faculty override)
      const manualStatus = manualDebarments[`${studentId}-${subject}`];
      if (manualStatus !== undefined) {
        return manualStatus; // Faculty manually set this
      }
      
      // Otherwise check attendance-based debarment
      const studentAttendance = studentAttendanceData[studentId] || {};
      const subjectAttendance = studentAttendance[subject] || 85; // Default 85% attendance
      return subjectAttendance < 75; // Below 75% attendance is debarred
    };

    // Get debarment reason for display
    const getDebarmentReason = (studentId, subject) => {
      const manualStatus = manualDebarments[`${studentId}-${subject}`];
      if (manualStatus === true) return 'Manual';
      if (manualStatus === false) return 'Override';
      
      const studentAttendance = studentAttendanceData[studentId] || {};
      const subjectAttendance = studentAttendance[subject] || 85;
      if (subjectAttendance < 75) return 'Attendance';
      
      return 'Active';
    };

    // Initialize marks for a student if they don't exist (called outside render)
    const initializeStudentMarks = (studentId) => {
      if (!studentMarks[studentId] && studentId) {
        const newMarks = {};
        subjects.forEach(subject => {
          // Generate consistent marks based on student ID and subject
          const seed = studentId.toString().slice(-2) + subject.slice(-2);
          const obtainedMarks = parseInt(seed, 16) % 40 + 40;
          const totalMarks = 100;
          newMarks[subject] = {
            obtained: obtainedMarks,
            total: totalMarks,
            percentage: Math.round((obtainedMarks / totalMarks) * 100)
          };
        });
        setStudentMarks(prev => ({
          ...prev,
          [studentId]: newMarks
        }));
      }
    };

    const handleCellEdit = (studentId, subject, marksDetail) => {
      setEditingCell(`${studentId}-${subject}`);
      setEditValue(marksDetail.obtained.toString());
    };

    const handleSaveCell = async (studentId, subject) => {
      try {
        const newValue = parseInt(editValue);
        const totalMarks = 100; // Default total marks
        if (isNaN(newValue) || newValue < 0 || newValue > totalMarks) {
          toast.error(`Please enter a valid mark (0-${totalMarks})`);
          return;
        }

        console.log(`Updating marks for student ${studentId}, subject ${subject}, new value: ${newValue}`);

        // Update local state first for immediate UI feedback
        const percentage = Math.round((newValue / totalMarks) * 100);
        
        setStudentMarks(prev => {
          const updated = {
            ...prev,
            [studentId]: {
              ...prev[studentId],
              [subject]: {
                obtained: newValue,
                total: totalMarks,
                percentage: percentage
              }
            }
          };
          console.log('Updated student marks:', updated[studentId]);
          return updated;
        });

        // Prepare API payload
        const apiPayload = {
          marks: [{ 
            subjectCode: subject, 
            subjectId: subject, // Use subjectCode as subjectId
            subjectName: `Subject ${subject}`,
            obtainedMarks: newValue, 
            maxMarks: totalMarks,
            examDate: new Date()
          }]
        };
        console.log('API Payload:', apiPayload);

        // Call API to update marks in backend
        try {
          await facultyService.updateMidTermMarks(studentId, apiPayload);
          toast.success(`Marks updated for ${subject}: ${newValue}`);
        } catch (apiError) {
          console.error('API Error:', apiError);
          // Show user-friendly error message
          if (apiError.response?.status === 404) {
            toast.error('Route not found - using local data only');
          } else if (apiError.response?.status === 403) {
            toast.error('Access denied - insufficient permissions');
          } else {
            toast.error('API temporarily unavailable - changes saved locally');
          }
          // Keep the local changes even if API fails
        }
        
        setEditingCell(null);
        setEditValue('');
      } catch (error) {
        console.error('Update marks error:', error);
        toast.error('Failed to update marks');
      }
    };

    const handleCancelEdit = () => {
      setEditingCell(null);
      setEditValue('');
    };



    const handleRemoveDebarment = async (studentId, subject) => {
      try {
        // Set attendance to passing grade (75%) to remove debarment
        const passingAttendance = 75;
        setStudentAttendanceData(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subject]: passingAttendance
          }
        }));

        // Call API to update attendance in backend
        try {
          await facultyService.updateStudentAttendance(studentId, subject, {
            attendedClasses: Math.ceil(passingAttendance * 0.75), // Assuming 75 total classes
            totalClasses: 75
          });
          toast.success(`Debarment removed for ${subject}. Attendance set to ${passingAttendance}%.`);
        } catch (apiError) {
          console.error('API Error:', apiError);
          if (apiError.response?.status === 404) {
            toast.error('Route not found - using local data only');
          } else {
            toast.error('API temporarily unavailable - changes saved locally');
          }
          // Keep the local changes even if API fails
        }
      } catch (error) {
        console.error('Remove debarment error:', error);
        toast.error('Failed to remove debarment');
      }
    };

    // Get attendance for a specific student and subject
    const getStudentAttendance = (studentId, subject) => {
      const attendance = studentAttendanceData[studentId] || {};
      return attendance[subject] || 85; // Default 85%
    };

    // Handle attendance editing
    const handleAttendanceEdit = (studentId, subject, currentAttendance) => {
      setEditingAttendance(`${studentId}-${subject}`);
      setAttendanceEditValue(currentAttendance.toString());
    };

    const handleSaveAttendance = async (studentId, subject) => {
      try {
        const newAttendance = parseFloat(attendanceEditValue);
        if (isNaN(newAttendance) || newAttendance < 0 || newAttendance > 100) {
          toast.error('Please enter a valid attendance percentage (0-100)');
          return;
        }

        console.log(`Updating attendance for student ${studentId}, subject ${subject}, new value: ${newAttendance}%`);

        // Update local state first for immediate UI feedback
        setStudentAttendanceData(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subject]: newAttendance
          }
        }));

        // Call API to update attendance in backend
        try {
          const totalClasses = 100; // Assuming 100 total classes for percentage calculation
          const attendedClasses = Math.round((newAttendance / 100) * totalClasses);
          
          await facultyService.updateStudentAttendance(studentId, subject, {
            attendedClasses,
            totalClasses
          });
          toast.success(`Attendance updated for ${subject}: ${newAttendance}%`);
        } catch (apiError) {
          console.error('API Error:', apiError);
          if (apiError.response?.status === 404) {
            toast.error('Route not found - using local data only');
          } else {
            toast.error('API temporarily unavailable - changes saved locally');
          }
        }
        
        setEditingAttendance(null);
        setAttendanceEditValue('');
      } catch (error) {
        console.error('Update attendance error:', error);
        toast.error('Failed to update attendance');
      }
    };

    const handleCancelAttendanceEdit = () => {
      setEditingAttendance(null);
      setAttendanceEditValue('');
    };

    // Handle total marks editing (optional feature for faculty)
    const handleTotalMarksEdit = (studentId, subject, currentTotal) => {
      console.log('Starting total marks edit:', { studentId, subject, currentTotal });
      console.log('Setting editing state to:', `${studentId}-${subject}`);
      setEditingTotalMarks(`${studentId}-${subject}`);
      setTotalMarksEditValue(currentTotal.toString());
      console.log('Total marks edit value set to:', currentTotal.toString());
    };

    const handleSaveTotalMarks = async (studentId, subject) => {
      try {
        console.log('Saving total marks:', { studentId, subject, totalMarksEditValue });
        const newTotal = parseInt(totalMarksEditValue);
        if (isNaN(newTotal) || newTotal < 1 || newTotal > 500) {
          toast.error('Please enter a valid total marks (1-500)');
          return;
        }

        console.log('New total marks:', newTotal);

        // Update local state
        setStudentMarks(prev => {
          console.log('Previous marks:', prev[studentId]?.[subject]);
          const currentMarks = prev[studentId]?.[subject];
          if (!currentMarks) {
            console.error('Current marks not found for:', studentId, subject);
            console.log('Available student marks:', prev[studentId]);
            console.log('All student marks:', Object.keys(prev));
            // Initialize marks if not found
            const defaultMarks = {
              obtained: 50,
              total: 100,
              percentage: 50
            };
            return {
              ...prev,
              [studentId]: {
                ...prev[studentId],
                [subject]: {
                  ...defaultMarks,
                  total: newTotal,
                  percentage: Math.round((defaultMarks.obtained / newTotal) * 100)
                }
              }
            };
          }
          
          const newPercentage = Math.round((currentMarks.obtained / newTotal) * 100);
          console.log('New percentage:', newPercentage);
          
          const updated = {
            ...prev,
            [studentId]: {
              ...prev[studentId],
              [subject]: {
                ...currentMarks,
                total: newTotal,
                percentage: newPercentage
              }
            }
          };
          
          console.log('Updated marks:', updated[studentId][subject]);
          return updated;
        });

        toast.success(`Total marks updated for ${subject}: ${newTotal} (Percentage recalculated)`);
        setEditingTotalMarks(null);
        setTotalMarksEditValue('');
      } catch (error) {
        console.error('Update total marks error:', error);
        toast.error('Failed to update total marks');
      }
    };

    const handleCancelTotalMarksEdit = () => {
      setEditingTotalMarks(null);
      setTotalMarksEditValue('');
    };

    // Dynamic subject management
    const handleAddSubject = () => {
      if (customSubject?.trim() && !subjects.includes(customSubject.trim().toUpperCase())) {
        const newSubject = customSubject.trim().toUpperCase();
        setSubjects(prev => [...prev, newSubject]);
        
        // Initialize marks for all students for the new subject
        setStudentMarks(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(studentId => {
            if (!updated[studentId][newSubject]) {
              updated[studentId][newSubject] = {
                obtained: 0,
                total: 100,
                percentage: 0
              };
            }
          });
          return updated;
        });

        // Initialize attendance for the new subject
        setStudentAttendanceData(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(studentId => {
            if (!updated[studentId][newSubject]) {
              updated[studentId][newSubject] = 85; // Default 85% attendance
            }
          });
          return updated;
        });

        setCustomSubject('');
        setShowAddSubject(false);
        toast.success(`Subject ${newSubject} added successfully`);
      } else {
        toast.error('Please enter a valid subject code');
      }
    };

    const handleRemoveSubject = (subjectToRemove) => {
      if (subjects.length > 1) {
        setSubjects(prev => prev.filter(subject => subject !== subjectToRemove));
        
        // Remove marks for all students for this subject
        setStudentMarks(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(studentId => {
            delete updated[studentId][subjectToRemove];
          });
          return updated;
        });

        // Remove attendance for this subject
        setStudentAttendanceData(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(studentId => {
            delete updated[studentId][subjectToRemove];
          });
          return updated;
        });

        toast.success(`Subject ${subjectToRemove} removed successfully`);
      } else {
        toast.error('Cannot remove the last subject');
      }
    };

    // Simple function - no complex template management needed

    const handleCustomMarksPreference = (subject, totalMarks) => {
      setFacultyMarksPreferences(prev => ({
        ...prev,
        [subject]: totalMarks
      }));

      // Update all students for this subject
      setStudentMarks(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(studentId => {
          if (updated[studentId][subject]) {
            const currentObtained = updated[studentId][subject].obtained;
            updated[studentId][subject] = {
              ...updated[studentId][subject],
              total: totalMarks,
              percentage: Math.round((currentObtained / totalMarks) * 100)
            };
          }
        });
        return updated;
      });

      toast.success(`Custom total marks set for ${subject}: ${totalMarks}`);
    };

    // Manual debarment management
    const handleManualDebar = async (studentId, subject) => {
      try {
        const key = `${studentId}-${subject}`;
        setManualDebarments(prev => ({
          ...prev,
          [key]: true
        }));

        // Call API to update debarment status
        try {
          await facultyService.updateStudentDebarment(studentId, subject, true);
          toast.success(`Student manually debarred from ${subject}`);
        } catch (apiError) {
          console.error('API Error:', apiError);
          if (apiError.response?.status === 404) {
            toast.error('Route not found - using local data only');
          } else {
            toast.error('API temporarily unavailable - changes saved locally');
          }
          // Keep the local changes even if API fails
        }
      } catch (error) {
        console.error('Manual debar error:', error);
        toast.error('Failed to debar student');
      }
    };

    const handleManualUndebar = async (studentId, subject) => {
      try {
        const key = `${studentId}-${subject}`;
        setManualDebarments(prev => ({
          ...prev,
          [key]: false
        }));

        // Call API to update debarment status
        try {
          await facultyService.updateStudentDebarment(studentId, subject, false);
          toast.success(`Student manually undebarred from ${subject}`);
        } catch (apiError) {
          console.error('API Error:', apiError);
          if (apiError.response?.status === 404) {
            toast.error('Route not found - using local data only');
          } else {
            toast.error('API temporarily unavailable - changes saved locally');
          }
          // Keep the local changes even if API fails
        }
      } catch (error) {
        console.error('Manual undebar error:', error);
        toast.error('Failed to undebar student');
      }
    };

    const handleToggleDebarment = (studentId, subject) => {
      const isCurrentlyDebarred = getDebarmentStatus(studentId, subject);
      if (isCurrentlyDebarred) {
        handleManualUndebar(studentId, subject);
      } else {
        handleManualDebar(studentId, subject);
      }
    };

    const getGradeColor = (marks) => {
      if (marks >= 90) return 'bg-green-100 text-green-800';
      if (marks >= 80) return 'bg-blue-100 text-blue-800';
      if (marks >= 70) return 'bg-yellow-100 text-yellow-800';
      if (marks >= 60) return 'bg-orange-100 text-orange-800';
      if (marks >= 40) return 'bg-red-100 text-red-800';
      return 'bg-gray-100 text-gray-800';
    };

    return (
      <div className="space-y-6">
        {/* Header with Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.role === 'faculty' ? 'Academic Records Management' : 'Academic Records'}
              </h2>
              {user?.role === 'faculty' && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Your Department: </span>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                      {user?.department || 'General'}
                    </span>
                    <span className="text-sm text-gray-600">Students: {filteredStudents.length}</span>
                    <span className="text-sm text-gray-600">Subjects: {subjects.length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-blue-600 font-medium">
                      Access restricted to {user?.department} department students only
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Click on obtained marks, total marks, or attendance to edit values
                  </p>
                  <div className="flex items-center space-x-4 text-xs">
                    <p className="text-red-600">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Auto-debarment: Attendance &lt;75%
                    </p>
                    <p className="text-blue-600">
                      <UserCheck className="w-3 h-3 inline mr-1" />
                      Manual debarment: Faculty override
                    </p>
                    <p className="text-green-600">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Edit attendance directly or use fix button
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {user?.role === 'faculty' && (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    Year filtering is controlled by the filter above ({students.length} students shown)
                  </div>
                </div>

                {/* Subject Management */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Subjects:</span>
                    {showAddSubject ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Subject Code (e.g., CS401)"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                          autoFocus
                        />
                        <button
                          onClick={handleAddSubject}
                          className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {setShowAddSubject(false); setCustomSubject('');}}
                          className="px-2 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddSubject(true)}
                        className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Subject
                      </button>
                    )}
                  </div>

                  {/* Simple Custom Faculty Mode */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Total Marks:</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      Click any total marks to edit (e.g., /100)
                    </span>
                    <button
                      onClick={() => setShowCustomSettings(!showCustomSettings)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      title="Show help"
                    >
                      ?
                    </button>
                  </div>
                </div>

                {/* Simple Custom Faculty Instructions */}
                {showCustomSettings && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Custom Faculty Mode:</h4>
                    <div className="text-sm text-blue-800">
                      <p>• Click on any total marks (e.g., "/100") to edit it individually</p>
                      <p>• Each subject can have different total marks as per your requirement</p>
                      <p>• Changes apply immediately and percentage is recalculated</p>
                      <p>• Example: Theory exam can be /80, Practical can be /40, Project can be /200</p>
                    </div>
                    <button
                      onClick={() => setShowCustomSettings(false)}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Got it!
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {user?.role !== 'faculty' && (
              <div className="text-sm text-gray-600">
                {user?.role === 'student' ? 'Your Academic Records' : 'Child\'s Academic Records'}
              </div>
            )}
          </div>
        </div>

        {/* Google Sheet-like Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  {subjects.map(subject => (
                    <th key={subject} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                      <div className="flex items-center justify-center space-x-1">
                        <span>{subject}</span>
                        {user?.role === 'faculty' && subjects.length > 1 && (
                          <button
                            onClick={() => handleRemoveSubject(subject)}
                            className="p-0.5 text-red-600 hover:text-red-700 hover:bg-red-100 rounded"
                            title={`Remove ${subject}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Marks (Obtained/Total) & Attendance
                      </div>
                      {user?.role === 'faculty' && (
                        <div className="text-xs text-blue-600 mt-1">
                          <Edit3 className="w-3 h-3 inline mr-1" />
                          All Values Editable
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                    Average
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const studentId = student._id || student.id || `student-${Math.random().toString(36).substr(2, 9)}`;
                  console.log('Rendering student:', student.name, 'with ID:', studentId);
                  const currentStudentMarks = getStudentMarks(studentId);
                  const marksValues = subjects.map(subject => {
                    const marksDetail = getMarksDetails(studentId, subject);
                    return marksDetail.percentage;
                  });
                  const average = marksValues.length > 0 ? Math.round(marksValues.reduce((a, b) => a + b, 0) / subjects.length) : 0;
                  const debarredSubjects = subjects.filter(subject => getDebarmentStatus(studentId, subject));
                  const isDebarred = debarredSubjects.length > 0;

                  return (
                    <tr key={`student-${studentId}`} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-200">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {student.name?.charAt(0)?.toUpperCase() || 'S'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.academicYear}
                        {student.academicYear === 1 ? 'st' : 
                         student.academicYear === 2 ? 'nd' : 
                         student.academicYear === 3 ? 'rd' : 'th'} Year
                      </td>
                      {subjects.map(subject => {
                        const cellKey = `${studentId}-${subject}`;
                        const marksDetail = getMarksDetails(studentId, subject);
                        const isEditing = editingCell === cellKey;
                        const isSubjectDebarred = getDebarmentStatus(studentId, subject);

                        return (
                          <td key={`${studentId}-${subject}-cell`} className={`px-6 py-4 whitespace-nowrap text-center border-l border-gray-200 ${isSubjectDebarred ? 'bg-red-50' : ''}`}>
                            <div className="flex flex-col items-center space-y-1">
                              {isEditing ? (
                                <div className="flex flex-col items-center space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max={marksDetail.total}
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-12 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                      autoFocus
                                      placeholder="0"
                                    />
                                    <span className="text-xs text-gray-500">/{marksDetail.total}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleSaveCell(studentId, subject)}
                                      className="p-0.5 text-green-600 hover:text-green-700"
                                    >
                                      <Save className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="p-0.5 text-red-600 hover:text-red-700"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (console.log('Checking total marks editing:', editingTotalMarks, `${studentId}-${subject}`, editingTotalMarks === `${studentId}-${subject}`), editingTotalMarks === `${studentId}-${subject}`) ? (
                                <div className="flex flex-col items-center space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-gray-500">{marksDetail.obtained}/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="500"
                                      value={totalMarksEditValue}
                                      onChange={(e) => setTotalMarksEditValue(e.target.value)}
                                      className="w-12 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                      autoFocus
                                      placeholder="100"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleSaveTotalMarks(studentId, subject)}
                                      className="p-0.5 text-green-600 hover:text-green-700"
                                    >
                                      <Save className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={handleCancelTotalMarksEdit}
                                      className="p-0.5 text-red-600 hover:text-red-700"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Marks display */}
                                  {user?.role === 'faculty' ? (
                                    <div className={`px-2 py-1 rounded-lg text-xs font-medium border border-dashed ${getGradeColor(marksDetail.percentage)}`}>
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center space-x-1">
                                          <button
                                            onClick={() => handleCellEdit(studentId, subject, marksDetail)}
                                            className="text-blue-600 hover:text-blue-700 underline"
                                            title="Click to edit obtained marks"
                                          >
                                            {marksDetail.obtained}
                                          </button>
                                          <span>/</span>
                                          <button
                                            onClick={() => {
                                              console.log('Total marks button clicked for:', studentId, subject, marksDetail.total);
                                              handleTotalMarksEdit(studentId, subject, marksDetail.total);
                                            }}
                                            className="text-blue-600 hover:text-blue-700 underline"
                                            title="Click to edit total marks"
                                          >
                                            {marksDetail.total}
                                          </button>
                                        </div>
                                        <span className="text-xs">({marksDetail.percentage}%)</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getGradeColor(marksDetail.percentage)}`}>
                                      <div className="flex flex-col items-center">
                                        <span className="font-bold">{marksDetail.obtained}/{marksDetail.total}</span>
                                        <span className="text-xs">({marksDetail.percentage}%)</span>
                                      </div>
                                    </div>
                                  )}
                                  {/* Attendance display and editing */}
                                  <div className="text-xs mt-1">
                                    {editingAttendance === `${studentId}-${subject}` ? (
                                      <div className="flex items-center justify-center space-x-1">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={attendanceEditValue}
                                          onChange={(e) => setAttendanceEditValue(e.target.value)}
                                          className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                          autoFocus
                                        />
                                        <span className="text-xs">%</span>
                                        <button
                                          onClick={() => handleSaveAttendance(studentId, subject)}
                                          className="p-0.5 text-green-600 hover:text-green-700"
                                        >
                                          <Save className="w-2 h-2" />
                                        </button>
                                        <button
                                          onClick={handleCancelAttendanceEdit}
                                          className="p-0.5 text-red-600 hover:text-red-700"
                                        >
                                          <AlertTriangle className="w-2 h-2" />
                                        </button>
                                      </div>
                                    ) : (
                                      user?.role === 'faculty' ? (
                                        <button
                                          onClick={() => handleAttendanceEdit(studentId, subject, getStudentAttendance(studentId, subject))}
                                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors border border-dashed border-blue-300 hover:border-blue-500"
                                          title="Click to edit attendance percentage"
                                        >
                                          <Edit3 className="w-2 h-2 inline mr-1" />
                                          Att: {getStudentAttendance(studentId, subject)}%
                                        </button>
                                      ) : (
                                        <span className="text-gray-500">
                                          Att: {getStudentAttendance(studentId, subject)}%
                                        </span>
                                      )
                                    )}
                                  </div>
                                  {/* Per-subject debarment status */}
                                  <div className="flex flex-col items-center space-y-1 mt-1">
                                    {isSubjectDebarred ? (
                                      <div className="flex items-center space-x-1">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          <AlertTriangle className="w-2 h-2 mr-1" />
                                          DEBARRED
                                        </span>
                                        <span className="text-xs text-red-600">
                                          ({getDebarmentReason(studentId, subject)})
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <UserCheck className="w-2 h-2 mr-1" />
                                        ACTIVE
                                      </span>
                                    )}
                                    
                                    {/* Faculty debarment controls */}
                                    {user?.role === 'faculty' && (
                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={() => handleToggleDebarment(studentId, subject)}
                                          className={`p-0.5 rounded transition-colors text-xs ${
                                            isSubjectDebarred 
                                              ? 'text-green-600 hover:text-green-700 hover:bg-green-100' 
                                              : 'text-red-600 hover:text-red-700 hover:bg-red-100'
                                          }`}
                                          title={isSubjectDebarred ? 'Remove Debarment' : 'Debar Student'}
                                        >
                                          {isSubjectDebarred ? (
                                            <UserCheck className="w-3 h-3" />
                                          ) : (
                                            <AlertTriangle className="w-3 h-3" />
                                          )}
                                        </button>
                                        {getDebarmentReason(studentId, subject) === 'Attendance' && (
                                          <button
                                            onClick={() => handleRemoveDebarment(studentId, subject)}
                                            className="p-0.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors text-xs"
                                            title="Fix Attendance (Set to 75%)"
                                          >
                                            <Clock className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-center border-l border-gray-200">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(average)}`}>
                          {average}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center space-y-1">
                          {isDebarred ? (
                            <>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Debarred
                              </span>
                              <span className="text-xs text-red-600">
                                {debarredSubjects.length} subject{debarredSubjects.length > 1 ? 's' : ''}
                              </span>
                            </>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-900">Loading Students...</p>
          </div>
        )}

        {/* Debarment Summary */}
        {!loading && filteredStudents.length > 0 && user?.role === 'faculty' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Debarment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-600">
                  {filteredStudents.reduce((count, student) => {
                    const studentId = student._id || student.id || `student-${Math.random().toString(36).substr(2, 9)}`;
                    const debarredSubjects = subjects.filter(subject => getDebarmentStatus(studentId, subject));
                    return count + debarredSubjects.length;
                  }, 0)}
                </div>
                <div className="text-sm text-red-700">Total Debarments</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-orange-600">
                  {filteredStudents.reduce((count, student) => {
                    const studentId = student._id || student.id || `student-${Math.random().toString(36).substr(2, 9)}`;
                    const attendanceDebarments = subjects.filter(subject => {
                      const reason = getDebarmentReason(studentId, subject);
                      return reason === 'Attendance';
                    });
                    return count + attendanceDebarments.length;
                  }, 0)}
                </div>
                <div className="text-sm text-orange-700">Attendance Based</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">
                  {filteredStudents.reduce((count, student) => {
                    const studentId = student._id || student.id || `student-${Math.random().toString(36).substr(2, 9)}`;
                    const manualDebarments = subjects.filter(subject => {
                      const reason = getDebarmentReason(studentId, subject);
                      return reason === 'Manual';
                    });
                    return count + manualDebarments.length;
                  }, 0)}
                </div>
                <div className="text-sm text-blue-700">Manual Override</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600">
                  {filteredStudents.filter(student => {
                    const studentId = student._id || student.id || `student-${Math.random().toString(36).substr(2, 9)}`;
                    const debarredSubjects = subjects.filter(subject => getDebarmentStatus(studentId, subject));
                    return debarredSubjects.length === 0;
                  }).length}
                </div>
                <div className="text-sm text-green-700">Active Students</div>
              </div>
            </div>
          </div>
        )}

        {!loading && filteredStudents.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">
              {user?.role === 'faculty' ? 'No Students Found' : 'No Academic Records Available'}
            </p>
            <p className="text-gray-600">
              {user?.role === 'faculty' 
                ? 'Try adjusting your search or filters' 
                : 'Academic records will appear here once available'
              }
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Debug Info:</p>
              <p>Total Students: {students.length}</p>
              <p>Filtered Students: {filteredStudents.length}</p>
              <p>User Role: {user?.role}</p>
              <p>Search Term: "{searchTerm}"</p>
              <p>Selected Year: {currentYearFilter}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Faculty gets CRUD interface, Students/Parents get read-only view
  if (isFaculty) {
    console.log('Rendering Faculty Academic Portal');
    console.log('Students data:', students);
    console.log('Loading state:', loading);
    return (
      <div className="space-y-6">
        {/* Access Indicator */}
        <AccessIndicator 
          variant="default" 
          showDetails={true} 
          showYearBreakdown={true}
        />

        {/* Academic Management Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-900">Academic Management</h1>
                <p className="text-green-700 mt-1">
                  {students.length} students in your accessible years
                  {currentYearFilter !== 'all' && (
                    <span className="ml-2">• Currently viewing {currentYearFilter}${currentYearFilter == 1 ? 'st' : currentYearFilter == 2 ? 'nd' : currentYearFilter == 3 ? 'rd' : 'th'} year</span>
                  )}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-green-600">
                  <span>• Department: {user?.department}</span>
                  <span>• {accessibleYears.length} year{accessibleYears.length !== 1 ? 's' : ''} accessible</span>
                  <span>• Full CRUD permissions</span>
                </div>
              </div>
            </div>
            
            {/* Year Filter */}
            <div className="w-48">
              <YearFilter 
                label="Filter by Year"
                size="medium"
                showAllOption={true}
                showAccessIndicator={true}
              />
            </div>
          </div>
        </div>

        <FacultyAcademicCRUD />
      </div>
    );
  }

  // Student and Parent get read-only academic data
  // If student, show their own marks view directly (simpler UX)
  if (isStudent) {
    return <StudentExamMarksView />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Academic Portal</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {user?.role === 'student' ? (
                <>
                  <GraduationCap className="w-4 h-4" />
                  <span>Student View</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Faculty View - {user?.department} Department</span>
                </>
              )}
            </div>
            {user?.role === 'student' && (
              <button
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  fetchStudentAcademicData();
                }}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh academic data"
              >
                <Clock className="w-4 h-4" />
                <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Access Indicator */}
      <AccessIndicator 
        variant="default" 
        showDetails={true} 
        showYearBreakdown={true}
      />

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { id: 'overview', title: 'Academic Overview', icon: TrendingUp, description: 'View your overall academic performance and statistics', color: 'bg-blue-500' },
          { id: 'attendance', title: 'Attendance Tracking', icon: UserCheck, description: 'Monitor your attendance across all subjects', color: 'bg-green-500' },
          { id: 'marks', title: 'Marks & Grades', icon: BookOpen, description: 'Check your marks, grades, and academic progress', color: 'bg-orange-500' }
        ].map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => {
                if (onNavigate && section.id !== 'overview') {
                  // For non-overview sections, stay in Academic component
                  setActiveTab(section.id);
                } else {
                  setActiveTab(section.id);
                }
              }}
              className={`text-left p-6 rounded-xl border-2 transition-all hover:shadow-md ${
                activeTab === section.id 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`${section.color} p-3 rounded-lg w-fit mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
              <p className="text-gray-600 text-sm">{section.description}</p>
            </button>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2 inline" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'attendance'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2 inline" />
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'marks'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2 inline" />
            My Marks
          </button>
          {user?.role === 'parent' && (
            <button
              onClick={() => setActiveTab('parent')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'parent'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4 mr-2 inline" />
              Notifications
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <AcademicOverview record={academicRecord} />
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{academicRecord.overallAttendance.toFixed(1)}%</div>
                <div className="text-sm text-blue-700">Overall Attendance</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {academicRecord.attendance.filter(att => att.isDebarred).length}
                </div>
                <div className="text-sm text-red-700">Debarred Subjects</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {academicRecord.attendance.filter(att => !att.isDebarred && att.percentage < 80).length}
                </div>
                <div className="text-sm text-yellow-700">At Risk Subjects</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {academicRecord.attendance
              .filter(attendance => {
                // Only show subjects where faculty has entered attendance data
                const hasData = attendance.totalClasses > 0;
                if (!hasData) {
                  console.log(`📅 Filtering out empty attendance: ${attendance.subjectName} (${attendance.attendedClasses}/${attendance.totalClasses})`);
                }
                return hasData;
              })
              .map((attendance) => (
                <AttendanceCard key={attendance.id} attendance={attendance} />
              ))
            }
          </div>
        </div>
      )}

      {activeTab === 'marks' && (
        isStudent ? (
          <StudentExamMarksView />
        ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Mid-Term Results Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {academicRecord.midTermMarks.reduce((sum, mark) => sum + mark.percentage, 0) / academicRecord.midTermMarks.length}%
                </div>
                <div className="text-sm text-green-700">Average Score</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.max(...academicRecord.midTermMarks.map(mark => mark.percentage))}%
                </div>
                <div className="text-sm text-blue-700">Highest Score</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.min(...academicRecord.midTermMarks.map(mark => mark.percentage))}%
                </div>
                <div className="text-sm text-orange-700">Lowest Score</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {academicRecord.midTermMarks.filter(mark => mark.percentage >= 75).length}
                </div>
                <div className="text-sm text-purple-700">Subjects Above 75%</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {academicRecord.midTermMarks.map((mark) => (
              <MarksCard key={mark.id} mark={mark} />
            ))}
          </div>
        </div>
        )
      )}

      {activeTab === 'parent' && user?.role === 'parent' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Parent Notifications</h2>
            <p className="text-gray-600 mb-6">
              Stay updated with your child's academic progress, attendance alerts, and important announcements.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {parentNotifications.filter(n => n.severity === 'critical').length}
                </div>
                <div className="text-sm text-red-700">Critical Alerts</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {parentNotifications.filter(n => n.severity === 'high').length}
                </div>
                <div className="text-sm text-orange-700">High Priority</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {parentNotifications.filter(n => n.severity === 'medium').length}
                </div>
                <div className="text-sm text-yellow-700">Medium Priority</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {parentNotifications.filter(n => !n.read).length}
                </div>
                <div className="text-sm text-blue-700">Unread</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {parentNotifications.map((notification) => {
              const SeverityIcon = getSeverityIcon(notification.severity);
              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-xl shadow-sm border-l-4 p-6 ${getSeverityColor(notification.severity)} ${
                    !notification.read ? 'ring-2 ring-blue-100' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <SeverityIcon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {notification.title}
                          </h3>
                          <p className="text-gray-700 mb-3">{notification.message}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Student: {notification.studentName}</span>
                            <span>•</span>
                            <span>{new Date(notification.timestamp).toLocaleString()}</span>
                            <span>•</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              notification.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              notification.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              notification.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {notification.severity?.toUpperCase() || 'INFO'}
                            </span>
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Academic;
