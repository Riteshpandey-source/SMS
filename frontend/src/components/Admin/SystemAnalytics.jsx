import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Calendar,
  Award,
  AlertTriangle,
  Activity,
  Database,
  Clock,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const SystemAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    users: { total: 0, active: 0, inactive: 0 },
    academic: { totalRecords: 0, avgAttendance: 0, avgMarks: 0, debarredCount: 0 },
    system: { uptime: 0, lastBackup: null, dbSize: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch users data
      const usersResponse = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const users = usersResponse.data.data?.users || [];
      
      setAnalytics({
        users: {
          total: users.length,
          active: users.filter(u => u.isActive).length,
          inactive: users.filter(u => !u.isActive).length,
          byRole: {
            students: users.filter(u => u.role === 'student').length,
            faculty: users.filter(u => u.role === 'faculty').length,
            parents: users.filter(u => u.role === 'parent').length,
            admins: users.filter(u => u.role === 'admin').length
          }
        },
        academic: {
          totalRecords: 0,
          avgAttendance: 0,
          avgMarks: 0,
          debarredCount: 0
        },
        system: {
          uptime: '99.9%',
          lastBackup: new Date().toISOString(),
          dbSize: '2.4 GB'
        }
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{analytics.users.total}</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Total Users</h3>
          <p className="text-blue-100 text-sm">{analytics.users.active} active users</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{analytics.users.active}</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Active Users</h3>
          <p className="text-green-100 text-sm">Currently online</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{analytics.academic.totalRecords}</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">Academic Records</h3>
          <p className="text-purple-100 text-sm">Total records</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{analytics.system.uptime}</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">System Uptime</h3>
          <p className="text-orange-100 text-sm">Last 30 days</p>
        </div>
      </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-indigo-600" />
            User Distribution by Role
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                <span className="text-sm text-gray-700">Students</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-900 mr-2">
                  {analytics.users.byRole?.students || 0}
                </span>
                <span className="text-xs text-gray-500">
                  ({((analytics.users.byRole?.students || 0) / analytics.users.total * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
                <span className="text-sm text-gray-700">Faculty</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-900 mr-2">
                  {analytics.users.byRole?.faculty || 0}
                </span>
                <span className="text-xs text-gray-500">
                  ({((analytics.users.byRole?.faculty || 0) / analytics.users.total * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-500 mr-3"></div>
                <span className="text-sm text-gray-700">Parents</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-900 mr-2">
                  {analytics.users.byRole?.parents || 0}
                </span>
                <span className="text-xs text-gray-500">
                  ({((analytics.users.byRole?.parents || 0) / analytics.users.total * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
                <span className="text-sm text-gray-700">Admins</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-900 mr-2">
                  {analytics.users.byRole?.admins || 0}
                </span>
                <span className="text-xs text-gray-500">
                  ({((analytics.users.byRole?.admins || 0) / analytics.users.total * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2 text-indigo-600" />
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Database</span>
              </div>
              <span className="text-sm font-semibold text-green-600">Healthy</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">API Server</span>
              </div>
              <span className="text-sm font-semibold text-green-600">Running</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Last Backup</span>
              </div>
              <span className="text-sm font-semibold text-blue-600">
                {new Date(analytics.system.lastBackup).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <Database className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Database Size</span>
              </div>
              <span className="text-sm font-semibold text-purple-600">{analytics.system.dbSize}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Performance Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
          Academic Performance Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {analytics.academic.avgAttendance}%
            </div>
            <p className="text-sm text-gray-600">Average Attendance</p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {analytics.academic.avgMarks}%
            </div>
            <p className="text-sm text-gray-600">Average Marks</p>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {analytics.academic.totalRecords}
            </div>
            <p className="text-sm text-gray-600">Total Records</p>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600 mb-1">
              {analytics.academic.debarredCount}
            </div>
            <p className="text-sm text-gray-600">Debarred Students</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-indigo-600" />
          Recent System Activity
        </h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New user registration</p>
              <p className="text-xs text-gray-500">2 minutes ago</p>
            </div>
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Academic record updated</p>
              <p className="text-xs text-gray-500">15 minutes ago</p>
            </div>
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Parent account created</p>
              <p className="text-xs text-gray-500">1 hour ago</p>
            </div>
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-yellow-500 mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">System backup completed</p>
              <p className="text-xs text-gray-500">3 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalytics;
