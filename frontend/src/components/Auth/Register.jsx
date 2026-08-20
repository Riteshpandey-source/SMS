import React from 'react';
import { ShieldAlert } from 'lucide-react';

const Register = ({ onSwitchToLogin }) => {
  return (
    <div className="rounded-3xl p-8 sm:p-10 bg-white border border-slate-200 shadow-xl space-y-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-amber-50 border border-amber-100">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900">
          Registration Disabled
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-semibold">
          Student and faculty accounts are created by administrator only.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-150 bg-slate-50 p-6 space-y-3 text-xs font-semibold text-slate-600">
        <p>
          The administrator creates student profiles with designated department, year, and section details.
        </p>
        <p>
          Example student email: <span className="font-bold text-slate-900">ritespandey.it27@gmail.com</span>
        </p>
        <p>
          Example password: <span className="font-bold text-slate-900">R@jecrc</span>
        </p>
        <p>
          Students may utilize the "Forgot Password" link on the sign in page to set a new password.
        </p>
      </div>

      <button
        type="button"
        onClick={onSwitchToLogin}
        className="w-full flex items-center justify-center py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-[#0B1220] rounded-xl hover:bg-[#1a253a] border border-transparent transition-all duration-200"
      >
        Back to Login
      </button>
    </div>
  );
};

export default Register;
