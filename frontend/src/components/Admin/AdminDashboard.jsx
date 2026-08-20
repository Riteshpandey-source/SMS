import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  Filter,
  Network
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';
import AssignmentStats from './AssignmentStats';
import AssignmentManagement from './AssignmentManagement';
import FacultyYearAccess from './FacultyYearAccess';
import UnassignedUsers from './UnassignedUsers';
import AssignmentAuditLog from './AssignmentAuditLog';
import SystemAnalytics from './SystemAnalytics';
import AcademicOverview from './AcademicOverview';
import FacultyStudentHierarchy from './FacultyStudentHierarchy';
import UnifiedUserDepartmentManagement from './UnifiedUserDepartmentManagement';
import FacultyAttendanceOverview from './FacultyAttendanceOverview';
import toast from 'react-hot-toast';

const AdminDashboard = ({ initialSection = 'overview' }) => {
  const { user } = useAuth();
  const { 
    assignmentStats, 
    loading: assignmentLoading, 
    refreshAssignments,
    loadAssignmentStats 
  } = useAssignment();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAssignmentStats();
    }
  }, [user, loadAssignmentStats]);

  console.log('🔧 AdminDashboard rendering:', { 
    user: user?.name, 
    role: user?.role, 
    initialSection, 
    activeSection,
    assignmentStats: assignmentStats ? Object.keys(assignmentStats) : 'null'
  });

  // Only admin can access this component
  if (user?.role !== 'admin') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied</h3>
        <p className="text-red-700">Only administrators can access the admin dashboard.</p>
      </div>
    );
  }

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await refreshAssignments();
      await loadAssignmentStats(true);
      toast.success('Assignment data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh assignments:', error);
      toast.error('Failed to refresh assignment data');
    } finally {
      setRefreshing(false);
    }
  };

  const menuItems = [
    { 
      id: 'analytics', 
      label: 'System Analytics', 
      icon: TrendingUp,
      description: 'System performance and statistics'
    },
    { 
      id: 'hierarchy', 
      label: 'Faculty-Student Hierarchy', 
      icon: Network,
      description: 'Browse faculty and students with detailed records'
    },
    { 
      id: 'users-departments', 
      label: 'Users & Departments', 
      icon: Users,
      description: 'Manage users and departments in one place'
    },
    { 
      id: 'academic', 
      label: 'Academic Overview', 
      icon: BarChart3,
      description: 'All students academic performance'
    },
    { 
      id: 'overview', 
      label: 'Assignments Overview', 
      icon: BarChart3,
      description: 'Assignment statistics and system health'
    },
    { 
      id: 'assignments', 
      label: 'Assignment Management', 
      icon: UserCheck,
      description: 'Manage student-faculty assignments'
    },
    { 
      id: 'faculty-access', 
      label: 'Faculty Attendance Access', 
      icon: Shield,
      description: 'Assign faculty attendance subjects and years'
    },
    {
      id: 'attendance-overview',
      label: 'Attendance Overview',
      icon: Eye,
      description: 'View all faculty attendance records'
    },
    { 
      id: 'unassigned', 
      label: 'Unassigned Users', 
      icon: AlertTriangle,
      description: 'View users without assignments'
    },
    { 
      id: 'audit-log', 
      label: 'Audit Log', 
      icon: Clock,
      description: 'Assignment history and changes'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'analytics':
        return <SystemAnalytics />;
      case 'hierarchy':
        return <FacultyStudentHierarchy />;
      case 'users-departments':
        return <UnifiedUserDepartmentManagement />;
      case 'academic':
        return <AcademicOverview />;
      case 'overview':
        // Only pass stats if it's an object, not an array
        const validStats = assignmentStats && !Array.isArray(assignmentStats) ? assignmentStats : null;
        return <AssignmentStats stats={validStats} loading={assignmentLoading} />;
      case 'assignments':
        return <AssignmentManagement />;
      case 'faculty-access':
        return <FacultyYearAccess />;
      case 'attendance-overview':
        return <FacultyAttendanceOverview />;
      case 'unassigned':
        return <UnassignedUsers />;
      case 'audit-log':
        return <AssignmentAuditLog />;
      default:
        return <AssignmentStats stats={assignmentStats} loading={assignmentLoading} />;
    }
  };  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        {/* Abstract glowing background shapes */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#c5a880]/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-[#c5a880]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Admin Operations Console</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">Configure configurations, user directories, advisor mappings, and system metrics.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-350 font-semibold text-xs sm:text-sm hover:bg-slate-900 hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Logs'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      {assignmentStats && !Array.isArray(assignmentStats) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Students Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{assignmentStats.totalStudents || 0}</p>
              </div>
              <div className="bg-blue-55 p-3 rounded-xl text-blue-600 shadow-inner">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50 text-xs font-semibold">
              <span className="text-emerald-600">{typeof assignmentStats.assignedStudents === 'number' ? assignmentStats.assignedStudents : 0} Assigned</span>
              <span className="text-slate-400">({typeof assignmentStats.unassignedStudents === 'number' ? assignmentStats.unassignedStudents : 0} Open)</span>
            </div>
          </div>

          {/* Faculty Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Faculty</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{assignmentStats.totalFaculty || 0}</p>
              </div>
              <div className="bg-emerald-55 p-3 rounded-xl text-emerald-600 shadow-inner">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50 text-xs font-semibold">
              <span className="text-emerald-600">{typeof assignmentStats.activeFaculty === 'number' ? assignmentStats.activeFaculty : 0} Active</span>
              <span className="text-slate-400">({typeof assignmentStats.inactiveFaculty === 'number' ? assignmentStats.inactiveFaculty : 0} Inactive)</span>
            </div>
          </div>

          {/* Coverage Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Advisor Coverage</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{assignmentStats.coveragePercentage || 0}%</p>
              </div>
              <div className="bg-indigo-55 p-3 rounded-xl text-indigo-600 shadow-inner">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                (assignmentStats.coveragePercentage || 0) >= 80 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                  : (assignmentStats.coveragePercentage || 0) >= 60 
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-150' 
                    : 'bg-red-50 text-red-755 border-red-150'
              }`}>
                {(assignmentStats.coveragePercentage || 0) >= 80 
                  ? 'Optimal Coverage' 
                  : (assignmentStats.coveragePercentage || 0) >= 60 
                    ? 'Average Coverage' 
                    : 'Needs Attention'
                }
              </span>
            </div>
          </div>

          {/* System Health Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Status</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{assignmentStats.systemHealth || 'Healthy'}</p>
              </div>
              <div className="bg-purple-55 p-3 rounded-xl text-purple-600 shadow-inner">
                {assignmentStats.systemHealth === 'Good' || !assignmentStats.systemHealth ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 animate-pulse" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600" />
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50 text-xs font-medium text-slate-400">
              <span>All nodes operational</span>
              <span>Updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel Content & Navigation */}
      <div className="bg-white rounded-2xl border border-slate-250 shadow-md overflow-hidden">
        {/* Attendance Banner Callout */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 via-purple-50/20 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-slate-800">Faculty Subject Attendance Rights</p>
            <p className="text-xs text-slate-500 font-medium">Assign access privileges to teachers for taking daily student attendance.</p>
          </div>
          <button
            onClick={() => setActiveSection('faculty-access')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-650 px-4.5 py-2 text-white font-semibold text-xs hover:bg-indigo-700 transition-all duration-200 shadow-sm active:scale-95 w-full sm:w-auto"
          >
            <Shield className="h-4 w-4" />
            Assign Rights
          </button>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-slate-100 overflow-x-auto scrollbar-none bg-slate-50/20 px-6">
          <nav className="flex space-x-6 min-w-max" aria-label="Tabs">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`relative py-4 px-1 font-semibold text-sm flex items-center space-x-2 transition-all duration-200 outline-none ${
                    isActive
                      ? 'text-purple-600 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Selected Operations Tab Render */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
