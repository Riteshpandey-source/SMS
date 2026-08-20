import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  BookOpen, 
  Users, 
  FileText, 
  Calendar,
  TrendingUp,
  Plus,
  Edit3,
  Eye,
  Download,
  AlertCircle,
  Trash2,
  BarChart3,
  UserCheck,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Mail,
  GraduationCap,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';
import { facultyService } from '../../services/facultyService';
import { notesService } from '../../services/notesService';
import CreateEventModal from './CreateEventModal';
import StudentList from './StudentList';
import EnhancedNotes from './EnhancedNotes';
import DailyAttendanceSimple from './DailyAttendanceSimple';
import FacultyExamMarks from './FacultyExamMarks';
import toast from 'react-hot-toast';

const FacultyDashboard = ({ initialSection = 'overview' }) => {
  const { user } = useAuth();
  const { 
    assignedStudents, 
    hasAssignedStudents, 
    totalAssignedStudents,
    loading: assignmentLoading,
    error: assignmentError,
    getAssignmentSummary 
  } = useAssignment();

  // Centralized state management
  const [dashboardState, setDashboardState] = useState({
    stats: null,
    recentNotes: [],
    departmentStudents: [],
    facultyEvents: [],
    loading: {
      initial: true,
      stats: false,
      notes: false,
      students: false,
      events: false,
      refreshing: false
    },
    errors: {
      stats: null,
      notes: null,
      students: null,
      events: null,
      general: null
    },
    lastUpdated: {
      stats: null,
      notes: null,
      students: null,
      events: null
    }
  });

  // UI state with persistence
  const [activeSection, setActiveSection] = useState(() => {
    const saved = localStorage.getItem('facultyDashboard_activeSection');
    return saved || initialSection;
  });
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Persist active section
  useEffect(() => {
    localStorage.setItem('facultyDashboard_activeSection', activeSection);
  }, [activeSection]);

  // Derived state for backward compatibility
  const stats = dashboardState.stats;
  const recentNotes = dashboardState.recentNotes;
  const departmentStudents = dashboardState.departmentStudents;
  const facultyEvents = dashboardState.facultyEvents;
  const loading = dashboardState.loading.initial;

  // State management helpers
  const updateDashboardState = (updates) => {
    setDashboardState(prev => ({
      ...prev,
      ...updates,
      lastUpdated: {
        ...prev.lastUpdated,
        ...Object.keys(updates).reduce((acc, key) => {
          if (!['loading', 'errors'].includes(key)) {
            acc[key] = new Date().toISOString();
          }
          return acc;
        }, {})
      }
    }));
  };

  const setLoadingState = (section, isLoading) => {
    setDashboardState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        [section]: isLoading
      }
    }));
  };

  const setErrorState = (section, error) => {
    setDashboardState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [section]: error
      }
    }));
  };

  const clearError = (section) => {
    setErrorState(section, null);
  };

  const refreshSection = async (section) => {
    setLoadingState('refreshing', true);
    try {
      switch (section) {
        case 'stats':
          await fetchStats();
          break;
        case 'notes':
          await fetchNotes();
          break;
        case 'students':
          await fetchStudents();
          break;
        case 'events':
          await fetchEvents();
          break;
        case 'all':
          await fetchAllData();
          break;
        default:
          break;
      }
      toast.success(`${section === 'all' ? 'Dashboard' : section} refreshed successfully`);
    } catch (error) {
      console.error(`Failed to refresh ${section}:`, error);
      toast.error(`Failed to refresh ${section}`);
    } finally {
      setLoadingState('refreshing', false);
    }
  };

  // Individual fetch functions
  const fetchStats = async () => {
    setLoadingState('stats', true);
    clearError('stats');
    try {
      const statsResponse = await facultyService.getFacultyStats();
      updateDashboardState({ stats: statsResponse });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setErrorState('stats', 'Failed to load statistics');
      // Use fallback stats
      updateDashboardState({
        stats: {
          totalStudents: totalAssignedStudents,
          totalNotes: 0,
          totalEvents: 0,
          avgAttendance: 87
        }
      });
    } finally {
      setLoadingState('stats', false);
    }
  };

  const fetchNotes = async () => {
    setLoadingState('notes', true);
    clearError('notes');
    try {
      const notesResponse = await notesService.getNotes({ limit: 5 });
      updateDashboardState({ recentNotes: notesResponse.notes || [] });
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setErrorState('notes', 'Failed to load notes');
      updateDashboardState({ recentNotes: [] });
    } finally {
      setLoadingState('notes', false);
    }
  };

  const fetchStudents = async () => {
    setLoadingState('students', true);
    clearError('students');
    try {
      const studentsResponse = await facultyService.getDepartmentStudents({ limit: 20 });
      updateDashboardState({ departmentStudents: studentsResponse.students || [] });
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setErrorState('students', 'Failed to load students');
      updateDashboardState({ departmentStudents: [] });
    } finally {
      setLoadingState('students', false);
    }
  };

  const fetchEvents = async () => {
    setLoadingState('events', true);
    clearError('events');
    try {
      const eventsResponse = await facultyService.getFacultyEvents();
      updateDashboardState({ facultyEvents: eventsResponse.events || [] });
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setErrorState('events', 'Failed to load events');
      updateDashboardState({ facultyEvents: [] });
    } finally {
      setLoadingState('events', false);
    }
  };

  // Fetch all faculty dashboard data
  const fetchAllData = async () => {
    setLoadingState('initial', true);
    clearError('general');
    
    try {
      // Check if user is properly loaded
      if (!user) {
        console.log('User not loaded yet, skipping API calls');
        return;
      }
      
      console.log('Fetching dashboard data for user:', {
        id: user._id,
        role: user.role,
        department: user.department,
        name: user.name
      });
      
      // Fetch all data concurrently
      await Promise.allSettled([
        fetchStats(),
        fetchNotes(),
        fetchStudents(),
        fetchEvents()
      ]);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setErrorState('general', 'Failed to load dashboard data');
    } finally {
      setLoadingState('initial', false);
    }
  };

  // Legacy function for backward compatibility
  const fetchDashboardData = fetchAllData;

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Update activeSection when initialSection prop changes
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const handleCreateEvent = () => {
    setShowCreateEventModal(true);
  };

  const handleEventCreated = () => {
    setShowCreateEventModal(false);
    setSelectedEvent(null);
    fetchDashboardData(); // Refresh data
    toast.success(selectedEvent ? 'Event updated successfully!' : 'Event created successfully!');
  };

  const handleCloseEventModal = () => {
    setShowCreateEventModal(false);
    setSelectedEvent(null);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowCreateEventModal(true);
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      return;
    }

    try {
      await facultyService.deleteEvent(eventId);
      toast.success('Event deleted successfully!');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete event:', error);
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete event';
      toast.error(errorMessage);
    }
  };

  // Get assignment summary
  const assignmentSummary = getAssignmentSummary();
  const yearCount = assignmentSummary.yearCount;

  // Faculty stats for display
  const facultyStats = [
    { 
      title: "Today's Classes", 
      value: '3', 
      icon: Clock, 
      color: 'bg-indigo-650',
      change: 'Next: 09:00 AM'
    },
    { 
      title: 'Pending Attendance', 
      value: '1', 
      icon: UserCheck, 
      color: 'bg-rose-650',
      change: '1 session pending'
    },
    { 
      title: 'Upcoming Events', 
      value: facultyEvents?.length || 2, 
      icon: Calendar, 
      color: 'bg-amber-650',
      change: 'Next: Meeting tomorrow'
    },
    { 
      title: 'Avg. Attendance', 
      value: '87%', 
      icon: TrendingUp, 
      color: 'bg-emerald-650',
      change: '+5% vs last month'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Faculty Welcome Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#c5a880]/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black mb-2 text-white">
              Welcome back, {user?.name || 'Faculty'}! 👋
            </h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Academic console for department performance and advisor activities.
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs font-bold text-[#c5a880]">
              <span>• {totalAssignedStudents} Student Mappings</span>
              <span>• {yearCount} Active Years</span>
              {dashboardState.lastUpdated.stats && (
                <span>• Sync: {new Date(dashboardState.lastUpdated.stats).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => refreshSection('all')}
            disabled={dashboardState.loading.refreshing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-355 font-semibold text-xs hover:bg-slate-900 hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${dashboardState.loading.refreshing ? 'animate-spin' : ''}`} />
            <span>{dashboardState.loading.refreshing ? 'Refreshing...' : 'Refresh Console'}</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {dashboardState.errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Dashboard Error</h3>
              <p className="text-sm text-red-700 mt-1">{dashboardState.errors.general}</p>
              <div className="mt-2">
                <button
                  onClick={() => {
                    clearError('general');
                    refreshSection('all');
                  }}
                  className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                >
                  Try Again →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {facultyStats.map((stat, index) => {
          const Icon = stat.icon;
          const cardStyles = [
            { bgIcon: 'bg-indigo-50 text-indigo-600', ring: 'border-slate-200/80 shadow-sm' },
            { bgIcon: 'bg-rose-50 text-rose-650', ring: 'border-slate-200/80 shadow-sm' },
            { bgIcon: 'bg-amber-50 text-[#c5a880]', ring: 'border-amber-100/60 shadow-sm' },
            { bgIcon: 'bg-emerald-50 text-emerald-600', ring: 'border-slate-200/80 shadow-sm' }
          ][index] || { bgIcon: 'bg-slate-50 text-slate-600', ring: 'border-slate-200' };

          return (
            <div 
              key={index} 
              className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${cardStyles.ring}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl shadow-inner ${cardStyles.bgIcon}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50 text-xs font-semibold text-slate-500">
                <span>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assignment Status Alert */}
      {assignmentError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Assignment Error</h3>
              <p className="text-sm text-red-700 mt-1">{assignmentError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabbed Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto scrollbar-none flex-nowrap" aria-label="Tabs">
            {[
              { 
                id: 'overview', 
                title: 'Overview', 
                icon: BarChart3, 
                description: 'Dashboard overview and statistics'
              },
              { 
                id: 'students', 
                title: 'My Students', 
                icon: Users, 
                description: 'View and manage assigned students',
                count: totalAssignedStudents
              },
              { 
                id: 'attendance', 
                title: 'Daily Attendance', 
                icon: UserCheck, 
                description: 'Mark and manage daily attendance'
              },
              { 
                id: 'exam-marks',
                title: 'Exam Marks',
                icon: FileText,
                description: 'Add subject-wise marks for your students'
              },
              { 
                id: 'notes', 
                title: 'Notes & Resources', 
                icon: BookOpen, 
                description: 'Create and manage educational content'
              },
              { 
                id: 'events', 
                title: 'Events', 
                icon: Calendar, 
                description: 'Organize and track department events'
              },
              { 
                id: 'analytics', 
                title: 'Analytics', 
                icon: TrendingUp, 
                description: 'View performance and engagement metrics'
              }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`${
                    activeSection === tab.id
                      ? 'border-[#c5a880] text-[#c5a880] font-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm flex items-center space-x-2 transition-colors`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.title}</span>
                  {tab.count !== undefined && (
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Detail Info Panel */}
              <div className="border-t border-slate-100 pt-1"></div>

              {/* Today's Workspace Agenda */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-250">
                  <div>
                    <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">Today's Workspace Agenda</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Here's what needs your attention today.</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-full">
                    Faculty Workspace
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Today's Classes */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Classes</span>
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="text-lg font-black text-slate-800 mt-2">3 Classes</div>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-3 pt-2.5 border-t border-slate-100">
                      09:00 · 11:00 · 14:00
                    </div>
                  </div>

                  {/* Attendance Pending */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Status</span>
                        <UserCheck className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="text-lg font-black text-rose-600 mt-2">1 Session Pending</div>
                    </div>
                    <button
                      onClick={() => setActiveSection('attendance')}
                      className="text-left text-xs text-indigo-600 hover:text-indigo-800 font-bold mt-3 pt-2.5 border-t border-slate-100 w-full"
                    >
                      Submit Attendance →
                    </button>
                  </div>

                  {/* Marks Pending */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exam Submissions</span>
                        <FileText className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-lg font-black text-amber-600 mt-2">12 Pending</div>
                    </div>
                    <button
                      onClick={() => setActiveSection('exam-marks')}
                      className="text-left text-xs text-indigo-600 hover:text-indigo-800 font-bold mt-3 pt-2.5 border-t border-slate-100 w-full"
                    >
                      Enter Marks →
                    </button>
                  </div>

                  {/* Events */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Events</span>
                        <Calendar className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-lg font-black text-slate-800 mt-2">2 Upcoming</div>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-3 pt-2.5 border-t border-slate-100 truncate">
                      Next: Faculty Meeting
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveSection('notes')}
                      className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center">
                        <Plus className="w-4 h-4 text-blue-600 mr-3" />
                        <span className="text-slate-800 font-semibold text-sm">Upload New Notes</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveSection('events')}
                      className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-blue-600 mr-3" />
                        <span className="text-slate-800 font-semibold text-sm">Create Event</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveSection('students')}
                      className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-blue-600 mr-3" />
                        <span className="text-slate-800 font-semibold text-sm">Manage Academic Data</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-xs font-semibold text-slate-650">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                      <span>3 new notes uploaded</span>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-slate-650">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                      <span>2 students assigned</span>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-slate-650">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                      <span>1 event created</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Upcoming Schedules</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-xs font-semibold text-slate-650">
                      <Calendar className="w-4 h-4 mr-3 text-[#c5a880]" />
                      <span>Faculty Sync - Tomorrow</span>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-slate-650">
                      <FileText className="w-4 h-4 mr-3 text-[#c5a880]" />
                      <span>Assignment Review - 3 days</span>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-slate-650">
                      <Users className="w-4 h-4 mr-3 text-[#c5a880]" />
                      <span>Advisor Reviews - Next week</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeSection === 'students' && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">My Students</h2>
                    <p className="text-gray-600">View and manage your assigned students' academic data</p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Edit3 className="h-4 w-4" />
                    <span>Click "Academic Data" to manage marks, attendance & debarment</span>
                  </div>
                </div>
                
                {/* Academic Data Features Info */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <BookOpen className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-900 mb-1">Academic Data Management</h3>
                      <p className="text-sm text-blue-700 mb-2">
                        Click the "Academic Data" button on any student to access their complete academic information:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center text-blue-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span>Mid-term Marks & Grades</span>
                        </div>
                        <div className="flex items-center text-blue-600">
                          <UserCheck className="h-3 w-3 mr-1" />
                          <span>Attendance Tracking</span>
                        </div>
                        <div className="flex items-center text-blue-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          <span>Debarment Management</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <StudentList />
            </div>
          )}

          {/* Daily Attendance Tab */}
          {activeSection === 'attendance' && (
            <div>
              <DailyAttendanceSimple />
            </div>
          )}

          {/* Exam Marks Tab */}
          {activeSection === 'exam-marks' && (
            <FacultyExamMarks />
          )}

          {/* Notes Tab */}
          {activeSection === 'notes' && (
            <div>
              <EnhancedNotes />
            </div>
          )}

          {/* Events Tab */}
          {activeSection === 'events' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Events Management</h2>
                  <p className="text-gray-600">Organize and track department events</p>
                </div>
                <button
                  onClick={() => setShowCreateEventModal(true)}
                  className="bg-slate-900 text-white hover:bg-slate-800 border border-slate-800 px-6 py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </button>
              </div>

              {dashboardState.loading.events ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading events...</p>
                </div>
              ) : facultyEvents && facultyEvents.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {facultyEvents.map((event) => (
                    <div key={event._id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                          <p className="text-gray-600 text-sm line-clamp-2">{event.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          event.category === 'academic' ? 'bg-blue-100 text-blue-800' :
                          event.category === 'cultural' ? 'bg-purple-100 text-purple-800' :
                          event.category === 'sports' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.category}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          {event.attendees?.length || 0} registered
                          {event.maxAttendees && ` / ${event.maxAttendees} max`}
                        </div>
                        {event.location && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {event.location}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {event.targetAcademicYears?.map(year => (
                            <span key={year} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              Year {year}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEditEvent(event)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Event"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteEvent(event._id, event.title)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-w-md mx-auto py-8 px-6 bg-white border border-slate-200 rounded-2xl text-center shadow-sm my-6">
                  <Calendar className="w-10 h-10 text-[#c5a880] mx-auto mb-3" />
                  <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider mb-2">No Events Yet</h3>
                  <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                    Create and manage department events, academic workshops, and seminars.
                  </p>
                  <button
                    onClick={() => setShowCreateEventModal(true)}
                    className="bg-[#0B1220] text-white hover:bg-[#1a253a] px-5 py-2.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all inline-flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Create Your First Event
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeSection === 'analytics' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Reports</h2>
                <p className="text-gray-600">View student performance and engagement metrics</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Student Performance</h3>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Attendance</span>
                      <span className="font-semibold text-green-600">87%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Marks</span>
                      <span className="font-semibold text-blue-600">82%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pass Rate</span>
                      <span className="font-semibold text-purple-600">94%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Content Engagement</h3>
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Notes Downloads</span>
                      <span className="font-semibold text-blue-600">1,234</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Views</span>
                      <span className="font-semibold text-green-600">3,456</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg. Rating</span>
                      <span className="font-semibold text-yellow-600">4.2/5</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    <Clock className="w-5 h-5 text-[#c5a880]" />
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="text-gray-900 font-medium">New student assigned</p>
                      <p className="text-gray-500">2 hours ago</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-900 font-medium">Note uploaded</p>
                      <p className="text-gray-500">1 day ago</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-900 font-medium">Event created</p>
                      <p className="text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <CreateEventModal
          isOpen={showCreateEventModal}
          onClose={handleCloseEventModal}
          onSuccess={handleEventCreated}
          event={selectedEvent}
        />
      )}
    </div>
  );
};

export default FacultyDashboard;
