import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Edit3, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AcademicRecords = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [editingStudent, setEditingStudent] = useState(null);
  const [editData, setEditData] = useState({});

  // Mock student data - replace with API call
  const mockStudents = [
    {
      id: 1,
      name: 'Rahul Sharma',
      rollNumber: 'CS2021001',
      email: 'rahul@college.edu',
      academicYear: 2,
      department: user?.department,
      attendance: {
        percentage: 85,
        totalClasses: 120,
        attendedClasses: 102,
        isDebarred: false
      },
      marks: {
        midTerm: 78,
        endTerm: 82,
        assignments: 85,
        practicals: 88,
        total: 83.25,
        grade: 'A'
      },
      cgpa: 8.2,
      sgpa: 8.5,
      status: 'active'
    },
    {
      id: 2,
      name: 'Priya Patel',
      rollNumber: 'CS2021002',
      email: 'priya@college.edu',
      academicYear: 2,
      department: user?.department,
      attendance: {
        percentage: 92,
        totalClasses: 120,
        attendedClasses: 110,
        isDebarred: false
      },
      marks: {
        midTerm: 85,
        endTerm: 88,
        assignments: 90,
        practicals: 92,
        total: 88.75,
        grade: 'A+'
      },
      cgpa: 9.1,
      sgpa: 9.2,
      status: 'active'
    },
    {
      id: 3,
      name: 'Amit Kumar',
      rollNumber: 'CS2021003',
      email: 'amit@college.edu',
      academicYear: 2,
      department: user?.department,
      attendance: {
        percentage: 68,
        totalClasses: 120,
        attendedClasses: 82,
        isDebarred: true
      },
      marks: {
        midTerm: 65,
        endTerm: 70,
        assignments: 72,
        practicals: 75,
        total: 70.5,
        grade: 'B'
      },
      cgpa: 7.2,
      sgpa: 7.0,
      status: 'debarred'
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchStudents = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await academicService.getStudentsByDepartment(user.department);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStudents(mockStudents);
        setFilteredStudents(mockStudents);
      } catch (error) {
        console.error('Failed to fetch students:', error);
        toast.error('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen, user?.department]);

  // Filter students based on search and year
  useEffect(() => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (yearFilter !== 'all') {
      filtered = filtered.filter(student => student.academicYear === parseInt(yearFilter));
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm, yearFilter]);

  // Handle edit student
  const handleEditStudent = (student) => {
    setEditingStudent(student.id);
    setEditData({
      attendance: student.attendance.attendedClasses,
      midTerm: student.marks.midTerm,
      endTerm: student.marks.endTerm,
      assignments: student.marks.assignments,
      practicals: student.marks.practicals
    });
  };

  // Handle save changes
  const handleSaveChanges = async (studentId) => {
    try {
      // TODO: Replace with actual API call
      // await academicService.updateStudentRecords(studentId, editData);
      
      // Update local state
      setStudents(prev => prev.map(student => {
        if (student.id === studentId) {
          const attendedClasses = parseInt(editData.attendance);
          const attendancePercentage = (attendedClasses / student.attendance.totalClasses) * 100;
          const isDebarred = attendancePercentage < 75;
          
          const totalMarks = (
            parseInt(editData.midTerm) + 
            parseInt(editData.endTerm) + 
            parseInt(editData.assignments) + 
            parseInt(editData.practicals)
          ) / 4;
          
          const grade = totalMarks >= 90 ? 'A+' : 
                       totalMarks >= 80 ? 'A' : 
                       totalMarks >= 70 ? 'B' : 
                       totalMarks >= 60 ? 'C' : 'F';

          return {
            ...student,
            attendance: {
              ...student.attendance,
              attendedClasses,
              percentage: attendancePercentage,
              isDebarred
            },
            marks: {
              ...student.marks,
              midTerm: parseInt(editData.midTerm),
              endTerm: parseInt(editData.endTerm),
              assignments: parseInt(editData.assignments),
              practicals: parseInt(editData.practicals),
              total: totalMarks,
              grade
            },
            status: isDebarred ? 'debarred' : 'active'
          };
        }
        return student;
      }));

      setEditingStudent(null);
      setEditData({});
      toast.success('Student records updated successfully');
    } catch (error) {
      console.error('Failed to update student records:', error);
      toast.error('Failed to update student records');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingStudent(null);
    setEditData({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Academic Records Management
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredStudents.length} students • {user?.department} Department
              </span>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Students Table */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading students...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Attendance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Mid Term</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">End Term</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Assignments</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Practicals</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.rollNumber}</p>
                          <p className="text-xs text-gray-500">{student.academicYear}th Year</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {editingStudent === student.id ? (
                          <input
                            type="number"
                            value={editData.attendance}
                            onChange={(e) => setEditData({...editData, attendance: e.target.value})}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            max={student.attendance.totalClasses}
                            min="0"
                          />
                        ) : (
                          <div>
                            <p className={`font-medium ${student.attendance.isDebarred ? 'text-red-600' : 'text-green-600'}`}>
                              {student.attendance.percentage.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {student.attendance.attendedClasses}/{student.attendance.totalClasses}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingStudent === student.id ? (
                          <input
                            type="number"
                            value={editData.midTerm}
                            onChange={(e) => setEditData({...editData, midTerm: e.target.value})}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            max="100"
                            min="0"
                          />
                        ) : (
                          <span className="font-medium">{student.marks.midTerm}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingStudent === student.id ? (
                          <input
                            type="number"
                            value={editData.endTerm}
                            onChange={(e) => setEditData({...editData, endTerm: e.target.value})}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            max="100"
                            min="0"
                          />
                        ) : (
                          <span className="font-medium">{student.marks.endTerm}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingStudent === student.id ? (
                          <input
                            type="number"
                            value={editData.assignments}
                            onChange={(e) => setEditData({...editData, assignments: e.target.value})}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            max="100"
                            min="0"
                          />
                        ) : (
                          <span className="font-medium">{student.marks.assignments}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingStudent === student.id ? (
                          <input
                            type="number"
                            value={editData.practicals}
                            onChange={(e) => setEditData({...editData, practicals: e.target.value})}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            max="100"
                            min="0"
                          />
                        ) : (
                          <span className="font-medium">{student.marks.practicals}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{student.marks.total.toFixed(1)}</p>
                          <p className="text-sm text-gray-600">Grade: {student.marks.grade}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {student.attendance.isDebarred ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Debarred
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {editingStudent === student.id ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSaveChanges(student.id)}
                              className="p-1 text-green-600 hover:text-green-700"
                              title="Save changes"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-600 hover:text-gray-700"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Edit records"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredStudents.length === 0 && !loading && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No students found</p>
            </div>
          )}

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Students</p>
                  <p className="text-2xl font-bold text-blue-900">{filteredStudents.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Active Students</p>
                  <p className="text-2xl font-bold text-green-900">
                    {filteredStudents.filter(s => !s.attendance.isDebarred).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Debarred Students</p>
                  <p className="text-2xl font-bold text-red-900">
                    {filteredStudents.filter(s => s.attendance.isDebarred).length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {filteredStudents.length > 0 
                      ? (filteredStudents.reduce((sum, s) => sum + s.attendance.percentage, 0) / filteredStudents.length).toFixed(1)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicRecords;