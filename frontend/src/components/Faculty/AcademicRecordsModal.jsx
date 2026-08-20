import React, { useState, useEffect } from 'react';
import { X, BarChart3, Users, BookOpen, AlertTriangle, TrendingUp, Calendar, Search, Filter } from 'lucide-react';
import { facultyService } from '../../services/facultyService';
import toast from 'react-hot-toast';

const AcademicRecordsModal = ({ isOpen, onClose, students = [], onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [academicData, setAcademicData] = useState({
    overview: null,
    attendance: [],
    debarredStudents: []
  });

  // Fetch academic data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAcademicData();
    }
  }, [isOpen]);

  const fetchAcademicData = async () => {
    try {
      setLoading(true);
      
      const [attendanceAnalytics, debarredStudents] = await Promise.all([
        facultyService.getAttendanceAnalytics(),
        facultyService.getDebarredStudents()
      ]);

      setAcademicData({
        overview: attendanceAnalytics.overview,
        attendance: attendanceAnalytics.students || [],
        debarredStudents: debarredStudents.students || []
      });
    } catch (error) {
      console.error('Fetch academic data error:', error);
      toast.error('Failed to load academic data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAttendanceUpdate = async (updates) => {
    try {
      setLoading(true);
      await facultyService.bulkUpdateAttendance(updates);
      toast.success('Attendance updated successfully');
      fetchAcademicData();
      onUpdate();
    } catch (error) {
      console.error('Bulk attendance update error:', error);
      toast.error('Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getYearLabel = (year) => {
    const suffix = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
    return `${year}${suffix} Year`;
  };

  const handleClose = () => {
    setActiveTab('overview');
    setSearchTerm('');
    setSelectedYear('all');
    setSelectedSubject('all');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
            Academic Records Management
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'attendance', label: 'Attendance', icon: Calendar },
              { id: 'debarred', label: 'Debarred Students', icon: AlertTriangle }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="p-6 space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total Students</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {academicData.overview?.totalStudents || students.length}
                          </p>
                        </div>
                        <Users className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-green-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Avg Attendance</p>
                          <p className="text-2xl font-bold text-green-900">
                            {Math.round(academicData.overview?.averageAttendance || 0)}%
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-red-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-600">Debarred</p>
                          <p className="text-2xl font-bold text-red-900">
                            {academicData.overview?.debarredCount || 0}
                          </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      </div>
                    </div>

                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">Avg CGPA</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {(academicData.overview?.averageCGPA || 0).toFixed(2)}
                          </p>
                        </div>
                        <BookOpen className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Year-wise Breakdown */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Year-wise Distribution</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map(year => {
                        const yearStudents = students.filter(s => s.academicYear === year);
                        return (
                          <div key={year} className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">{yearStudents.length}</div>
                            <div className="text-sm text-gray-600">{getYearLabel(year)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => setActiveTab('attendance')}
                        className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                        <div className="font-medium text-gray-900">Manage Attendance</div>
                        <div className="text-sm text-gray-600">Update student attendance records</div>
                      </button>

                      <button
                        onClick={() => setActiveTab('debarred')}
                        className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
                        <div className="font-medium text-gray-900">View Debarred</div>
                        <div className="text-sm text-gray-600">Check debarred students list</div>
                      </button>

                      <button
                        onClick={fetchAcademicData}
                        className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
                        <div className="font-medium text-gray-900">Refresh Data</div>
                        <div className="text-sm text-gray-600">Update academic statistics</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance Tab */}
              {activeTab === 'attendance' && (
                <div className="p-6 space-y-6">
                  {/* Filters */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="all">All Years</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>

                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="all">All Subjects</option>
                        <option value="CS101">Programming Fundamentals</option>
                        <option value="CS102">Data Structures</option>
                        <option value="CS201">Database Systems</option>
                        <option value="CS202">Computer Networks</option>
                      </select>
                    </div>
                  </div>

                  {/* Attendance Summary */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Attendance Summary</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Year
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Overall Attendance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {students
                            .filter(student => {
                              const matchesSearch = !searchTerm || 
                                student.name.toLowerCase().includes(searchTerm.toLowerCase());
                              const matchesYear = selectedYear === 'all' || 
                                student.academicYear === parseInt(selectedYear);
                              return matchesSearch && matchesYear;
                            })
                            .map((student) => {
                              const attendance = Math.floor(Math.random() * 40) + 60; // Mock data
                              const isDebarred = attendance < 75;
                              
                              return (
                                <tr key={student._id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <span className="text-purple-600 font-semibold">
                                          {student.name?.charAt(0)?.toUpperCase() || 'S'}
                                        </span>
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                          {student.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {student.email}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {getYearLabel(student.academicYear)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                                        <div
                                          className={`h-2 rounded-full ${
                                            attendance >= 75 ? 'bg-green-500' :
                                            attendance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${attendance}%` }}
                                        ></div>
                                      </div>
                                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${getAttendanceColor(attendance)}`}>
                                        {attendance}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {isDebarred ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Debarred
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button className="text-purple-600 hover:text-purple-900">
                                      Update
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Debarred Students Tab */}
              {activeTab === 'debarred' && (
                <div className="p-6 space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                      <h3 className="text-lg font-semibold text-red-900">Debarred Students</h3>
                    </div>
                    <p className="text-red-700 mt-2">
                      Students with attendance below 75% are automatically debarred from examinations.
                    </p>
                  </div>

                  {/* Debarred Students List */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Debarred Students ({academicData.debarredStudents.length})
                      </h3>
                    </div>
                    
                    {academicData.debarredStudents.length === 0 ? (
                      <div className="p-12 text-center">
                        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900">No Debarred Students</p>
                        <p className="text-gray-600">All students meet the minimum attendance requirement.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {academicData.debarredStudents.map((student, index) => (
                          <div key={index} className="p-6 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-red-600 font-semibold">
                                    {student.name?.charAt(0).toUpperCase() || 'S'}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">{student.name || 'Student Name'}</h4>
                                  <p className="text-sm text-gray-600">{student.email || 'student@example.com'}</p>
                                  <p className="text-sm text-gray-500">
                                    {getYearLabel(student.academicYear || 1)} • {student.department || 'CS'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-red-600">
                                  {student.attendance || Math.floor(Math.random() * 15) + 50}%
                                </div>
                                <div className="text-sm text-gray-500">Overall Attendance</div>
                                <div className="text-xs text-red-600 mt-1">
                                  Debarred in {student.debarredSubjects?.length || Math.floor(Math.random() * 3) + 1} subjects
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchAcademicData}
              disabled={loading}
              className="px-4 py-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Refresh Data
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicRecordsModal;