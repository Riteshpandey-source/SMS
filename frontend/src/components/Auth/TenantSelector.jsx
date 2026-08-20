import React from 'react';
import { Building2, ArrowRight } from 'lucide-react';

const TenantSelector = ({ tenants, onSelect, onCancel }) => {
  return (
    <div className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-xl">
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-black text-[#111827] mb-1">
          Select Institution
        </h2>
        <p className="text-xs text-slate-500 font-semibold">
          Your email is associated with multiple institutions.
        </p>
      </div>

      <div className="space-y-3">
        {tenants.map(tenant => (
          <button
            key={tenant.tenantId}
            onClick={() => onSelect(tenant)}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-[#C6A15B] hover:bg-orange-50/30 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{tenant.name}</p>
                <p className="text-xs text-slate-500">{tenant.subdomain}.campusbuddy.com</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#C6A15B]" />
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        className="w-full mt-6 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

export default TenantSelector;
