import React, { useState, useEffect } from 'react';
import { Building2, Users, GraduationCap, ArrowRight, ShieldCheck, UserPlus, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const metricsRes = await superAdminService.getDashboardMetrics();
      if (metricsRes.success) {
        setMetrics(metricsRes.data.metrics);
        setTenants(metricsRes.data.recentTenants);
      }
    } catch (error) {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTenantStatus = async (id, status) => {
    try {
      const res = await superAdminService.updateTenantStatus(id, status);
      if (res.success) {
        toast.success(res.message);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deleteTenant = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the institution "${name}" and all its users? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await superAdminService.deleteTenant(id);
      if (res.success) {
        toast.success(res.message);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to delete institution');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C6A15B]/30 border-t-[#C6A15B] rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading platform data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-xl text-[#C6A15B]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Platform Overview</h1>
            <p className="text-sm text-slate-500 font-medium">Manage all institutions and monitor platform health.</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Institutions', value: metrics?.totalTenants || 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Institutions', value: metrics?.activeTenants || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Users', value: metrics?.totalUsers || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Students & Faculty', value: (metrics?.totalStudents || 0) + (metrics?.totalFaculty || 0), icon: GraduationCap, color: 'text-[#C6A15B]', bg: 'bg-orange-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-2">{stat.value.toLocaleString()}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Institutions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Recent Institutions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Institution</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Code / Subdomain</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map(tenant => (
                <tr key={tenant._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tenant.name}</p>
                        <p className="text-xs text-slate-500">Joined {new Date(tenant.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-semibold text-slate-900">{tenant.code}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{tenant.subdomain}.campusbuddy.com</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-purple-50 text-purple-700 uppercase tracking-wider border border-purple-200">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      tenant.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      tenant.status === 'suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {tenant.status === 'active' ? (
                        <button
                          onClick={() => updateTenantStatus(tenant._id, 'suspended')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Suspend"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateTenantStatus(tenant._id, 'active')}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Activate"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteTenant(tenant._id, tenant.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Institution"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {tenants.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-sm font-medium text-slate-500">
                    No institutions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
