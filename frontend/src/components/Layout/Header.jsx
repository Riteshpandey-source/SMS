import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown, Menu, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { userService } from '../../services/userService';

const Header = ({ title, subtitle, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowProfileMenu(false);
  };

  const getAvatarUrl = () => {
    if (user?.avatar) {
      try {
        const avatarData = JSON.parse(user.avatar);
        return avatarData.small?.url || avatarData.medium?.url;
      } catch (e) {
        // If parsing fails, use default
      }
    }
    return userService.getAvatarUrl(user?.id, 'small');
  };

  const getUserDisplayName = () => {
    return user?.name || 'User';
  };

  const getUserRole = () => {
    const role = user?.role || 'student';
    return role?.charAt(0)?.toUpperCase() + role?.slice(1) || 'Student';
  };

  return (
    <header className="relative bg-white border-b border-slate-200/80 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile View Toggle */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={onMenuClick}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            aria-label="Open sidebar navigation menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white">
            <GraduationCap className="w-4 h-4 text-[#c5a880]" />
          </div>
        </div>
        
        {/* Header Title Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 truncate tracking-tight">
              {title}
            </h1>
            {tenant && tenant.tenantId !== 'platform' && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider border border-slate-200">
                {tenant.name}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 hidden sm:block font-semibold">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Profile Dropdown Component */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={profileMenuRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              <div className="relative">
                <img
                  src={getAvatarUrl()}
                  alt="Profile"
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 hover:ring-slate-350"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName())}&size=28&background=0f172a&color=cbd5e1&bold=true`;
                  }}
                />
              </div>
              <div className="hidden md:block text-left">
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {getUserDisplayName()}
                </span>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                  {getUserRole()}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden md:block" />
            </button>
 
            {/* Popover Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2.5 w-52 rounded-xl bg-white shadow-lg border border-slate-200 py-1.5 z-50 animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-950 truncate">{getUserDisplayName()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">{user?.email}</p>
                </div>
                
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate(`/${user?.role}/profile`);
                    }}
                    className="flex items-center w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 gap-2.5 transition-colors font-semibold"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Profile</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate(`/${user?.role}/settings`);
                    }}
                    className="flex items-center w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 gap-2.5 transition-colors font-semibold"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Settings</span>
                  </button>
                </div>
                
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 gap-2.5 transition-colors font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
