import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Users } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ParentLogin = ({ onSwitchToLogin, onSwitchToParentRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/parent/login`,
        {
          email: formData.email.toLowerCase(),
          password: formData.password
        }
      );

      if (response.data.success) {
        const { user, session } = response.data.data;
        
        // Store tokens and user data
        localStorage.setItem('accessToken', session.accessToken);
        localStorage.setItem('refreshToken', session.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast.success('Login successful!');
        
        // Reload the page to trigger authentication check and show parent dashboard
        window.location.reload();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
      setFormErrors({ submit: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl p-8 sm:p-10 bg-white border border-slate-200 shadow-xl">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mb-2">
          Parent Portal Login
        </h2>
        <p className="text-sm text-slate-500 font-semibold">
          Sign in to view your child's academic progress
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border text-slate-800 placeholder-slate-400 text-sm font-semibold
                focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                formErrors.email ? 'border-rose-300' : 'border-slate-200'
              }`}
              placeholder="Enter your email"
            />
          </div>
          {formErrors.email && (
            <p className="mt-1.5 text-xs text-rose-600 font-semibold">{formErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full pl-11 pr-12 py-3.5 rounded-xl bg-white border text-slate-800 placeholder-slate-400 text-sm font-semibold
                focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                formErrors.password ? 'border-rose-300' : 'border-slate-200'
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600 transition-colors" />
              ) : (
                <Eye className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600 transition-colors" />
              )}
            </button>
          </div>
          {formErrors.password && (
            <p className="mt-1.5 text-xs text-rose-600 font-semibold">{formErrors.password}</p>
          )}
        </div>

        {/* Error Message */}
        {formErrors.submit && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100">
            <p className="text-sm text-rose-650 font-semibold">{formErrors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-[#0B1220] rounded-xl hover:bg-[#1a253a] border border-transparent transition-all duration-200 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </div>
          ) : (
            'Sign in as Parent'
          )}
        </button>

        {/* Links */}
        <div className="flex flex-col space-y-3 text-center mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onSwitchToParentRegister}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            Don't have a parent account? Register
          </button>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            Back to student/faculty login
          </button>
        </div>
      </form>
    </div>
  );
};

export default ParentLogin;
