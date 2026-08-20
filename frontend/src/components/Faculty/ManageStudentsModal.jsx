import React, { useState, useEffect } from 'react';
import { X, Users, Search, Filter, Edit3, Eye, UserCheck, UserX, GraduationCap, AlertCircle } from 'lucide-react';
import { facultyService } from '../../services/facultyService';
import toast from 'react-hot-toast';

const ManageStudentsModal = ({ isOpen, onClose, students = [], onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);

  // Filter students based on search and filters
  useEffect(() => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Year filter
    if (selectedYear !== 'all') {
      filtered = filtered.filter(student => student.academicYear === parseInt(selectedYear));
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(student => {
        if (selectedStatus === 'active') return student.isActive !== false;
        if (selectedStatus === 'inactive') return student.isActive === false;
        return true;
      });
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm, selectedYear, selectedStatus]);

  const handleStudentStatusToggle = async (studentId, currentStatus) => {
    try {
      setLoading(true);
      await facultyService.updateStudentStatus(studentId, !currentStatus);
      toast.success(`Student ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      onUpdate();
    } catch (error) {
      console.error('Update student status error:', error);
      toast.error('Failed to update student status');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudentDetails = async (student) => {
    try {
      setLoading(true);
      const details = await facultyService.getStudentDetails(student._id);
      setSelectedStudent({ ...student, ...details });
      setShowStudentDetails(true);
    } catch (error) {
      console.error('Get student details error:', error);
      toast.error('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (student) => {
    if (student.isActive === false) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <UserX className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <UserCheck className="w-3 h-3 mr-1" />
        Active
      </span>
    );
  };

  const getYearLabel = (year) => {
    const suffix = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
    return `${year}${suffix} Year`;
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedYear('all');
    setSelectedStatus('all');
    setSelectedStudent(null);
    setShowStudentDetails(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-600" />
            Manage Department Students
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600">
            <span>Total: {filteredStudents.length} students</span>
            <span>Active: {filteredStudents.filter(s => s.isActive !== false).length}</span>
            <span>Inactive: {filteredStudents.filter(s => s.isActive === false).length}</span>
          </div>
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && filteredStudents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}

          {!loading && filteredStudents.length > 0 && (
            <div className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <div key={student._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        {student.avatar ? (
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-green-600 font-semibold text-lg">
                            {student.name?.charAt(0)?.toUpperCase() || 'S'}
                          </span>
                        )}
                      </div>

                      {/* Student Info */}
                      <div>
                        <h3 className="font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500 flex items-center">
                            <GraduationCap className="w-4 h-4 mr-1" />
                            {getYearLabel(student.academicYear)}
                          </span>
                          {student.studentId && (
                            <span className="text-sm text-gray-500">
                              ID: {student.studentId}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            Reputation: {student.reputation || 0} pts
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(student)}
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewStudentDetails(student)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleStudentStatusToggle(student._id, student.isActive !== false)}
                          className={`p-2 rounded-lg transition-colors ${
                            student.isActive !== false
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }`}
                          title={student.isActive !== false ? 'Deactivate Student' : 'Activate Student'}
                        >
                          {student.isActive !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Student Details Modal */}
      {showStudentDetails && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
              <button
                onClick={() => setShowStudentDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  {selectedStudent.avatar ? (
                    <img
                      src={selectedStudent.avatar}
                      alt={selectedStudent.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-green-600 font-semibold text-xl">
                      {selectedStudent.name?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedStudent.name}</h4>
                  <p className="text-gray-600">{selectedStudent.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusBadge(selectedStudent)}
                  </div>
                </div>
              </div>

              {/* Academic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Academic Information</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Student ID:</span>
                      <span className="font-medium">{selectedStudent.studentId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Academic Year:</span>
                      <span className="font-medium">{getYearLabel(selectedStudent.academicYear)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{selectedStudent.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reputation:</span>
                      <span className="font-medium">{selectedStudent.reputation || 0} points</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Account Information</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className="font-medium capitalize">{selectedStudent.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">
                        {selectedStudent.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Joined:</span>
                      <span className="font-medium">
                        {new Date(selectedStudent.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Active:</span>
                      <span className="font-medium">
                        {selectedStudent.lastActivityDate 
                          ? new Date(selectedStudent.lastActivityDate).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Performance (if available) */}
              {selectedStudent.academicSummary && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Academic Performance</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedStudent.academicSummary.cgpa || 'N/A'}
                      </div>
                      <div className="text-gray-600">CGPA</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedStudent.academicSummary.attendance || 'N/A'}%
                      </div>
                      <div className="text-gray-600">Attendance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedStudent.academicSummary.totalCredits || 'N/A'}
                      </div>
                      <div className="text-gray-600">Credits</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        selectedStudent.academicSummary.isDebarred ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {selectedStudent.academicSummary.isDebarred ? 'Yes' : 'No'}
                      </div>
                      <div className="text-gray-600">Debarred</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowStudentDetails(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStudentsModal;