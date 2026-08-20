import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, UserPlus, Users } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ParentRegister = ({ onSwitchToLogin, onSwitchToParentLogin }) => {
  const [step, setStep] = useState(1); // 1: Verify child, 2: Register parent
  const [isLoading, setIsLoading] = useState(false);
  const [childData, setChildData] = useState(null);
  const [formData, setFormData] = useState({
    childEmail: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const validateChildEmail = () => {
    const errors = {};

    if (!formData.childEmail) {
      errors.childEmail = 'Student email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.childEmail)) {
      errors.childEmail = 'Please enter a valid email';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateParentForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVerifyChild = async (e) => {
    e.preventDefault();
    
    if (!validateChildEmail()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/parent/verify-child`,
        { childEmail: formData.childEmail }
      );

      if (response.data.success) {
        setChildData(response.data.data.child);
        setStep(2);
        toast.success('Student found! Please complete your registration.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to verify student email';
      setFormErrors({ childEmail: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateParentForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/parent/register`,
        {
          name: formData.name.trim(),
          email: formData.email.toLowerCase(),
          password: formData.password,
          childEmail: formData.childEmail.toLowerCase()
        }
      );

      if (response.data.success) {
        toast.success('Registration successful! Please check your email for verification.');
        // Switch to parent login after successful registration
        if (onSwitchToParentLogin) {
          onSwitchToParentLogin();
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Registration failed';
      toast.error(errorMessage);
      setFormErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl p-8 sm:p-10 bg-white border border-slate-200 shadow-xl">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mb-2">
          Parent Registration
        </h2>
        <p className="text-sm text-slate-500 font-semibold">
          {step === 1 
            ? "Enter your child's student email to get started"
            : "Complete your registration to access your child's academic data"
          }
        </p>
      </div>

      {step === 1 ? (
        <form className="space-y-6" onSubmit={handleVerifyChild}>
          <div>
            <label htmlFor="childEmail" className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-2">
              Student Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4.5 w-4.5 text-slate-400" />
              </div>
              <input
                id="childEmail"
                name="childEmail"
                type="email"
                autoComplete="email"
                value={formData.childEmail}
                onChange={handleChange}
                className={`w-full pl-11 pr-4 py-3 rounded-xl bg-white border text-slate-800 placeholder-slate-400 text-sm font-semibold
                  focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                  formErrors.childEmail ? 'border-rose-300' : 'border-slate-200'
                }`}
                placeholder="Enter your child's student email"
              />
            </div>
            {formErrors.childEmail && (
              <p className="mt-1.5 text-xs text-rose-600 font-semibold">{formErrors.childEmail}</p>
            )}
            <p className="mt-2 text-xs text-slate-450 font-medium">
              This should be the email address your child used to register on CampusBuddy
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-[#0B1220] rounded-xl hover:bg-[#1a253a] border border-transparent transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying...
              </div>
            ) : (
              'Verify Student'
            )}
          </button>

          {/* Links */}
          <div className="flex flex-col space-y-3 text-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onSwitchToParentLogin}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              Already have a parent account? Sign in
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
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Child Info Display */}
          {childData && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
              <h3 className="font-bold text-slate-850 uppercase tracking-wider mb-2">Student Verified</h3>
              <div className="space-y-1 text-slate-600 font-semibold">
                <p><span className="text-slate-400">Name:</span> {childData.name}</p>
                <p><span className="text-slate-400">Email:</span> {childData.email}</p>
                <p><span className="text-slate-400">Department:</span> {childData.department}</p>
                <p><span className="text-slate-400">Year:</span> {childData.academicYear}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Parent Name Field */}
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-2">
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-white border text-slate-800 placeholder-slate-400 text-sm font-semibold
                    focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                    formErrors.name ? 'border-rose-300' : 'border-slate-200'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {formErrors.name && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">{formErrors.name}</p>
              )}
            </div>

            {/* Parent Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-2">
                Your Email Address
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
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-white border text-slate-800 placeholder-slate-400 text-sm font-semibold
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
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-12 py-3 rounded-xl bg-white border text-slate-800 placeholder-slate-400 text-sm font-semibold
                    focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                    formErrors.password ? 'border-rose-300' : 'border-slate-200'
                  }`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-650 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-12 py-3 rounded-xl bg-white border text-slate-800 placeholder-slate-400 text-sm font-semibold
                    focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                    formErrors.confirmPassword ? 'border-rose-300' : 'border-slate-200'
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">{formErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {formErrors.submit && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100">
              <p className="text-sm text-rose-650 font-semibold">{formErrors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-[#0B1220] rounded-xl hover:bg-[#1a253a] border border-transparent transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registering...
                </div>
              ) : (
                'Register'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ParentRegister;
