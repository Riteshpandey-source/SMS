import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  GraduationCap, 
  UserCheck,
  TrendingUp,
  BookOpen,
  Award,
  AlertTriangle,
  Edit,
  Eye,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { DEPARTMENTS } from '../../constants/departments';

const DepartmentManagement = () => {
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    fetchDepartmentStats();
  }, []);

  const fetchDepartmentStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch all users
      const usersResponse = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const users = usersResponse.data.data?.users || [];
      
      // Calculate stats for each department
      const stats = DEPARTMENTS.map(dept => {
        const deptUsers = users.filter(u => u.department === dept.value);
        const students = deptUsers.filter(u => u.role === 'student');
        const faculty = deptUsers.filter(u => u.role === 'faculty');
        
        // Group students by year
        const yearWise = {
          1: students.filter(s => s.academicYear === 1).length,
          2: students.filter(s => s.academicYear === 2).length,
          3: students.filter(s => s.academicYear === 3).length,
          4: students.filter(s => s.academicYear === 4).length
        };
        
        return {
          code: dept.value,
          name: dept.label,
          totalUsers: deptUsers.length,
          students: students.length,
          faculty: faculty.length,
          yearWise,
          activeUsers: deptUsers.filter(u => u.isActive).length
        };
      });
      
      setDepartmentStats(stats);
    } catch (error) {
      console.error('Failed to fetch department stats:', error);
      toast.error('Failed to load department statistics');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentColor = (code) => {
    const colors = {
      'CS': 'from-blue-500 to-blue-600',
      'ECE': 'from-purple-500 to-purple-600',
      'ME': 'from-orange-500 to-orange-600',
      'EE': 'from-yellow-500 to-yellow-600',
      'IT': 'from-green-500 to-green-600',
      'CSAI': 'from-indigo-500 to-indigo-600',
      'AIDS': 'from-pink-500 to-pink-600',
      'CIVIL': 'from-gray-500 to-gray-600'
    };
    return colors[code] || 'from-gray-500 to-gray-600';
  };

  const getDepartmentIcon = (code) => {
    return Building;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const totalStats = {
    totalStudents: departmentStats.reduce((sum, d) => sum + d.students, 0),
    totalFaculty: departmentStats.reduce((sum, d) => sum + d.faculty, 0),
    totalUsers: departmentStats.reduce((sum, d) => sum + d.totalUsers, 0),
    activeDepartments: departmentStats.filter(d => d.totalUsers > 0).length
  };

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Building className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{totalStats.activeDepartments}</span>
          </div>
          <h3 className="text-lg font-semibold">Active Departments</h3>
          <p className="text-blue-100 text-sm">Out of {DEPARTMENTS.length} total</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <GraduationCap className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{totalStats.totalStudents}</span>
          </div>
          <h3 className="text-lg font-semibold">Total Students</h3>
          <p className="text-green-100 text-sm">Across all departments</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{totalStats.totalFaculty}</span>
          </div>
          <h3 className="text-lg font-semibold">Total Faculty</h3>
          <p className="text-purple-100 text-sm">Teaching staff</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{totalStats.totalUsers}</span>
          </div>
          <h3 className="text-lg font-semibold">Total Users</h3>
          <p className="text-orange-100 text-sm">Students + Faculty</p>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {departmentStats.map((dept) => {
          const Icon = getDepartmentIcon(dept.code);
          const colorClass = getDepartmentColor(dept.code);
          
          return (
            <div 
              key={dept.code}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              {/* Department Header */}
              <div className={`bg-gradient-to-r ${colorClass} p-6 text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-8 w-8 opacity-80" />
                  <span className="text-2xl font-bold">{dept.code}</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{dept.name}</h3>
                <p className="text-sm opacity-90">{dept.totalUsers} total users</p>
              </div>

              {/* Department Stats */}
              <div className="p-6 space-y-4">
                {/* Students and Faculty Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{dept.students}</p>
                    <p className="text-xs text-gray-600">Students</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <UserCheck className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600">{dept.faculty}</p>
                    <p className="text-xs text-gray-600">Faculty</p>
                  </div>
                </div>

                {/* Year-wise Distribution */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Year-wise Students
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(year => (
                      <div key={year} className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-lg font-bold text-gray-900">{dept.yearWise[year]}</p>
                        <p className="text-xs text-gray-600">Year {year}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Users */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm font-medium text-gray-700">Active Users</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">{dept.activeUsers}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSelectedDept(dept)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                  <button
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Department Details Modal */}
      {selectedDept && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`bg-gradient-to-r ${getDepartmentColor(selectedDept.code)} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{selectedDept.name}</h2>
                  <p className="text-sm opacity-90">Department Code: {selectedDept.code}</p>
                </div>
                <button
                  onClick={() => setSelectedDept(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{selectedDept.students}</p>
                  <p className="text-sm text-gray-600">Students</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{selectedDept.faculty}</p>
                  <p className="text-sm text-gray-600">Faculty</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{selectedDept.activeUsers}</p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
              </div>

              {/* Year-wise Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Year-wise Student Distribution</h3>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(year => {
                    const count = selectedDept.yearWise[year];
                    const percentage = selectedDept.students > 0 
                      ? (count / selectedDept.students * 100).toFixed(1) 
                      : 0;
                    
                    return (
                      <div key={year}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Year {year}</span>
                          <span className="text-sm font-semibold text-gray-900">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  View All Students
                </button>
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  View All Faculty
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
