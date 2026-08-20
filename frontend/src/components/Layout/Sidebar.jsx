import React from 'react';
import { 
  Home, 
  Calendar, 
  BookOpen, 
  User, 
  GraduationCap,
  BarChart3,
  Settings,
  Users,
  Shield,
  CreditCard,
  MessageSquare,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();

  // Build menu items based on user role
  const getMenuItems = () => {
    if (user?.role === 'super_admin') {
      return [
        { id: 'dashboard', label: 'Platform Overview', icon: Home },
        { id: 'profile', label: 'Account Profile', icon: User }
      ];
    }

    if (user?.role === 'admin') {
      return [
        { id: 'dashboard', label: 'Console Overview', icon: Home },
        { id: 'users-departments', label: 'Users & Depts', icon: Users },
        { id: 'faculty-access', label: 'Attendance Rights', icon: Shield },
        { id: 'routines', label: 'Schedules', icon: Calendar },
        { id: 'profile', label: 'Account Profile', icon: User }
      ];
    }

    if (user?.role === 'parent') {
      return [
        { id: 'dashboard', label: 'Parent Desk', icon: Home },
        { id: 'profile', label: 'My Profile', icon: User }
      ];
    }

    // Base menu items for students and faculty
    return [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'academic', label: 'Academics', icon: BarChart3 },
      { id: 'events', label: 'Events & News', icon: Calendar },
      { id: 'notes', label: 'Study Resources', icon: BookOpen },
      { id: 'routines', label: 'Timetable', icon: Calendar },
      { id: 'profile', label: 'Profile', icon: User }
    ];
  };

  const menuItems = getMenuItems();

  const getRoleBadge = () => {
    const role = user?.role;
    if (role === 'super_admin') return { text: 'PLATFORM ADMIN', color: 'border-purple-600/30 bg-purple-950/20 text-purple-400 font-bold' };
    if (role === 'admin') return { text: 'ADMINISTRATOR', color: 'border-amber-600/30 bg-amber-950/20 text-amber-500 font-bold' };
    if (role === 'faculty') return { text: 'FACULTY MEMBER', color: 'border-blue-600/30 bg-blue-950/20 text-blue-400 font-semibold' };
    if (role === 'parent') return { text: 'SPONSOR/PARENT', color: 'border-slate-700/50 bg-slate-800/40 text-slate-350 font-semibold' };
    return { text: 'STUDENT PORTAL', color: 'border-emerald-600/30 bg-emerald-950/20 text-emerald-400 font-bold' };
  };

  const badge = getRoleBadge();

  return (
    <div className="hidden md:flex md:w-64 flex-col h-full bg-[#0a0e1a] border-r border-slate-900">
      {/* Brand Logo Header */}
      <div className="p-6 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800 text-white">
            <GraduationCap className="w-5 h-5 text-[#c5a880]" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">CampusBuddy</h1>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`nav-link w-full text-left group ${
                    isActive ? 'nav-link-active' : 'nav-link-inactive'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${
                    isActive 
                      ? 'text-[#c5a880]' 
                      : 'text-slate-500 group-hover:text-slate-300'
                  }`} />
                  <span className="font-semibold text-xs tracking-wide">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Information Card */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/20">
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-3">
            <img
              src={`/api/users/avatar/${user?._id}/small`}
              alt="Profile"
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-800"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1e293b&color=cbd5e1&size=32&bold=true`;
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{user?.name || 'User'}</p>
              <div className="flex flex-col mt-1">
                <span className={`inline-flex items-center self-start px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border tracking-wider ${badge.color}`}>
                  {badge.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
