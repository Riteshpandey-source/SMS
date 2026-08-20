import React, { useState } from 'react';
import { Building2, Mail, Lock, User, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

const InstitutionSignup = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    institutionName: '',
    subdomain: '',
    type: 'college',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.institutionName || !formData.subdomain) {
      toast.error('Please fill in institution details');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      toast.error('Please fill in admin details');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.registerInstitution(formData);
      if (res.success) {
        toast.success(res.message);
        onSwitchToLogin();
      } else {
        toast.error(res.error?.message || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-xl">
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-black text-[#111827] mb-1">
          Register Institution
        </h2>
        <p className="text-xs text-slate-500 font-semibold">
          {step === 1 ? 'Step 1: Institution Details' : 'Step 2: Admin Account'}
        </p>
      </div>

      <form className="space-y-4" onSubmit={step === 1 ? handleNext : handleSubmit}>
        {step === 1 ? (
          <>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Institution Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="institutionName"
                  type="text"
                  required
                  value={formData.institutionName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-[#C6A15B] transition-all"
                  placeholder="e.g. JECRC Foundation"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Workspace Subdomain
              </label>
              <div className="relative flex items-center">
                <input
                  name="subdomain"
                  type="text"
                  required
                  value={formData.subdomain}
                  onChange={handleChange}
                  className="w-full pl-4 pr-32 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-[#C6A15B] transition-all"
                  placeholder="jecrc"
                />
                <span className="absolute right-4 text-xs font-semibold text-slate-400 pointer-events-none">
                  .campusbuddy.com
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Institution Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#C6A15B] transition-all"
              >
                <option value="college">College / University</option>
                <option value="school">School (K-12)</option>
                <option value="institute">Training Institute</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 mt-2 text-xs font-bold uppercase tracking-widest text-white bg-[#0B1220] rounded-xl hover:bg-[#1a253a] transition-all"
            >
              Continue <ArrowRight className="w-3.5 h-3.5 text-[#C6A15B]" />
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Admin Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="adminName"
                  type="text"
                  required
                  value={formData.adminName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-[#C6A15B] transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Admin Email (Work)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="adminEmail"
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-[#C6A15B] transition-all"
                  placeholder="admin@institution.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-[#C6A15B] transition-all"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="adminPassword"
                  type="password"
                  required
                  value={formData.adminPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-[#C6A15B] transition-all"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-[2] flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-white bg-[#0B1220] rounded-xl hover:bg-[#1a253a] transition-all disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </>
        )}
      </form>
      
      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-xs font-bold text-[#C6A15B] hover:text-[#b48f4a] uppercase tracking-wider"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
};

export default InstitutionSignup;
