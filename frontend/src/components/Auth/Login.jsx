import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { authService } from '../../services/authService';
import { Eye, EyeOff, Mail, Lock, LogIn, GraduationCap, ArrowRight, Users, BarChart3, Calendar, Building2 } from 'lucide-react';

const Login = ({ onSwitchToForgotPassword, onSwitchToParentLogin, onSwitchToInstitutionSignup }) => {
  const { login, isLoading: authLoading, error } = useAuth();
  const { tenant, setTenant } = useTenant();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantId: tenant?.tenantId || ''
  });
  const [identifying, setIdentifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const [errorMsg, setErrorMsg] = useState(null);

  // Sync formData tenantId if tenant changes
  useEffect(() => {
    if (tenant?.tenantId) {
      setFormData(prev => ({ ...prev, tenantId: tenant.tenantId }));
    }
  }, [tenant]);

  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleIdentifyTenant = async () => {
    if (!formData.email || formErrors.email) return;
    
    try {
      setIdentifying(true);
      setErrorMsg(null);
      const res = await authService.identifyTenant(formData.email);
      if (res.success && res.data) {
        setTenant(res.data);
      }
    } catch (err) {
      // If identifying fails, we just don't set a tenant.
      // The user might be a super admin or will get a 400 multiple accounts error on login.
      console.warn('Tenant identification failed', err);
    } finally {
      setIdentifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    
    if (!validateForm()) {
      return;
    }

    // Try identifying tenant if we don't have one and email has a domain
    if (!tenant && formData.email) {
      await handleIdentifyTenant();
    }

    const payload = { ...formData };
    if (tenant) {
      payload.tenantId = tenant.tenantId;
    }

    const result = await login(payload);
    if (!result.success) {
      if (typeof result.error === 'string' && result.error.includes('specify your institution')) {
        setErrorMsg('Multiple accounts found. Please use your institution-specific URL to log in.');
      } else {
        setErrorMsg(typeof result.error === 'string' ? result.error : 'Login failed');
      }
    }
  };

  return (
    <div className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-xl">
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-black text-[#111827] mb-1">
          {tenant ? `Sign in to ${tenant.name}` : 'Welcome to CampusBuddy'}
        </h2>
        <p className="text-xs text-slate-500 font-semibold">
          {tenant ? 'Enter your credentials to continue' : 'Sign in to access your workspace'}
        </p>
      </div>

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        {/* Email Field */}
        <div>
          <label htmlFor="login-email" className="block text-[10px] font-bold text-slate-655 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-450" />
            </div>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => {
                  if (!tenant && formData.email && !formErrors.email) {
                    handleIdentifyTenant();
                  }
                }}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border text-slate-800 placeholder-slate-400 text-xs font-semibold
                  focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                formErrors.email ? 'border-rose-300' : 'border-slate-200'
              }`}
              placeholder="you@college.edu"
            />
          </div>
          {formErrors.email && (
            <p className="mt-1 text-[10px] text-rose-600 font-semibold">{formErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="login-password" className="block text-[10px] font-bold text-slate-655 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-450" />
            </div>
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full pl-10 pr-11 py-2.5 rounded-lg bg-white border text-slate-800 placeholder-slate-400 text-xs font-semibold
                focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                formErrors.password ? 'border-rose-300' : 'border-slate-200'
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors" />
              ) : (
                <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors" />
              )}
            </button>
          </div>
          {formErrors.password && (
            <p className="mt-1 text-[10px] text-rose-600 font-semibold">{formErrors.password}</p>
          )}
        </div>

        {/* Forgot password link */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onSwitchToForgotPassword}
            className="text-[10px] text-[#C6A15B] hover:text-[#b48f4a] font-bold transition-colors uppercase tracking-wider"
          >
            Forgot password?
          </button>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Admin Creation Only
          </span>
        </div>

        {/* Error Message */}
        {(error || errorMsg) && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
            <p className="text-xs text-rose-650 font-semibold">{errorMsg || error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={authLoading || identifying}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-white bg-[#0B1220] rounded-xl hover:bg-[#1a253a] hover:border-[#C6A15B] border border-transparent transition-all duration-200 disabled:opacity-50"
        >
          {(authLoading || identifying) ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {identifying ? 'Identifying...' : 'Signing in...'}
            </div>
          ) : (
            <>
              Sign in
              <ArrowRight className="w-3.5 h-3.5 text-[#C6A15B]" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex flex-col gap-3">
          {/* Parent login */}
          <button
            type="button"
            onClick={onSwitchToParentLogin}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Users className="w-4 h-4 text-[#C6A15B]" />
            Parent Portal Sign In
          </button>
          
          {/* Register Institution */}
          <button
            type="button"
            onClick={onSwitchToInstitutionSignup}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-300 bg-transparent text-slate-600 text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition-all"
          >
            <Building2 className="w-4 h-4 text-slate-400" />
            Register Your Institution
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
