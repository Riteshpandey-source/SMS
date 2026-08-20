import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ParentLogin from './ParentLogin';
import ParentRegister from './ParentRegister';
import InstitutionSignup from './InstitutionSignup';
import { GraduationCap, BarChart3, Calendar, Users, Building2 } from 'lucide-react';

const AuthWrapper = () => {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'forgot-password', 'parent-login', 'parent-register', 'institution-signup'

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return (
          <Login
            onSwitchToRegister={() => setCurrentView('register')}
            onSwitchToForgotPassword={() => setCurrentView('forgot-password')}
            onSwitchToParentLogin={() => setCurrentView('parent-login')}
            onSwitchToInstitutionSignup={() => setCurrentView('institution-signup')}
          />
        );
      case 'register':
        return (
          <Register
            onSwitchToLogin={() => setCurrentView('login')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPassword
            onSwitchToLogin={() => setCurrentView('login')}
          />
        );
      case 'parent-login':
        return (
          <ParentLogin
            onSwitchToLogin={() => setCurrentView('login')}
            onSwitchToParentRegister={() => setCurrentView('parent-register')}
          />
        );
      case 'parent-register':
        return (
          <ParentRegister
            onSwitchToLogin={() => setCurrentView('login')}
            onSwitchToParentLogin={() => setCurrentView('parent-login')}
          />
        );
      case 'institution-signup':
        return (
          <InstitutionSignup
            onSwitchToLogin={() => setCurrentView('login')}
          />
        );
      default:
        return (
          <Login
            onSwitchToRegister={() => setCurrentView('register')}
            onSwitchToForgotPassword={() => setCurrentView('forgot-password')}
            onSwitchToParentLogin={() => setCurrentView('parent-login')}
            onSwitchToInstitutionSignup={() => setCurrentView('institution-signup')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#F5F6F8]">

      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0B1220] items-center justify-center p-12 overflow-hidden border-r border-slate-900">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C6A15B]/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[#C6A15B] shadow-inner">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">CampusBuddy</h1>
          </div>
          
          <h2 className="text-3xl lg:text-[2.75rem] font-black text-white leading-[1.1] mb-5">
            Your complete
            <span className="block text-[#C6A15B] mt-1.5">
              campus companion
            </span>
          </h2>
          
          <p className="text-sm text-slate-400 mb-8 leading-relaxed font-medium">
            Attendance tracking, academic records, notes sharing, event management — everything your campus needs, unified in one platform.
          </p>

          {/* Feature cards */}
          <div className="space-y-3">
            {[
              { icon: BarChart3, label: 'Real-time Attendance', desc: 'Track daily & regular attendance' },
              { icon: Calendar, label: 'Academic Portal', desc: 'Marks, grades, and analytics' },
              { icon: Users, label: 'Multi-Role Access', desc: 'Student, Faculty, Admin, Parent' },
            ].map((feature, i) => (
              <div 
                key={feature.label}
                className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:border-[#C6A15B]/20 transition-all duration-300"
              >
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[#C6A15B]">
                  <feature.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{feature.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Dynamic Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10 bg-[#F5F6F8]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[#C6A15B]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">CampusBuddy</h1>
          </div>

          {renderCurrentView()}
        </div>
      </div>
    </div>
  );
};

export default AuthWrapper;