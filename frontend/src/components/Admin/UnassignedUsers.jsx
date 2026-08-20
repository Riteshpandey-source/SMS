import React, { useState, useEffect } from 'react';
import { 
  Users, 
  AlertTriangle, 
  UserPlus, 
  Search, 
  Filter,
  RefreshCw,
  Mail,
  Calendar,
  GraduationCap,
  BookOpen,
  CheckCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { assignmentService } from '../../services/assignmentService';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';

const UnassignedUsers = () => {
  const { user } = useAuth();
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [inactiveFaculty, setInactiveFaculty] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState('');

  useEffect(() => {
    fetchUnassignedUsers();
  }, []);

  const fetchUnassignedUsers = async () => {
    try {
      setLoading(true);
      const [unassignedRes, facultyRes] = await Promise.all([
        assignmentService.getUnassignedUsers(),
        userService.getFaculty()
      ]);
      
      setUnassignedStudents(unassignedRes.unassignedStudents || []);
      setInactiveFaculty(unassignedRes.inactiveFaculty || []);
      setAllFaculty(facultyRes.users || []);
    } catch (error) {
      console.error('Failed to fetch unassigned users:', error);
      toast.error('Failed to load unassigned users');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent || !selectedFaculty) {
      toast.error('Please select both student and faculty');
      return;
    }

    try {
      await assignmentService.createAssignment({
        studentId: selectedStudent._id,
        facultyId: selectedFaculty,
        assignmentSource: 'manual'
      });
      
      toast.success(`Assigned ${selectedStudent.name} successfully`);
      setShowAssignModal(false);
      setSelectedStudent(null);
      setSelectedFaculty('');
      await fetchUnassignedUsers();
    } catch (error) {
      console.error('Failed to assign student:', error);
      toast.error('Failed to assign student');
    }
  };

  const handleBulkAssignDepartment = async (department) => {
    try {
      await assignmentService.bulkAssignByDepartment(department);
      toast.success(`Bulk assigned students in ${department} department`);
      await fetchUnassignedUsers();
    } catch (error) {
      console.error('Failed to bulk assign department:', error);
      toast.error('Failed to bulk assign department');
    }
  };

  // Filter unassigned students
  const filteredStudents = unassignedStudents.filter(student => {
    const matchesSearch = 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
      student.department === selectedDepartment;
    
    const matchesYear = selectedYear === 'all' || 
      student.academicYear?.toString() === selectedYear;
    
    return matchesSearch && matchesDepartment && matchesYear;
  });

  // Get available faculty for assignment
  const getAvailableFaculty = () => {
    return allFaculty.filter(f => f.isActive !== false);
  };

  // Get department statistics
  const getDepartmentStats = () => {
    const stats = {};
    unassignedStudents.forEach(student => {
      const dept = student.department || 'Unknown';
      if (!stats[dept]) {
        stats[dept] = { count: 0, years: {} };
      }
      stats[dept].count++;
      
      const year = student.academicYear || 'Unknown';
      if (!stats[dept].years[year]) {
        stats[dept].years[year] = 0;
      }
      stats[dept].years[year]++;
    });
    return stats;
  };

  const departments = [...new Set(unassignedStudents.map(s => s.department))].filter(Boolean);
  const departmentStats = getDepartmentStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Unassigned Users</h3>
          <p className="text-sm text-gray-600">
            Students without faculty assignments and inactive faculty members
          </p>
        </div>
        <button
          onClick={fetchUnassignedUsers}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Unassigned Students</p>
              <p className="text-2xl font-bold text-red-900">{unassignedStudents.length}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-red-700">
            Students needing faculty assignment
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Inactive Faculty</p>
              <p className="text-2xl font-bold text-yellow-900">{inactiveFaculty.length}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-yellow-700">
            Faculty members without students
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Available Faculty</p>
              <p className="text-2xl font-bold text-blue-900">{getAvailableFaculty().length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-blue-700">
            Faculty available for assignments
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      {Object.keys(departmentStats).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Unassigned Students by Department</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Object.entries(departmentStats).map(([dept, stats]) => (
              <div key={dept} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{dept}</h5>
                  <button
                    onClick={() => handleBulkAssignDepartment(dept)}
                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                  >
                    Bulk Assign
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">{stats.count} students</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(stats.years).map(([year, count]) => (
                    <span key={year} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      Year {year}: {count}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Students</label>
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setSelectedYear('all');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Unassigned Students List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">
            Unassigned Students ({filteredStudents.length})
          </h4>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredStudents.map((student) => (
            <div key={student._id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-lg">
                      {student.name?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{student.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        {student.email}
                      </div>
                      <div className="flex items-center">
                        <GraduationCap className="w-4 h-4 mr-1" />
                        {student.academicYear}
                        {student.academicYear === 1 ? 'st' : 
                         student.academicYear === 2 ? 'nd' : 
                         student.academicYear === 3 ? 'rd' : 'th'} Year
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {student.department}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Registered: {new Date(student.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowAssignModal(true);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Assign
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {unassignedStudents.length === 0 ? 'All Students Assigned!' : 'No Students Found'}
            </p>
            <p className="text-gray-600">
              {unassignedStudents.length === 0 
                ? 'All students have been assigned to faculty members.'
                : 'Try adjusting your filters to see more students.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Inactive Faculty List */}
      {inactiveFaculty.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">
              Inactive Faculty ({inactiveFaculty.length})
            </h4>
          </div>

          <div className="divide-y divide-gray-200">
            {inactiveFaculty.map((faculty) => (
              <div key={faculty._id} className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold text-lg">
                      {faculty.name?.charAt(0)?.toUpperCase() || 'F'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{faculty.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        {faculty.email}
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {faculty.department}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      No assigned students
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign Student</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedStudent.name}</p>
                <p className="text-sm text-gray-600">
                  {selectedStudent.email} • {selectedStudent.academicYear}
                  {selectedStudent.academicYear === 1 ? 'st' : 
                   selectedStudent.academicYear === 2 ? 'nd' : 
                   selectedStudent.academicYear === 3 ? 'rd' : 'th'} Year • {selectedStudent.department}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Faculty Member
                  </label>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Choose faculty member...</option>
                    {getAvailableFaculty().map(f => (
                      <option key={f._id} value={f._id}>
                        {f.name} - {f.department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignStudent}
                  disabled={!selectedFaculty}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnassignedUsers;