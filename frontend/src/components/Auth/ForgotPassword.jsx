import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, ArrowLeft, Send } from 'lucide-react';

const ForgotPassword = ({ onSwitchToLogin }) => {
  const { forgotPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }

    const result = await forgotPassword(email);
    if (result.success) {
      setIsSubmitted(true);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-3xl p-8 sm:p-10 bg-white border border-slate-200 shadow-xl">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
            <Send className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Check your email
          </h2>
          <p className="text-sm text-slate-600 font-semibold">
            We've sent a password reset link to <strong className="text-slate-950">{email}</strong>
          </p>
          <p className="text-xs text-slate-400">
            Didn't receive the email? Check your spam folder or try again.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => setIsSubmitted(false)}
            className="w-full flex justify-center py-3.5 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-800 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            Try again
          </button>
          
          <button
            onClick={onSwitchToLogin}
            className="w-full flex justify-center items-center py-2 text-xs font-bold uppercase tracking-wider text-[#C6A15B] hover:text-[#b48f4a] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-8 sm:p-10 bg-white border border-slate-200 shadow-xl">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mb-2">
          Forgot password?
        </h2>
        <p className="text-sm text-slate-500 font-semibold">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
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
              value={email}
              onChange={handleEmailChange}
              className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border text-slate-800 placeholder-slate-400 text-sm font-semibold
                focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/30 focus:border-[#C6A15B] transition-all duration-200 ${
                emailError ? 'border-rose-300' : 'border-slate-200'
              }`}
              placeholder="Enter your email"
            />
          </div>
          {emailError && (
            <p className="mt-1.5 text-xs text-rose-600 font-semibold">{emailError}</p>
          )}
        </div>

        <div className="space-y-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-[#0B1220] rounded-xl hover:bg-[#1a253a] border border-transparent transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </div>
            ) : (
              'Send reset link'
            )}
          </button>

          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full flex justify-center items-center py-2 text-xs font-bold uppercase tracking-wider text-slate-650 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;