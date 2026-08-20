import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { X, Home, Calendar, BookOpen, User, GraduationCap, BarChart3, Settings, Users, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { YearProvider } from './contexts/YearContext';
import { AssignmentProvider } from './contexts/AssignmentContext';
import { AcademicProvider } from './contexts/AcademicContext.jsx';
import AuthWrapper from './components/Auth/AuthWrapper';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import Academic from './components/Academic/Academic';
import Events from './components/Events/Events';
import Notes from './components/Notes/Notes';
import Forum from './components/Forum/Forum';
import Notifications from './components/Notifications/Notifications';
import Profile from './components/Profile/Profile';
import SettingsView from './components/Settings/Settings';
import FacultyDashboard from './components/Faculty/FacultyDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import StudentDashboard from './components/Student/StudentDashboard';
import ParentDashboard from './components/Parent/ParentDashboard';
import RoutinePortal from './components/Routines/RoutinePortal';
import ErrorBoundary from './components/Common/ErrorBoundary';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';

const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const MainApp = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize theme on mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'default-navy';
    document.documentElement.className = 'theme-' + savedTheme;
  }, []);

  // Compute activeTab from URL pathname
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.startsWith('/academic')) return 'academic';
    if (path.startsWith('/events')) return 'events';
    if (path.startsWith('/notes')) return 'notes';
    if (path.startsWith('/routines')) return 'routines';
    if (path.startsWith('/forum')) return 'forum';
    if (path.startsWith('/notifications')) return 'notifications';
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const activeTab = getActiveTabFromPath();

  const handleTabChange = (tabId) => {
    setMobileMenuOpen(false);
    if (tabId === 'dashboard') {
      navigate('/dashboard');
    } else if (tabId === 'profile') {
      navigate(`/${user?.role}/profile`);
    } else {
      navigate(`/${tabId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl animate-float animate-delay-300" />
        
        <div className="text-center relative z-10 animate-fade-in">
          <div className="relative inline-flex mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -inset-2 rounded-2xl bg-brand-500/20 blur-lg animate-pulse-glow -z-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">CampusBuddy</h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading your campus…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthWrapper />;
  }

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        if (user?.role === 'admin') return 'Admin Dashboard';
        if (user?.role === 'parent') return 'Parent Portal';
        return user?.role === 'faculty' ? 'Faculty Dashboard' : 'Dashboard';
      case 'academic':
        return 'Academic Portal';
      case 'events':
        return user?.role === 'faculty' ? 'Faculty Events' : 'Events';
      case 'notes':
        return 'Study Notes';
      case 'routines':
        return 'Class Routines';
      case 'forum':
        return 'Discussion Forum';
      case 'notifications':
        return 'Notifications';
      case 'profile':
        return 'Profile';
      case 'settings':
        return 'Settings';
      default:
        return 'CampusBuddy';
    }
  };

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        if (user?.role === 'admin') return 'Manage student-faculty assignments and system settings';
        if (user?.role === 'parent') return "View your child's academic progress and performance";
        return user?.role === 'faculty'
          ? 'Manage your department activities and track performance'
          : 'Your personalized overview of campus activities';
      case 'academic':
        return 'Track your attendance, marks, and academic progress';
      case 'events':
        return user?.role === 'faculty'
          ? 'Create and manage events for your students'
          : 'Discover and manage campus events';
      case 'notes':
        return 'Share and access study materials';
      case 'routines':
        return user?.role === 'admin'
          ? 'Upload class routines for departments and years'
          : 'View your department’s class routine';
      case 'forum':
        return 'Get help and help others with academic questions';
      case 'notifications':
        return 'Stay updated with your campus activities';
      case 'profile':
        return 'Manage your account and view achievements';
      case 'settings':
        return 'Manage your account settings and preferences';
      default:
        return '';
    }
  };

  const getMobileMenuItems = () => {
    if (user?.role === 'super_admin') {
      return [
        { id: 'dashboard', label: 'Platform Overview', icon: Home },
        { id: 'profile', label: 'Profile', icon: User }
      ];
    }

    if (user?.role === 'admin') {
      return [
        { id: 'dashboard', label: 'Admin Dashboard', icon: Settings },
        { id: 'users-departments', label: 'Users & Departments', icon: Users },
        { id: 'faculty-access', label: 'Faculty Access', icon: Shield },
        { id: 'routines', label: 'Routines', icon: Calendar },
        { id: 'profile', label: 'Profile', icon: User }
      ];
    }

    if (user?.role === 'parent') {
      return [
        { id: 'dashboard', label: 'Parent Portal', icon: Users },
        { id: 'profile', label: 'Profile', icon: User }
      ];
    }

      return [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'academic', label: 'Academic', icon: BarChart3 },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'notes', label: 'Notes', icon: BookOpen },
        { id: 'routines', label: 'Routines', icon: Calendar },
        { id: 'profile', label: 'Profile', icon: User }
      ];
  };

  const mobileMenuItems = getMobileMenuItems();

  return (
    <div className="flex h-screen bg-gray-50 bg-pattern">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />
          
          {/* Slide-in Panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 shadow-2xl flex flex-col animate-slide-in">
            {/* Panel Header */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">CampusBuddy</h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {user?.role === 'admin' ? 'Admin Menu' : 'Navigation'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-3 py-2">
              <ul className="space-y-1">
                {mobileMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <li 
                      key={item.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    >
                      <button
                        type="button"
                        onClick={() => handleTabChange(item.id)}
                        className={`nav-link w-full text-left ${
                          isActive ? 'nav-link-active' : 'nav-link-inactive'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${
                          isActive ? 'bg-brand-500/20' : ''
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            isActive ? 'text-brand-400' : 'text-slate-500'
                          }`} />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* User Card */}
            <div className="p-3">
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <img
                    src={`/api/users/avatar/${user?._id}/small`}
                    alt="Profile"
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-white/10"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=4f46e5&color=fff&size=32&bold=true`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={getPageTitle()} subtitle={getPageSubtitle()} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <div className="animate-fade-in">
            <Routes>
              {/* Role-Specific Protected Profiles */}
              <Route path="/student/profile" element={
                <RoleProtectedRoute allowedRoles={['student']}><Profile /></RoleProtectedRoute>
              } />
              <Route path="/faculty/profile" element={
                <RoleProtectedRoute allowedRoles={['faculty']}><Profile /></RoleProtectedRoute>
              } />
              <Route path="/parent/profile" element={
                <RoleProtectedRoute allowedRoles={['parent']}><Profile /></RoleProtectedRoute>
              } />
              <Route path="/admin/profile" element={
                <RoleProtectedRoute allowedRoles={['admin']}><Profile /></RoleProtectedRoute>
              } />
              <Route path="/institution_admin/profile" element={
                <RoleProtectedRoute allowedRoles={['institution_admin']}><Profile /></RoleProtectedRoute>
              } />
              <Route path="/super_admin/profile" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}><Profile /></RoleProtectedRoute>
              } />

              {/* Role-Specific Protected Settings */}
              <Route path="/student/settings" element={
                <RoleProtectedRoute allowedRoles={['student']}><SettingsView /></RoleProtectedRoute>
              } />
              <Route path="/faculty/settings" element={
                <RoleProtectedRoute allowedRoles={['faculty']}><SettingsView /></RoleProtectedRoute>
              } />
              <Route path="/parent/settings" element={
                <RoleProtectedRoute allowedRoles={['parent']}><SettingsView /></RoleProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <RoleProtectedRoute allowedRoles={['admin']}><SettingsView /></RoleProtectedRoute>
              } />
              <Route path="/institution_admin/settings" element={
                <RoleProtectedRoute allowedRoles={['institution_admin']}><SettingsView /></RoleProtectedRoute>
              } />
              <Route path="/super_admin/settings" element={
                <RoleProtectedRoute allowedRoles={['super_admin']}><SettingsView /></RoleProtectedRoute>
              } />

              {/* General Tab Routes */}
              <Route path="/academic" element={
                user?.role === 'student' ? <Academic initialSection="overview" onNavigate={handleTabChange} /> :
                user?.role === 'faculty' ? <FacultyDashboard initialSection="students" onNavigate={handleTabChange} /> :
                <Academic initialSection="overview" onNavigate={handleTabChange} />
              } />
              <Route path="/events" element={
                user?.role === 'faculty' ? <FacultyDashboard initialSection="events" onNavigate={handleTabChange} /> :
                user?.role === 'student' ? <StudentDashboard initialSection="events" onNavigate={handleTabChange} /> :
                <Events />
              } />
              <Route path="/notes" element={
                user?.role === 'student' ? <StudentDashboard initialSection="notes" onNavigate={handleTabChange} /> :
                <Notes />
              } />
              <Route path="/routines" element={<RoutinePortal />} />

              {/* Admin specific routes */}
              <Route path="/users-departments" element={
                <RoleProtectedRoute allowedRoles={['admin']}><AdminDashboard initialSection="users-departments" /></RoleProtectedRoute>
              } />
              <Route path="/faculty-access" element={
                <RoleProtectedRoute allowedRoles={['admin']}><AdminDashboard initialSection="faculty-access" /></RoleProtectedRoute>
              } />

              {/* Fallback to Dashboard based on role */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                user?.role === 'super_admin' ? <SuperAdminDashboard /> :
                user?.role === 'admin' ? <AdminDashboard initialSection="overview" /> :
                user?.role === 'parent' ? <ParentDashboard /> :
                user?.role === 'faculty' ? <FacultyDashboard initialSection="overview" onNavigate={handleTabChange} /> :
                <StudentDashboard initialSection="overview" onNavigate={handleTabChange} />
              } />
              
              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <AuthProvider>
          <YearProvider>
          <AssignmentProvider>
            <AcademicProvider>
              <MainApp />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1e293b',
                    color: '#f1f5f9',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '12px 16px',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#34d399',
                      secondary: '#1e293b',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#f87171',
                      secondary: '#1e293b',
                    },
                  },
                }}
              />
            </AcademicProvider>
          </AssignmentProvider>
        </YearProvider>
      </AuthProvider>
      </TenantProvider>
    </ErrorBoundary>
  );
};

export default App;
