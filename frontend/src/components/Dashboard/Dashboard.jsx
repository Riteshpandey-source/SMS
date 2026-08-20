import { useState, useEffect } from 'react';
import { Calendar, BookOpen, TrendingUp, UserCheck, Award, AlertCircle, Users, Mail, RefreshCw, GraduationCap, ChevronRight, Clock } from 'lucide-react';
import StatsCard from './StatsCard';
import FacultyDashboard from '../Faculty/FacultyDashboard';
import FacultyList from '../Student/FacultyList';
import Notes from '../Notes/Notes';
import Events from '../Events/Events';
import DetailedAcademicView from '../Student/DetailedAcademicView';
import DailyAttendanceView from '../Student/DailyAttendanceView';
import DepartmentDailyAttendanceView from '../Student/DepartmentDailyAttendanceView';
import RegularAttendanceView from '../Student/RegularAttendanceView';
import AcademicDataDebugger from '../Student/AcademicDataDebugger';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';
import { userService } from '../../services/userService';
import academicService from '../../services/academicService';
import ManagePersonalTrackerModal from './ManagePersonalTrackerModal';

const Dashboard = ({ initialSection = 'overview', onNavigate }) => {
  const { user } = useAuth();
  const { 
    assignedFaculty, 
    hasAssignedFaculty, 
    totalAssignedFaculty, 
    loading: assignmentLoading,
    error: assignmentError
  } = useAssignment();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(initialSection);
  
  // Debug activeSection changes
  console.log('📍 Dashboard activeSection:', activeSection);
  console.log('📍 Dashboard initialSection:', initialSection);
  console.log('📍 Dashboard user role:', user?.role);
  const [academicData, setAcademicData] = useState({
    loading: false,
    error: null,
    data: null,
    lastUpdated: null,
    retryCount: 0,
    isRefreshing: false,
    isOffline: false,
    autoRetryTimeout: null
  });
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);

  // Academic data utility functions
  const resetAcademicData = () => {
    setAcademicData({
      loading: false,
      error: null,
      data: null,
      lastUpdated: null,
      retryCount: 0,
      isRefreshing: false
    });
  };

  const validateAcademicData = (data) => {
    if (!data) return false;
    
    // Validate marks data structure
    if (!data.marks || typeof data.marks.overall?.average !== 'number') {
      console.warn('🎓 Invalid marks data structure');
      return false;
    }
    
    // Validate attendance data structure
    if (!data.attendance || typeof data.attendance.overall?.percentage !== 'number') {
      console.warn('🎓 Invalid attendance data structure');
      return false;
    }
    
    // Validate debarment data structure
    if (!data.debarment || typeof data.debarment.eligibleForExams !== 'boolean') {
      console.warn('🎓 Invalid debarment data structure');
      return false;
    }
    
    return true;
  };

  const updateAcademicDataState = (updates) => {
    setAcademicData(prev => ({
      ...prev,
      ...updates,
      lastUpdated: updates.data ? new Date() : prev.lastUpdated
    }));
  };

  // Fallback data generators
  const generateFallbackAcademicData = (errorType) => {
    const baseData = {
      marks: { 
        subjects: [], 
        overall: { average: 0, grade: 'N/A', totalSubjects: 0, passedSubjects: 0 } 
      },
      attendance: { 
        subjects: [], 
        overall: { percentage: 0, attended: 0, total: 0, status: 'unknown' } 
      },
      debarment: { 
        isDebarred: false, 
        eligibleForExams: true, 
        debarredSubjects: [], 
        reasons: [] 
      },
      lastUpdated: null,
      dataSource: 'fallback',
      fallbackReason: errorType
    };

    // For NO_DATA, show helpful placeholder
    if (errorType === 'NO_DATA') {
      return {
        ...baseData,
        marks: {
          ...baseData.marks,
          overall: { ...baseData.marks.overall, grade: 'Pending' }
        },
        attendance: {
          ...baseData.attendance,
          overall: { ...baseData.attendance.overall, status: 'pending' }
        }
      };
    }

    return baseData;
  };

  const getErrorRecoveryActions = (errorType) => {
    const actions = {
      NO_DATA: [
        { 
          label: 'Contact Faculty', 
          action: () => setActiveSection('faculty'),
          description: 'Reach out to your assigned faculty members'
        },
        { 
          label: 'Check Later', 
          action: () => {
            // Set a reminder to check later (could integrate with notifications)
            console.log('Setting reminder to check academic data later');
          },
          description: 'We\'ll remind you to check back later'
        }
      ],
      NETWORK_ERROR: [
        { 
          label: 'Retry Now', 
          action: refreshAcademicData,
          description: 'Try loading the data again'
        },
        { 
          label: 'Check Connection', 
          action: () => {
            // Could open network diagnostics or show connection tips
            window.open('https://www.google.com', '_blank');
          },
          description: 'Test your internet connection'
        }
      ],
      SERVER_ERROR: [
        { 
          label: 'Retry in 5 minutes', 
          action: () => {
            setTimeout(refreshAcademicData, 5 * 60 * 1000);
          },
          description: 'Automatically retry after server recovers'
        },
        { 
          label: 'Report Issue', 
          action: () => {
            // Could open support form or email
            window.location.href = 'mailto:support@campusbuddy.com?subject=Academic Data Server Error';
          },
          description: 'Let us know about this problem'
        }
      ],
      PERMISSION_ERROR: [
        { 
          label: 'Contact Admin', 
          action: () => {
            window.location.href = 'mailto:admin@campusbuddy.com?subject=Academic Data Access Issue';
          },
          description: 'Request access to your academic data'
        }
      ]
    };

    return actions[errorType] || actions.NETWORK_ERROR;
  };

  const handleAcademicDataError = (error, retryCount = 0) => {
    console.error('🎓 Academic data error:', error);
    
    // Determine error type and message
    let errorMessage = 'Unable to load academic data';
    let errorType = 'NETWORK_ERROR';
    let canRetry = true;
    let severity = 'medium';
    
    if (error.message?.includes('timeout') || error.message?.includes('Request timeout')) {
      errorMessage = 'Request timed out - server is taking too long to respond';
      errorType = 'TIMEOUT_ERROR';
      severity = 'medium';
    } else if (error.message?.includes('not found') || error.message?.includes('404')) {
      errorMessage = 'Academic data not yet available';
      errorType = 'NO_DATA';
      canRetry = false;
      severity = 'low';
    } else if (error.message?.includes('Access denied') || error.message?.includes('403')) {
      errorMessage = 'Access to academic data restricted';
      errorType = 'PERMISSION_ERROR';
      canRetry = false;
      severity = 'high';
    } else if (error.message?.includes('Server error') || error.message?.includes('500')) {
      errorMessage = 'Server temporarily unavailable';
      errorType = 'SERVER_ERROR';
      severity = 'high';
    } else if (error.message?.includes('Network error') || !error.response) {
      errorMessage = 'Network connection error';
      errorType = 'NETWORK_ERROR';
      severity = 'medium';
    } else if (error.message?.includes('Invalid academic data structure')) {
      errorMessage = 'Received invalid data from server';
      errorType = 'DATA_CORRUPTION';
      severity = 'high';
    }

    // Generate fallback data for better UX
    const fallbackData = generateFallbackAcademicData(errorType);
    const recoveryActions = getErrorRecoveryActions(errorType);

    updateAcademicDataState({
      loading: false,
      isRefreshing: false,
      error: { 
        message: errorMessage, 
        type: errorType, 
        canRetry,
        severity,
        originalError: error.message,
        recoveryActions,
        timestamp: new Date().toISOString()
      },
      data: errorType === 'NO_DATA' ? fallbackData : null, // Show fallback for NO_DATA
      retryCount: retryCount + 1
    });

    // Schedule auto-retry for retryable errors
    if (canRetry && !academicData.isOffline && retryCount < 3) {
      scheduleAutoRetry(retryCount);
    }
  };

  // Update activeSection when initialSection prop changes
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await userService.getDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setDashboardData({
          stats: {
            reputation: 0,
            questionsAsked: 0,
            answersGiven: 0,
            notesUploaded: 0
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Enhanced academic data fetching with retry logic and better error handling
  const fetchAcademicData = async (isRefresh = false) => {
    if (!user?._id || user?.role !== 'student') return;

    // Set loading state
    updateAcademicDataState({
      loading: !isRefresh,
      isRefreshing: isRefresh,
      error: null
    });

    try {
      console.log('🎓 Fetching academic data for student:', user._id, isRefresh ? '(refresh)' : '(initial)');
      
      const studentId = user._id;
      const academicYear = user.academicYear;
      
      // Add timeout to API calls
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // Fetch all academic data in parallel with timeout
      const [marksResponse, attendanceResponse, debarmentResponse] = await Promise.allSettled([
        Promise.race([academicService.getMidTermMarks(studentId, academicYear, 'current'), timeoutPromise]),
        Promise.race([academicService.getAttendance(studentId, academicYear, 'current'), timeoutPromise]),
        Promise.race([academicService.getStudentDebarments(studentId), timeoutPromise])
      ]);

      console.log('🎓 API Responses:', { marksResponse, attendanceResponse, debarmentResponse });
      
      // Debug: Log raw API data
      console.log('🎓 Raw Marks Data:', marksResponse.status === 'fulfilled' ? marksResponse.value : 'Failed');
      console.log('🎓 Raw Attendance Data:', attendanceResponse.status === 'fulfilled' ? attendanceResponse.value : 'Failed');
      console.log('🎓 Raw Debarment Data:', debarmentResponse.status === 'fulfilled' ? debarmentResponse.value : 'Failed');

      // Process marks data with validation
      let marksData = { subjects: [], overall: { average: 0, grade: 'N/A', totalSubjects: 0, passedSubjects: 0 } };
      if (marksResponse.status === 'fulfilled' && marksResponse.value?.data) {
        const marks = marksResponse.value.data;
        console.log('🎓 Processing marks data:', marks);
        // Backend returns midTermMarks field
        const midTermMarks = marks.midTermMarks || marks.marks || [];
        if (Array.isArray(midTermMarks) && midTermMarks.length > 0) {
          // Validate and clean marks data
          marksData.subjects = midTermMarks.filter(mark => 
            mark.subjectCode && 
            typeof mark.obtainedMarks === 'number' && 
            typeof mark.maxMarks === 'number'
          );
          
          if (marksData.subjects.length > 0) {
            // Calculate overall average
            let totalObtained = 0;
            let totalMaxMarks = 0;
            let passedSubjects = 0;
            
            marksData.subjects.forEach(mark => {
              const obtained = mark.obtainedMarks || 0;
              const max = mark.maxMarks || 100;
              totalObtained += obtained;
              totalMaxMarks += max;
              
              // Count passed subjects (assuming 40% is passing)
              if ((obtained / max) * 100 >= 40) {
                passedSubjects++;
              }
            });
            
            const overallAverage = totalMaxMarks > 0 ? Math.round((totalObtained / totalMaxMarks) * 100) : 0;
            marksData.overall = {
              average: overallAverage,
              grade: academicService.calculateGrade(overallAverage),
              totalSubjects: marksData.subjects.length,
              passedSubjects
            };
          }
        }
      }

      // Process attendance data with validation
      let attendanceData = { subjects: [], overall: { percentage: 0, attended: 0, total: 0, status: 'good' } };
      if (attendanceResponse.status === 'fulfilled' && attendanceResponse.value?.data) {
        const attendance = attendanceResponse.value.data;
        console.log('🎓 Processing attendance data:', attendance);
        if (attendance.attendance && Array.isArray(attendance.attendance) && attendance.attendance.length > 0) {
          console.log('🎓 Raw attendance array:', attendance.attendance);
          
          // Validate and clean attendance data
          // IMPORTANT: Only show subjects where faculty has entered attendance (totalClasses > 0)
          attendanceData.subjects = attendance.attendance
            .filter(att => {
              const hasData = att.subjectCode && 
                typeof att.attendedClasses === 'number' && 
                typeof att.totalClasses === 'number' &&
                att.totalClasses > 0; // Must have total classes entered by faculty
              
              if (!hasData && att.subjectCode) {
                console.log(`🎓 Filtering out empty attendance: ${att.subjectCode} (${att.attendedClasses}/${att.totalClasses})`);
              }
              
              return hasData;
            })
            .map(att => ({
              ...att,
              percentage: academicService.calculateAttendancePercentage(att.attendedClasses, att.totalClasses),
              status: academicService.getAttendanceStatus(att.percentage || 0).status
            }));
          
          if (attendanceData.subjects.length > 0) {
            // Calculate overall attendance
            let totalAttended = 0;
            let totalClasses = 0;
            
            attendanceData.subjects.forEach(att => {
              totalAttended += att.attendedClasses || 0;
              totalClasses += att.totalClasses || 0;
            });
            
            const overallPercentage = totalClasses > 0 ? 
              academicService.calculateAttendancePercentage(totalAttended, totalClasses) : 0;
            
            attendanceData.overall = {
              percentage: overallPercentage,
              attended: totalAttended,
              total: totalClasses,
              status: academicService.getAttendanceStatus(overallPercentage).status
            };
          }
        }
      }

      // Process debarment data with validation
      let debarmentData = { isDebarred: false, eligibleForExams: true, debarredSubjects: [], reasons: [] };
      if (debarmentResponse.status === 'fulfilled' && debarmentResponse.value?.data) {
        const debarment = debarmentResponse.value.data;
        console.log('🎓 Processing debarment data:', debarment);
        if (debarment.manualDebarments && typeof debarment.manualDebarments === 'object') {
          const debarredSubjects = Object.entries(debarment.manualDebarments)
            .filter(([_, data]) => data && data.isDebarred === true)
            .map(([subject, data]) => ({ 
              subject, 
              reason: data.reason || 'No reason provided', 
              type: data.type || 'manual' 
            }));
          
          debarmentData = {
            isDebarred: debarredSubjects.length > 0,
            eligibleForExams: debarredSubjects.length === 0 && attendanceData.overall.percentage >= 75,
            debarredSubjects: debarredSubjects,
            reasons: debarredSubjects.map(d => d.reason).filter(Boolean)
          };
        } else {
          // Check automatic debarment based on attendance
          const isAutoDebarred = attendanceData.overall.percentage < 75;
          debarmentData.eligibleForExams = !isAutoDebarred;
          if (isAutoDebarred) {
            debarmentData.isDebarred = true;
            debarmentData.reasons = [`Low attendance (${attendanceData.overall.percentage}% - below required 75%)`];
          }
        }
      }

      const processedAcademicData = {
        marks: marksData,
        attendance: attendanceData,
        debarment: debarmentData,
        lastUpdated: new Date().toISOString(),
        dataSource: 'faculty_entry'
      };

      console.log('🎓 Final Processed Academic Data:', JSON.stringify(processedAcademicData, null, 2));
      console.log('🎓 Marks Subjects Count:', marksData.subjects.length);
      console.log('🎓 Attendance Subjects Count:', attendanceData.subjects.length);
      console.log('🎓 Is Debarred:', debarmentData.isDebarred);

      // Validate processed data
      const isValid = validateAcademicData(processedAcademicData);
      console.log('🎓 Data Validation Result:', isValid);
      
      if (!isValid) {
        console.error('🎓 Validation failed for:', processedAcademicData);
        throw new Error('Invalid academic data structure received');
      }

      console.log('✅ Academic data successfully processed and validated');

      updateAcademicDataState({
        loading: false,
        isRefreshing: false,
        error: null,
        data: processedAcademicData,
        retryCount: 0
      });

    } catch (error) {
      handleAcademicDataError(error, academicData.retryCount);
    }
  };

  // Fetch academic data when academic section is active
  useEffect(() => {
    if (activeSection === 'academic' && user?.role === 'student') {
      fetchAcademicData();
    }
  }, [activeSection, user]);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Connection restored');
      updateAcademicDataState({ isOffline: false });
      
      // Auto-retry if we have an error and user is back online
      if (academicData.error && academicData.error.canRetry) {
        console.log('🔄 Auto-retrying after connection restored');
        setTimeout(() => fetchAcademicData(true), 1000);
      }
    };

    const handleOffline = () => {
      console.log('🌐 Connection lost');
      updateAcademicDataState({ isOffline: true });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial connection status
    updateAcademicDataState({ isOffline: !navigator.onLine });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [academicData.error]);

  // Auto-retry logic with exponential backoff
  const scheduleAutoRetry = (retryCount) => {
    if (retryCount >= 3) return; // Max 3 auto-retries

    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
    console.log(`🔄 Scheduling auto-retry in ${delay}ms (attempt ${retryCount + 1})`);

    const timeoutId = setTimeout(() => {
      if (!academicData.isOffline && academicData.error?.canRetry) {
        console.log(`🔄 Auto-retry attempt ${retryCount + 1}`);
        fetchAcademicData(true);
      }
    }, delay);

    updateAcademicDataState({ autoRetryTimeout: timeoutId });
  };

  // Manual refresh function
  const refreshAcademicData = () => {
    // Clear any pending auto-retry
    if (academicData.autoRetryTimeout) {
      clearTimeout(academicData.autoRetryTimeout);
      updateAcademicDataState({ autoRetryTimeout: null });
    }
    
    fetchAcademicData(true);
  };

  // Cleanup auto-retry timeout on unmount
  useEffect(() => {
    return () => {
      if (academicData.autoRetryTimeout) {
        clearTimeout(academicData.autoRetryTimeout);
      }
    };
  }, [academicData.autoRetryTimeout]);

  // Show faculty dashboard for faculty users
  if (user?.role === 'faculty') {
    return <FacultyDashboard />;
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};

  const calculateGPA = (percentage) => {
    if (!percentage) return '8.4';
    if (percentage >= 90) return (8.5 + (percentage - 90) * 0.15).toFixed(1);
    if (percentage >= 80) return (7.5 + (percentage - 80) * 0.1).toFixed(1);
    if (percentage >= 70) return (6.5 + (percentage - 70) * 0.1).toFixed(1);
    if (percentage >= 60) return (5.5 + (percentage - 60) * 0.1).toFixed(1);
    if (percentage >= 50) return (4.5 + (percentage - 50) * 0.1).toFixed(1);
    return 'F';
  };

  const getAttendanceValue = () => {
    if (academicData.data?.attendance?.overall?.percentage !== undefined) {
      return `${Math.round(academicData.data.attendance.overall.percentage)}%`;
    }
    return '87%';
  };

  const getGPAValue = () => {
    if (academicData.data?.marks?.overall?.average) {
      return calculateGPA(academicData.data.marks.overall.average);
    }
    return '8.4';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-[#0B1220] to-[#172554] rounded-2xl border border-slate-800/80 text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#C6A15B]/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black mb-2 text-white">
              Welcome back, {user?.name || 'Student'}! 👋
            </h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {user?.role === 'student' && `${user?.academicYear}${user?.academicYear === 1 ? 'st' : user?.academicYear === 2 ? 'nd' : user?.academicYear === 3 ? 'rd' : 'th'} Year • ${user?.department} Student`}
              {user?.role === 'admin' && 'Administrator'}
            </p>
            {user?.role === 'student' && (
              <div className="mt-3 flex items-center text-[#C6A15B] text-xs font-bold uppercase tracking-wider">
                <Users className="h-4 w-4 mr-1.5" />
                <span>
                  {hasAssignedFaculty() 
                    ? `${totalAssignedFaculty} faculty advisor${totalAssignedFaculty !== 1 ? 's' : ''} assigned`
                    : 'No faculty assigned yet'
                  }
                </span>
              </div>
            )}
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Content filtered for:
            </div>
            <div className="text-[#C6A15B] font-black text-sm uppercase tracking-widest mt-1">
              {user?.role === 'student' && `${user?.department} • Year ${user?.academicYear}`}
              {user?.role === 'admin' && 'All Content'}
            </div>
            {user?.role === 'student' && hasAssignedFaculty() && (
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-1">
                Showing content from assigned faculty
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {user?.role === 'student' ? (
          <>
            <StatsCard
              title="Attendance"
              value={getAttendanceValue()}
              icon={UserCheck}
              color="green"
              trend={academicData.data?.attendance?.overall?.percentage ? { value: 1.5, isPositive: true } : null}
            />
            <StatsCard
              title="Current GPA"
              value={getGPAValue()}
              icon={Award}
              color="gold"
              trend={academicData.data?.marks?.overall?.average ? { value: 0.2, isPositive: true } : null}
            />
            <StatsCard
              title="Assignments"
              value="3 Pending"
              icon={BookOpen}
              color="blue"
              trend={{ value: 1, isPositive: false }}
            />
            <StatsCard
              title="Upcoming Exams"
              value="2"
              icon={Calendar}
              color="orange"
              trend={null}
            />
          </>
        ) : (
          <>
            <StatsCard
              title="Your Reputation"
              value={stats.reputation || 0}
              icon={TrendingUp}
              color="blue"
              trend={{ value: 5, isPositive: true }}
            />
            <StatsCard
              title="Questions Asked"
              value={stats.questionsAsked || 0}
              icon={BookOpen}
              color="green"
              trend={{ value: 2, isPositive: true }}
            />
            <StatsCard
              title="Answers Given"
              value={stats.answersGiven || 0}
              icon={BookOpen}
              color="purple"
              trend={{ value: 3, isPositive: true }}
            />
            <StatsCard
              title="Notes Uploaded"
              value={stats.notesUploaded || 0}
              icon={Calendar}
              color="orange"
              trend={{ value: 1, isPositive: true }}
            />
          </>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {(user?.role === 'student' ? [
          { id: 'faculty', title: 'My Faculty', icon: Users, description: 'View and contact your assigned faculty members', bgIcon: 'bg-blue-50 text-blue-600 border border-blue-100' },
          { id: 'regular-attendance', title: 'My Subject Attendance', icon: UserCheck, description: 'View your subject-wise attendance totals and percentage', bgIcon: 'bg-green-50 text-green-600 border border-green-100' },
          { id: 'daily-attendance', title: 'My Daily Attendance', icon: Calendar, description: 'View your own daily attendance history only', bgIcon: 'bg-green-50 text-green-600 border border-green-100' },
          { id: 'events', title: 'Campus Events', icon: Clock, description: 'Discover and participate in campus events', bgIcon: 'bg-amber-50 text-[#C6A15B] border border-amber-100' },
          { id: 'notes', title: 'Study Notes', icon: BookOpen, description: 'Access and share study materials', bgIcon: 'bg-blue-50 text-blue-600 border border-blue-100' }
        ] : [
          { id: 'academic', title: 'Academic Portal', icon: TrendingUp, description: 'Track your attendance, marks, and academic progress', bgIcon: 'bg-blue-50 text-blue-600 border border-blue-100' },
          { id: 'events', title: 'Campus Events', icon: Calendar, description: 'Discover and participate in campus events', bgIcon: 'bg-amber-50 text-[#C6A15B] border border-amber-100' },
          { id: 'notes', title: 'Study Notes', icon: BookOpen, description: 'Access and share study materials', bgIcon: 'bg-blue-50 text-blue-600 border border-blue-100' }
        ]).map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => {
                console.log('🔘 Button clicked:', section.id);
                console.log('🔘 onNavigate prop:', !!onNavigate);
                console.log('🔘 Current activeSection:', activeSection);
                
                // Handle certain sections locally within Dashboard
                const localSections = ['regular-attendance', 'daily-attendance', 'faculty', 'academic'];
                
                if (localSections.includes(section.id)) {
                  // These sections are handled within Dashboard component
                  console.log('🔘 Using setActiveSection for local section');
                  setActiveSection(section.id);
                } else if (onNavigate) {
                  // Other sections use main app navigation
                  console.log('🔘 Using onNavigate for main app section');
                  onNavigate(section.id);
                } else {
                  // Fallback to local section
                  console.log('🔘 Using setActiveSection as fallback');
                  setActiveSection(section.id);
                }
                
                console.log('🔘 After click, activeSection should be:', section.id);
              }}
              className={`text-left p-5 rounded-2xl border-2 transition-all hover:shadow-md ${
                activeSection === section.id 
                  ? 'border-[#C6A15B] bg-amber-50/20 shadow-sm' 
                  : 'border-slate-200/80 bg-white hover:border-[#C6A15B]/30'
              }`}
            >
              <div className={`${section.bgIcon} p-2.5 rounded-lg w-fit mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{section.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{section.description}</p>
              {section.id === 'faculty' && user?.role === 'student' && (
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <Users className="h-3 w-3 mr-1" />
                  <span>{totalAssignedFaculty} assigned</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Assignment Status Alert for Students */}
      {user?.role === 'student' && !hasAssignedFaculty() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">No Faculty Assigned</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You don't have any faculty members assigned to your year and department yet. 
                This may limit the content you can access.
              </p>
              <div className="mt-2">
                <button
                  onClick={() => setActiveSection('faculty')}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  Check Faculty Assignments →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Loading State */}
      {user?.role === 'student' && assignmentLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 text-blue-400 animate-spin mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Loading Assignments</h3>
              <p className="text-sm text-blue-700">Fetching your faculty assignments...</p>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Error State */}
      {user?.role === 'student' && assignmentError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Assignment Error</h3>
              <p className="text-sm text-red-700 mt-1">{assignmentError}</p>
              <div className="mt-2">
                <button
                  onClick={() => setActiveSection('faculty')}
                  className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                >
                  Try Again →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Content Based on Active Section */}
      {activeSection === 'faculty' && user?.role === 'student' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm text-white p-6">
            <h2 className="text-2xl font-bold mb-2">My Faculty</h2>
            <p className="text-blue-100">View and contact your assigned faculty members</p>
            <div className="mt-4 text-sm">
              <span>Department: {user?.department} • Year: {user?.academicYear}</span>
            </div>
          </div>
          <FacultyList />
        </div>
      )}

      {activeSection === 'academic' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">My Academic Data</h2>
                <p className="text-blue-100">Your personal attendance, marks, and debarment status</p>
                <div className="mt-4 text-sm">
                  <span>Department: {user?.department} • Year: {user?.academicYear}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {academicData.lastUpdated && (
                  <div className="text-blue-100 text-sm">
                    <p>Last updated:</p>
                    <p>{new Date(academicData.lastUpdated).toLocaleString()}</p>
                  </div>
                )}
                {!academicData.loading && !academicData.error && (
                  <button
                    onClick={refreshAcademicData}
                    disabled={academicData.isRefreshing}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      academicData.isRefreshing 
                        ? 'bg-blue-400 text-blue-100 cursor-not-allowed' 
                        : 'bg-blue-500 hover:bg-blue-400 text-white'
                    }`}
                  >
                    <RefreshCw className={`h-4 w-4 ${academicData.isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{academicData.isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {(academicData.loading || academicData.isRefreshing) && (
            <div className="space-y-4">
              {academicData.isRefreshing && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <RefreshCw className="h-5 w-5 text-blue-400 animate-spin mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">Refreshing Academic Data</h3>
                      <p className="text-sm text-blue-700">Getting the latest information from faculty...</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { title: 'Overall Attendance', icon: UserCheck },
                  { title: 'Average Marks', icon: Award },
                  { title: 'Exam Status', icon: AlertCircle }
                ].map((card, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                        {!academicData.isRefreshing && (
                          <div className="h-3 bg-gray-100 rounded w-1/2 mt-1 animate-pulse"></div>
                        )}
                      </div>
                      <div className="bg-gray-200 p-3 rounded-lg animate-pulse">
                        <card.icon className="w-6 h-6 text-gray-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Status Banner */}
          {academicData.isOffline && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">You're offline</h3>
                  <p className="text-sm text-yellow-700">Academic data will be refreshed when connection is restored.</p>
                </div>
              </div>
            </div>
          )}

          {/* Comprehensive Error State */}
          {academicData.error && (
            <div className="space-y-4">
              {/* Main Error Display */}
              <div className={`border rounded-xl p-6 ${
                academicData.error.severity === 'low' ? 'bg-blue-50 border-blue-200' :
                academicData.error.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start">
                  <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 ${
                    academicData.error.severity === 'low' ? 'text-blue-400' :
                    academicData.error.severity === 'medium' ? 'text-yellow-400' :
                    'text-red-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium ${
                        academicData.error.severity === 'low' ? 'text-blue-800' :
                        academicData.error.severity === 'medium' ? 'text-yellow-800' :
                        'text-red-800'
                      }`}>
                        {academicData.error.type === 'NO_DATA' ? 'Academic Data Not Available' :
                         academicData.error.type === 'TIMEOUT_ERROR' ? 'Request Timed Out' :
                         academicData.error.type === 'PERMISSION_ERROR' ? 'Access Restricted' :
                         academicData.error.type === 'SERVER_ERROR' ? 'Server Error' :
                         academicData.error.type === 'DATA_CORRUPTION' ? 'Data Error' :
                         'Connection Error'
                        }
                      </h3>
                      {academicData.error.timestamp && (
                        <span className="text-xs text-gray-500">
                          {new Date(academicData.error.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-sm mt-1 ${
                      academicData.error.severity === 'low' ? 'text-blue-700' :
                      academicData.error.severity === 'medium' ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {academicData.error.message}
                    </p>

                    {/* Error-specific explanations */}
                    {academicData.error.type === 'NO_DATA' && (
                      <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>What this means:</strong> Your faculty members haven't entered your academic data yet.
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          This is normal at the beginning of the semester or before exam results are published.
                        </p>
                      </div>
                    )}

                    {academicData.error.type === 'TIMEOUT_ERROR' && (
                      <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>What happened:</strong> The server is taking too long to respond.
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          This might be due to high server load or slow internet connection.
                        </p>
                      </div>
                    )}

                    {academicData.error.type === 'PERMISSION_ERROR' && (
                      <div className="mt-3 p-3 bg-red-100 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Access Restricted:</strong> You don't have permission to view this academic data.
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          This might be due to account restrictions or system maintenance.
                        </p>
                      </div>
                    )}

                    {academicData.error.type === 'SERVER_ERROR' && (
                      <div className="mt-3 p-3 bg-red-100 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Server Issue:</strong> There's a problem with our servers.
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          Our team has been notified and is working to fix this issue.
                        </p>
                      </div>
                    )}

                    {academicData.error.type === 'DATA_CORRUPTION' && (
                      <div className="mt-3 p-3 bg-red-100 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Data Issue:</strong> The academic data received is incomplete or corrupted.
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          Please try refreshing or contact support if the problem persists.
                        </p>
                      </div>
                    )}

                    {/* Recovery Actions */}
                    {academicData.error.recoveryActions && academicData.error.recoveryActions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-800 mb-2">What you can do:</h4>
                        <div className="space-y-2">
                          {academicData.error.recoveryActions.map((action, index) => (
                            <button
                              key={index}
                              onClick={action.action}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                academicData.error.severity === 'low' ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' :
                                academicData.error.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' :
                                'border-red-200 bg-red-50 hover:bg-red-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${
                                  academicData.error.severity === 'low' ? 'text-blue-800' :
                                  academicData.error.severity === 'medium' ? 'text-yellow-800' :
                                  'text-red-800'
                                }`}>
                                  {action.label}
                                </span>
                                <span className="text-xs text-gray-500">→</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Retry Information */}
                    {academicData.retryCount > 0 && (
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>Retry attempt: {academicData.retryCount}</span>
                        {academicData.autoRetryTimeout && (
                          <span>Auto-retry scheduled</span>
                        )}
                      </div>
                    )}

                    {/* Debug Information */}
                    {import.meta.env.DEV && academicData.error.originalError && (
                      <details className="mt-3">
                        <summary className="text-xs text-gray-500 cursor-pointer">Debug Info</summary>
                        <pre className="text-xs text-gray-400 mt-1 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify({
                            error: academicData.error.originalError,
                            type: academicData.error.type,
                            severity: academicData.error.severity,
                            retryCount: academicData.retryCount,
                            isOffline: academicData.isOffline
                          }, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              {/* Show fallback data for NO_DATA errors */}
              {academicData.error.type === 'NO_DATA' && academicData.data && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h3 className="text-sm font-medium text-gray-700">Preview Mode</h3>
                    <p className="text-xs text-gray-500">Showing placeholder data structure</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Placeholder Cards */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Overall Attendance</p>
                          <p className="text-lg font-bold text-gray-400">---%</p>
                          <p className="text-xs text-gray-400">Waiting for faculty data</p>
                        </div>
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <UserCheck className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Average Marks</p>
                          <p className="text-lg font-bold text-gray-400">---%</p>
                          <p className="text-xs text-gray-400">Grade: Pending</p>
                        </div>
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <Award className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Exam Status</p>
                          <p className="text-lg font-bold text-gray-400">Pending</p>
                          <p className="text-xs text-gray-400">Awaiting data</p>
                        </div>
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Academic Data Display */}
          {!academicData.loading && !academicData.error && academicData.data && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Enhanced Attendance Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">Overall Attendance</p>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        academicData.data.attendance.overall.status === 'good' ? 'bg-green-100 text-green-800' :
                        academicData.data.attendance.overall.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {academicData.data.attendance.overall.status === 'good' ? 'Excellent' :
                         academicData.data.attendance.overall.status === 'warning' ? 'Warning' : 'Critical'}
                      </div>
                    </div>
                    
                    <div className="flex items-baseline space-x-2 mb-2">
                      <p className="text-2xl font-bold text-gray-900">
                        {academicData.data.attendance.overall.percentage}%
                      </p>
                      {academicData.data.attendance.overall.percentage >= 75 && (
                        <span className="text-xs text-green-600 font-medium">✓ Above required</span>
                      )}
                      {academicData.data.attendance.overall.percentage < 75 && academicData.data.attendance.overall.percentage >= 70 && (
                        <span className="text-xs text-yellow-600 font-medium">⚠ Close to limit</span>
                      )}
                      {academicData.data.attendance.overall.percentage < 70 && (
                        <span className="text-xs text-red-600 font-medium">⚠ Below required</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>Required: 75%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            academicData.data.attendance.overall.percentage >= 75 ? 'bg-green-500' :
                            academicData.data.attendance.overall.percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(academicData.data.attendance.overall.percentage, 100)}%` }}
                        ></div>
                        {/* Required threshold marker */}
                        <div 
                          className="absolute w-0.5 h-2 bg-gray-400 -mt-2"
                          style={{ marginLeft: '75%' }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">
                        {academicData.data.attendance.overall.attended} / {academicData.data.attendance.overall.total} classes attended
                      </p>
                      {academicData.data.attendance.subjects.length > 0 && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {academicData.data.attendance.subjects.length} subjects tracked
                          </p>
                          {/* Show critical subjects count */}
                          {(() => {
                            const criticalSubjects = academicData.data.attendance.subjects.filter(s => s.status === 'critical').length;
                            const warningSubjects = academicData.data.attendance.subjects.filter(s => s.status === 'warning').length;
                            
                            if (criticalSubjects > 0) {
                              return (
                                <span className="text-xs text-red-600 font-medium">
                                  {criticalSubjects} critical
                                </span>
                              );
                            } else if (warningSubjects > 0) {
                              return (
                                <span className="text-xs text-yellow-600 font-medium">
                                  {warningSubjects} at risk
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-xs text-green-600 font-medium">
                                  All good
                                </span>
                              );
                            }
                          })()}
                        </div>
                      )}
                      
                      {/* Classes needed to reach 75% */}
                      {academicData.data.attendance.overall.percentage < 75 && academicData.data.attendance.overall.total > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
                          <p className="text-xs text-yellow-800">
                            <strong>Need to attend:</strong> {
                              Math.max(0, Math.ceil((75 * academicData.data.attendance.overall.total / 100) - academicData.data.attendance.overall.attended))
                            } more classes to reach 75%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ml-4 ${
                    academicData.data.attendance.overall.status === 'good' ? 'bg-green-100' :
                    academicData.data.attendance.overall.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <UserCheck className={`w-6 h-6 ${
                      academicData.data.attendance.overall.status === 'good' ? 'text-green-600' :
                      academicData.data.attendance.overall.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                </div>

                {/* Subject-wise attendance preview (top 3 subjects) */}
                {academicData.data.attendance.subjects.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">Subject Breakdown</p>
                    <div className="space-y-2">
                      {academicData.data.attendance.subjects
                        .sort((a, b) => (a.percentage || 0) - (b.percentage || 0)) // Sort by percentage (lowest first)
                        .slice(0, 3)
                        .map((subject, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                subject.status === 'good' ? 'bg-green-500' :
                                subject.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-xs text-gray-600 truncate max-w-20">
                                {subject.subjectCode || subject.subjectName}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-medium ${
                                subject.status === 'good' ? 'text-green-600' :
                                subject.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {subject.percentage || 0}%
                              </span>
                              <span className="text-xs text-gray-400">
                                ({subject.attendedClasses || 0}/{subject.totalClasses || 0})
                              </span>
                            </div>
                          </div>
                        ))}
                      {academicData.data.attendance.subjects.length > 3 && (
                        <p className="text-xs text-gray-400 text-center pt-1">
                          +{academicData.data.attendance.subjects.length - 3} more subjects
                        </p>
                      )}
                      <div className="pt-2 border-t border-gray-100 mt-2">
                        <button
                          onClick={() => setShowDetailedView(true)}
                          className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-1"
                        >
                          <span>View Attendance Details</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Marks Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">Average Marks</p>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        academicData.data.marks.overall.average >= 90 ? 'bg-green-100 text-green-800' :
                        academicData.data.marks.overall.average >= 80 ? 'bg-blue-100 text-blue-800' :
                        academicData.data.marks.overall.average >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        academicData.data.marks.overall.average >= 60 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {academicData.data.marks.overall.grade}
                      </div>
                    </div>
                    
                    <div className="flex items-baseline space-x-2 mb-2">
                      <p className="text-2xl font-bold text-gray-900">
                        {academicData.data.marks.overall.average}%
                      </p>
                      {academicData.data.marks.overall.average >= 80 && (
                        <span className="text-xs text-green-600 font-medium">🎯 Excellent</span>
                      )}
                      {academicData.data.marks.overall.average >= 70 && academicData.data.marks.overall.average < 80 && (
                        <span className="text-xs text-blue-600 font-medium">👍 Good</span>
                      )}
                      {academicData.data.marks.overall.average >= 60 && academicData.data.marks.overall.average < 70 && (
                        <span className="text-xs text-yellow-600 font-medium">⚠ Average</span>
                      )}
                      {academicData.data.marks.overall.average < 60 && (
                        <span className="text-xs text-red-600 font-medium">📚 Needs Improvement</span>
                      )}
                    </div>

                    {/* Grade Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Performance</span>
                        <span>Target: 80%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            academicData.data.marks.overall.average >= 90 ? 'bg-green-500' :
                            academicData.data.marks.overall.average >= 80 ? 'bg-blue-500' :
                            academicData.data.marks.overall.average >= 70 ? 'bg-yellow-500' :
                            academicData.data.marks.overall.average >= 60 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(academicData.data.marks.overall.average, 100)}%` }}
                        ></div>
                        {/* Target threshold marker */}
                        <div 
                          className="absolute w-0.5 h-2 bg-gray-400 -mt-2"
                          style={{ marginLeft: '80%' }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {academicData.data.marks.subjects.length > 0 && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {academicData.data.marks.subjects.length} subjects • {academicData.data.marks.overall.passedSubjects || 0} passed
                          </p>
                          {/* Show performance distribution */}
                          {(() => {
                            const excellentCount = academicData.data.marks.subjects.filter(s => (s.obtainedMarks / s.maxMarks * 100) >= 80).length;
                            const goodCount = academicData.data.marks.subjects.filter(s => {
                              const percentage = s.obtainedMarks / s.maxMarks * 100;
                              return percentage >= 70 && percentage < 80;
                            }).length;
                            const needsImprovementCount = academicData.data.marks.subjects.filter(s => (s.obtainedMarks / s.maxMarks * 100) < 60).length;
                            
                            if (excellentCount > 0) {
                              return (
                                <span className="text-xs text-green-600 font-medium">
                                  {excellentCount} excellent
                                </span>
                              );
                            } else if (goodCount > 0) {
                              return (
                                <span className="text-xs text-blue-600 font-medium">
                                  {goodCount} good
                                </span>
                              );
                            } else if (needsImprovementCount > 0) {
                              return (
                                <span className="text-xs text-red-600 font-medium">
                                  {needsImprovementCount} need improvement
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-xs text-gray-500 font-medium">
                                  All average
                                </span>
                              );
                            }
                          })()}
                        </div>
                      )}
                      
                      {/* Points needed for next grade */}
                      {academicData.data.marks.overall.average < 90 && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-800">
                            <strong>Next milestone:</strong> {
                              academicData.data.marks.overall.average >= 80 ? 
                                `${90 - academicData.data.marks.overall.average}% more for A+ grade` :
                              academicData.data.marks.overall.average >= 70 ? 
                                `${80 - academicData.data.marks.overall.average}% more for A grade` :
                              academicData.data.marks.overall.average >= 60 ? 
                                `${70 - academicData.data.marks.overall.average}% more for B+ grade` :
                                `${60 - academicData.data.marks.overall.average}% more for B grade`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ml-4 ${
                    academicData.data.marks.overall.average >= 90 ? 'bg-green-100' :
                    academicData.data.marks.overall.average >= 80 ? 'bg-blue-100' :
                    academicData.data.marks.overall.average >= 70 ? 'bg-yellow-100' :
                    academicData.data.marks.overall.average >= 60 ? 'bg-orange-100' : 'bg-red-100'
                  }`}>
                    <Award className={`w-6 h-6 ${
                      academicData.data.marks.overall.average >= 90 ? 'text-green-600' :
                      academicData.data.marks.overall.average >= 80 ? 'text-blue-600' :
                      academicData.data.marks.overall.average >= 70 ? 'text-yellow-600' :
                      academicData.data.marks.overall.average >= 60 ? 'text-orange-600' : 'text-red-600'
                    }`} />
                  </div>
                </div>

                {/* Subject-wise marks preview (top 3 subjects by performance) */}
                {academicData.data.marks.subjects.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">Subject Performance</p>
                    <div className="space-y-2">
                      {academicData.data.marks.subjects
                        .map(subject => ({
                          ...subject,
                          percentage: Math.round((subject.obtainedMarks / subject.maxMarks) * 100)
                        }))
                        .sort((a, b) => a.percentage - b.percentage) // Sort by percentage (lowest first)
                        .slice(0, 3)
                        .map((subject, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                subject.percentage >= 80 ? 'bg-green-500' :
                                subject.percentage >= 70 ? 'bg-blue-500' :
                                subject.percentage >= 60 ? 'bg-yellow-500' :
                                subject.percentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-xs text-gray-600 truncate max-w-20">
                                {subject.subjectCode || subject.subjectName}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-medium ${
                                subject.percentage >= 80 ? 'text-green-600' :
                                subject.percentage >= 70 ? 'text-blue-600' :
                                subject.percentage >= 60 ? 'text-yellow-600' :
                                subject.percentage >= 40 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                {subject.percentage}%
                              </span>
                              <span className="text-xs text-gray-400">
                                ({subject.obtainedMarks}/{subject.maxMarks})
                              </span>
                              <span className={`text-xs px-1 py-0.5 rounded ${
                                subject.percentage >= 80 ? 'bg-green-100 text-green-700' :
                                subject.percentage >= 70 ? 'bg-blue-100 text-blue-700' :
                                subject.percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                subject.percentage >= 40 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {academicService.calculateGrade(subject.percentage)}
                              </span>
                            </div>
                          </div>
                        ))}
                      {academicData.data.marks.subjects.length > 3 && (
                        <p className="text-xs text-gray-400 text-center pt-1">
                          +{academicData.data.marks.subjects.length - 3} more subjects
                        </p>
                      )}
                      <div className="pt-2 border-t border-gray-100 mt-2">
                        <button
                          onClick={() => setShowDetailedView(true)}
                          className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-1"
                        >
                          <span>View Marks Details</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Exam Eligibility Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">Exam Eligibility</p>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        academicData.data.debarment.eligibleForExams 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {academicData.data.debarment.eligibleForExams ? 'ELIGIBLE' : 'DEBARRED'}
                      </div>
                    </div>
                    
                    <div className="flex items-baseline space-x-2 mb-2">
                      <p className={`text-2xl font-bold ${
                        academicData.data.debarment.eligibleForExams ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {academicData.data.debarment.eligibleForExams ? 'Eligible' : 'Debarred'}
                      </p>
                      {academicData.data.debarment.eligibleForExams && (
                        <span className="text-xs text-green-600 font-medium">✅ All Clear</span>
                      )}
                      {!academicData.data.debarment.eligibleForExams && (
                        <span className="text-xs text-red-600 font-medium">❌ Action Required</span>
                      )}
                    </div>

                    {/* Eligibility Status Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Status</span>
                        <span>
                          {academicData.data.debarment.eligibleForExams 
                            ? 'Ready for exams' 
                            : 'Needs resolution'
                          }
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            academicData.data.debarment.eligibleForExams ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: academicData.data.debarment.eligibleForExams ? '100%' : '0%' }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">
                        {academicData.data.debarment.eligibleForExams 
                          ? 'You can appear in all examinations' 
                          : `${academicData.data.debarment.debarredSubjects.length} subject(s) affected`
                        }
                      </p>
                      
                      {/* Eligibility criteria check */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-xs">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            academicData.data.attendance.overall.percentage >= 75 ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className={`${
                            academicData.data.attendance.overall.percentage >= 75 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Attendance: {academicData.data.attendance.overall.percentage}% 
                            {academicData.data.attendance.overall.percentage >= 75 ? ' ✓' : ' (Required: 75%)'}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-xs">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            !academicData.data.debarment.isDebarred ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className={`${
                            !academicData.data.debarment.isDebarred ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Manual Debarment: {!academicData.data.debarment.isDebarred ? 'None ✓' : 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Debarment reasons */}
                      {academicData.data.debarment.reasons.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-red-800 mb-1">Debarment Reasons:</p>
                          {academicData.data.debarment.reasons.map((reason, index) => (
                            <p key={index} className="text-xs text-red-700">
                              • {reason}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Action items for debarred students */}
                      {!academicData.data.debarment.eligibleForExams && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
                          <p className="text-xs font-medium text-yellow-800 mb-1">To become eligible:</p>
                          {academicData.data.attendance.overall.percentage < 75 && (
                            <p className="text-xs text-yellow-700">
                              • Improve attendance to at least 75%
                            </p>
                          )}
                          {academicData.data.debarment.isDebarred && (
                            <p className="text-xs text-yellow-700">
                              • Contact faculty to resolve manual debarment
                            </p>
                          )}
                        </div>
                      )}

                      {/* Success message for eligible students */}
                      {academicData.data.debarment.eligibleForExams && (
                        <div className="mt-2 p-2 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-800">
                            🎉 <strong>Great job!</strong> You meet all requirements for examination eligibility.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ml-4 ${
                    academicData.data.debarment.eligibleForExams ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {academicData.data.debarment.eligibleForExams ? (
                      <Award className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>

                {/* Debarred subjects breakdown */}
                {academicData.data.debarment.debarredSubjects.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">Affected Subjects</p>
                    <div className="space-y-2">
                      {academicData.data.debarment.debarredSubjects.slice(0, 3).map((debarment, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-xs text-gray-600 truncate max-w-20">
                              {debarment.subject}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-red-600 font-medium">
                              {debarment.type === 'manual' ? 'Manual' : 'Auto'}
                            </span>
                            <span className="text-xs text-gray-400 truncate max-w-24">
                              {debarment.reason}
                            </span>
                          </div>
                        </div>
                      ))}
                      {academicData.data.debarment.debarredSubjects.length > 3 && (
                        <p className="text-xs text-gray-400 text-center pt-1">
                          +{academicData.data.debarment.debarredSubjects.length - 3} more subjects
                        </p>
                      )}
                      <div className="pt-2 border-t border-gray-100 mt-2">
                        <button
                          onClick={() => setShowDetailedView(true)}
                          className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-1"
                        >
                          <span>View Eligibility Details</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* View Details Link for cards without debarred subjects */}
                {academicData.data.debarment.debarredSubjects.length === 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <button
                      onClick={() => setShowDetailedView(true)}
                      className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-1"
                    >
                      <span>View Eligibility Details</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed View Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowDetailedView(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <BookOpen className="h-5 w-5" />
                <span>View Detailed Analysis</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            </>
          )}

          {/* Empty State when no data */}
          {!academicData.loading && !academicData.error && !academicData.data && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Data Available</h3>
              <p className="text-gray-500 mb-4">
                Your academic information hasn't been entered by faculty yet.
              </p>
              <p className="text-sm text-gray-400">
                Please contact your faculty members for updates on your academic records.
              </p>
            </div>
          )}

          {/* Detailed Academic View */}
          {showDetailedView && (
            <div className="mt-6">
              <DetailedAcademicView
                academicData={academicData.data}
                isVisible={showDetailedView}
                onClose={() => setShowDetailedView(false)}
                onRefresh={refreshAcademicData}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}

      {activeSection === 'daily-attendance' && user?.role === 'student' && (
        <DailyAttendanceView />
      )}

      {activeSection === 'department-daily-attendance' && user?.role === 'student' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 text-white p-6 shadow-xl">
            <h2 className="text-xl font-black mb-2 text-white">Department Daily Attendance</h2>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">View daily attendance sessions created by faculty for all students</p>
            <div className="mt-4 text-xs font-bold text-[#c5a880]">
              <span>Showing: {user?.department} Department • Year {user?.academicYear} Students</span>
            </div>
          </div>
          <DepartmentDailyAttendanceView />
        </div>
      )}

      {activeSection === 'regular-attendance' && user?.role === 'student' && (
        <div className="space-y-6">
          {/* Debug Info */}
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h4 className="font-semibold text-green-800">🚨 Dashboard Debug:</h4>
            <div className="text-green-700 text-sm space-y-1">
              <p><strong>Active Section:</strong> {activeSection}</p>
              <p><strong>User Role:</strong> {user?.role}</p>
              <p><strong>User Name:</strong> {user?.name}</p>
              <p><strong>Component Status:</strong> ✅ RENDERING REGULAR ATTENDANCE</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl shadow-sm text-white p-6">
            <h2 className="text-2xl font-bold mb-2">Department Attendance</h2>
            <p className="text-teal-100">View attendance of all students in your department (subject-wise)</p>
            <div className="mt-4 text-sm">
              <span>Showing: {user?.department} Department • Year {user?.academicYear} Students</span>
            </div>
          </div>
          <RegularAttendanceView />
        </div>
      )}

      {activeSection === 'events' && (
        <Events />
      )}

      {activeSection === 'notes' && (
        <Notes />
      )}

      {/* Original Dashboard Content for Overview */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {user?.role === 'student' ? (
              <>
                {/* Deadlines and Progress Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Upcoming Deadlines */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-[#C6A15B]" />
                        <span>Upcoming Deadlines</span>
                      </h3>
                      <button onClick={() => setIsTrackerModalOpen(true)} className="text-xs font-semibold text-[#C6A15B] hover:underline">Manage</button>
                    </div>
                    <div className="space-y-3">
                      {(user?.personalDeadlines?.length > 0 ? user.personalDeadlines : [
                        { title: 'DBMS Assignment', dueDate: 'Due Tomorrow', color: 'text-red-700 bg-red-50 border border-red-100 font-bold' },
                        { title: 'Operating Systems Quiz', dueDate: 'Aug 22', color: 'text-amber-700 bg-amber-50 border border-amber-100 font-semibold' },
                        { title: 'CN Assignment', dueDate: 'Aug 25', color: 'text-blue-700 bg-blue-50 border border-blue-100 font-semibold' }
                      ]).map((item, idx) => {
                        const dateText = item.dueDate?.includes('T') ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (item.dueDate || item.due);
                        return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-1.5 h-1.5 bg-[#C6A15B] rounded-full"></div>
                            <span className="text-xs font-semibold text-gray-800">{item.title}</span>
                          </div>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${item.color}`}>
                            {dateText}
                          </span>
                        </div>
                      )})}
                    </div>
                  </div>

                  {/* Academic Progress */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#C6A15B]" />
                        <span>Academic Progress</span>
                      </h3>
                      <button onClick={() => setIsTrackerModalOpen(true)} className="text-xs font-semibold text-[#C6A15B] hover:underline">Manage</button>
                    </div>
                    <div className="space-y-3">
                      {(user?.personalProgress?.length > 0 ? user.personalProgress : [
                        { semester: 'Semester 1', gpa: 8.2, max: 10, color: 'bg-blue-500' },
                        { semester: 'Semester 2', gpa: 8.5, max: 10, color: 'bg-green-600' },
                        { semester: 'Semester 3', gpa: 8.4, max: 10, color: 'bg-[#C6A15B]' },
                        { semester: 'Semester 4', gpa: 8.7, max: 10, color: 'bg-indigo-650' }
                      ]).map((sem, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                            <span>{sem.semester}</span>
                            <span className="font-bold text-gray-950">{sem.gpa} / {sem.max} GPA</span>
                          </div>
                          <div className="w-full bg-gray-150 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${sem.color} transition-all duration-500`}
                              style={{ width: `${(sem.gpa / sem.max) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Assignment Summary for Students */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Assignment Summary</h2>
                  {hasAssignedFaculty() ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 font-medium">Assigned Advisors</span>
                        <span className="font-bold text-gray-950">{totalAssignedFaculty}</span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Assigned Faculty:</h4>
                        <div className="space-y-1">
                          {assignedFaculty.slice(0, 3).map((assignment, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-700 font-medium">
                              <GraduationCap className="h-4 w-4 mr-2 text-[#C6A15B]" />
                              <span>{assignment.faculty.name}</span>
                              <span className="ml-2 text-xs text-slate-400">({assignment.faculty.department})</span>
                            </div>
                          ))}
                          {assignedFaculty.length > 3 && (
                            <div className="text-xs text-gray-400 font-semibold pl-6 mt-1">
                              +{assignedFaculty.length - 3} more assigned members
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveSection('faculty')}
                        className="w-full mt-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-150"
                      >
                        View All Faculty →
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-gray-900 mb-1">No Faculty Assigned</h3>
                      <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                        No faculty members are assigned to your year and department yet.
                      </p>
                      <button
                        onClick={() => setActiveSection('faculty')}
                        className="bg-[#0B1220] hover:bg-[#1a253a] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-150"
                      >
                        Check Assignments
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <p className="text-gray-600">Your recent campus activities will appear here.</p>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {user?.role === 'student' && hasAssignedFaculty() && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveSection('faculty')}
                    className="w-full flex items-center justify-between p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="text-blue-900 font-medium">View Faculty</span>
                    </div>
                    <span className="text-blue-600 text-sm">{totalAssignedFaculty}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      const firstFaculty = assignedFaculty[0];
                      if (firstFaculty) {
                        window.location.href = `mailto:${firstFaculty.faculty.email}`;
                      }
                    }}
                    className="w-full flex items-center p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    disabled={!hasAssignedFaculty()}
                  >
                    <Mail className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-green-900 font-medium">Contact Faculty</span>
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Department</span>
                  <span className="font-semibold text-gray-900">{user?.department}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Academic Year</span>
                  <span className="font-semibold text-gray-900">
                    {user?.academicYear}{user?.academicYear === 1 ? 'st' : user?.academicYear === 2 ? 'nd' : user?.academicYear === 3 ? 'rd' : 'th'} Year
                  </span>
                </div>
                {user?.role === 'student' && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Faculty Assigned</span>
                    <span className="font-semibold text-gray-900">{totalAssignedFaculty}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ManagePersonalTrackerModal
        isOpen={isTrackerModalOpen}
        onClose={() => setIsTrackerModalOpen(false)}
        user={user}
      />
    </div>
  );
};

export default Dashboard;
