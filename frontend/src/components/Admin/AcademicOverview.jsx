import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  TrendingUp, 
  AlertTriangle,
  Award,
  UserCheck,
  Search,
  Filter,
  Download,
  Eye,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AcademicOverview = () => {
  const [students, setStudents] = useState([]);
  const [academicData, setAcademicData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const fetchAcademicData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch all students
      const usersResponse = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const allUsers = usersResponse.data.data?.users || [];
      const studentsList = allUsers.filter(u => u.role === 'student');
      
      setStudents(studentsList);
      
      setAcademicData([]);
    } catch (error) {
      console.error('Failed to fetch academic data:', error);
      toast.error('Failed to load academic data');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceStatus = (attendance, marks) => {
    if (attendance >= 85 && marks >= 75) return { label: 'Excellent', color: 'green' };
    if (attendance >= 75 && marks >= 60) return { label: 'Good', color: 'blue' };
    if (attendance >= 60 && marks >= 50) return { label: 'Average', color: 'yellow' };
    return { label: 'Poor', color: 'red' };
  };

  const filteredData = academicData.filter(data => {
    const matchesSearch = data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         data.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || data.department === departmentFilter;
    const matchesYear = yearFilter === 'all' || data.academicYear === parseInt(yearFilter);
    
    const performance = getPerformanceStatus(data.attendance, data.averageMarks);
    const matchesPerformance = performanceFilter === 'all' || 
                               performance.label.toLowerCase() === performanceFilter;
    
    return matchesSearch && matchesDept && matchesYear && matchesPerformance;
  });

  const overallStats = {
    totalStudents: academicData.length,
    avgAttendance: academicData.length > 0 
      ? (academicData.reduce((sum, d) => sum + d.attendance, 0) / academicData.length).toFixed(1)
      : 0,
    avgMarks: academicData.length > 0
      ? (academicData.reduce((sum, d) => sum + d.averageMarks, 0) / academicData.length).toFixed(1)
      : 0,
    debarredCount: academicData.filter(d => d.isDebarred).length,
    excellentCount: academicData.filter(d => {
      const perf = getPerformanceStatus(d.attendance, d.averageMarks);
      return perf.label === 'Excellent';
    }).length
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
      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalStudents}</p>
            </div>
            <GraduationCap className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Attendance</p>
              <p className="text-2xl font-bold text-green-600">{overallStats.avgAttendance}%</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Marks</p>
              <p className="text-2xl font-bold text-purple-600">{overallStats.avgMarks}%</p>
            </div>
            <Award className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Excellent</p>
              <p className="text-2xl font-bold text-green-600">{overallStats.excellentCount}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Debarred</p>
              <p className="text-2xl font-bold text-red-600">{overallStats.debarredCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Departments</option>
            <option value="CS">CS</option>
            <option value="ECE">ECE</option>
            <option value="ME">ME</option>
            <option value="EE">EE</option>
            <option value="IT">IT</option>
            <option value="CSAI">CSAI</option>
            <option value="AIDS">AIDS</option>
            <option value="CIVIL">CIVIL</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Performance</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="average">Average</option>
            <option value="poor">Poor</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Marks</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Performance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((data) => {
                const performance = getPerformanceStatus(data.attendance, data.averageMarks);
                const performanceColors = {
                  green: 'bg-green-100 text-green-800',
                  blue: 'bg-blue-100 text-blue-800',
                  yellow: 'bg-yellow-100 text-yellow-800',
                  red: 'bg-red-100 text-red-800'
                };

                return (
                  <tr key={data.studentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{data.name}</div>
                        <div className="text-sm text-gray-500">{data.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      Year {data.academicYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-semibold ${
                        data.attendance >= 75 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {data.attendance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">
                        {data.averageMarks}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${performanceColors[performance.color]}`}>
                        {performance.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {data.isDebarred ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Debarred
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicOverview;
