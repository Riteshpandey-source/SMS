import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  BookOpen, 
  Award,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  MessageCircle,
  Calendar,
  User,
  GraduationCap,
  TrendingUp,
  FileText,
  Eye,
  Download,
  BarChart3,
  Edit3,
  ChevronRight
} from 'lucide-react';
import { useAssignment } from '../../contexts/AssignmentContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademic } from '../../contexts/AcademicContext.jsx';
import AcademicSidebar from './AcademicSidebar';
import AcademicDataManager from './AcademicDataManager';
import toast from 'react-hot-toast';

const StudentList = () => {
  const { user } = useAuth();
  const {
    assignedStudents,
    loading,
    error,
    loadAssignedStudents,
    refreshAssignments,
    hasAssignedStudents,
    totalAssignedStudents,
    getStudentsByYear,
    lastUpdated
  } = useAssignment();

  const {
    selectedStudent,
    sidebarOpen,
    openSidebar,
    closeSidebar
  } = useAcademic();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAcademicManager, setShowAcademicManager] = useState(false);
  const [selectedStudentForManager, setSelectedStudentForManager] = useState(null);

  // Load students on component mount
  useEffect(() => {
    if (user?.role === 'faculty') {
      loadAssignedStudents();
    }
  }, [user, loadAssignedStudents]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAssignments(true);
      toast.success('Student assignments refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh assignments');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter and sort students
  const filteredStudents = assignedStudents
    .filter(assignment => {
      const student = assignment.student;
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = selectedYear === 'all' || student.academicYear.toString() === selectedYear;
      const matchesDepartment = selectedDepartment === 'all' || student.department === selectedDepartment;
      return matchesSearch && matchesYear && matchesDepartment;
    })
    .sort((a, b) => {
      const studentA = a.student;
      const studentB = b.student;
      
      switch (sortBy) {
        case 'name':
          return studentA.name.localeCompare(studentB.name);
        case 'year':
          return studentA.academicYear - studentB.academicYear;
        case 'department':
          return studentA.department.localeCompare(studentB.department);
        case 'assignedAt':
          return new Date(b.assignedAt) - new Date(a.assignedAt);
        default:
          return 0;
      }
    });

  // Get unique years and departments
  const studentsByYear = getStudentsByYear();
  const availableYears = Object.keys(studentsByYear).sort();
  const departments = [...new Set(assignedStudents.map(a => a.student.department))];

  // Format last login time
  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Format assignment date
  const formatAssignmentDate = (assignedAt) => {
    const date = new Date(assignedAt);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getYearSuffix = (year) => {
    if (year === 1) return 'st';
    if (year === 2) return 'nd';
    if (year === 3) return 'rd';
    return 'th';
  };

  // Handle contact student
  const handleContactStudent = (student) => {
    window.location.href = `mailto:${student.email}`;
  };

  // Handle view academic data
  const handleViewAcademicData = (student) => {
    console.log('Opening academic data for student:', student.name);
    setSelectedStudentForManager(student);
    setShowAcademicManager(true);
  };

  // Handle close academic manager
  const handleCloseAcademicManager = () => {
    setShowAcademicManager(false);
    setSelectedStudentForManager(null);
  };

  // Get year statistics
  const getYearStats = () => {
    return availableYears.map(year => ({
      year: parseInt(year),
      count: studentsByYear[year].length,
      percentage: Math.round((studentsByYear[year].length / totalAssignedStudents) * 100)
    }));
  };

  if (user?.role !== 'faculty') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">Only faculty can view assigned students.</p>
        </div>
      </div>
    );
  }

  if (loading && assignedStudents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your assigned students...</p>
        </div>
      </div>
    );
  }

  if (error && assignedStudents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Students</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => loadAssignedStudents(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!hasAssignedStudents()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Assigned</h3>
          <p className="text-gray-500 mb-4">
            No students are currently assigned to your accessible years and department.
          </p>
          <div className="text-sm text-gray-400 mb-4">
            <p>Your Details:</p>
            <p>Department: {user.department}</p>
            <p>Accessible Years: {user.accessibleYears?.join(', ') || 'None'}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Assignments'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
          <p className="mt-1 text-sm text-gray-500">
            Students assigned to your accessible years and department
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated: {formatAssignmentDate(lastUpdated)}
            </span>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md ${viewMode === 'cards' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Students
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalAssignedStudents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <GraduationCap className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Academic Years
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {availableYears.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Departments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {departments.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Your Access
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {user.accessibleYears?.length || 0} Years
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Year Distribution */}
      {availableYears.length > 1 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Students by Year</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {getYearStats().map(({ year, count, percentage }) => (
              <div key={year} className="text-center">
                <div className="text-2xl font-bold text-blue-600">{count}</div>
                <div className="text-sm text-gray-500">
                  {year}{getYearSuffix(year)} Year ({percentage}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <div className="relative">
              <Filter className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}{getYearSuffix(parseInt(year))} Year
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              id="department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="name">Name</option>
              <option value="year">Academic Year</option>
              <option value="department">Department</option>
              <option value="assignedAt">Assignment Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student List */}
      {viewMode === 'list' ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredStudents.map((assignment) => {
              const student = assignment.student;
              return (
                <li key={assignment.assignmentId || student.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {student.avatar ? (
                            <img
                              className="h-12 w-12 rounded-full"
                              src={student.avatar}
                              alt={student.name}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-bold text-[#0B1220] hover:text-indigo-900 transition-colors">
                              {student.name}
                            </p>
                            {assignment.assignmentSource !== 'automatic' && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                {assignment.assignmentSource === 'manual' ? 'Manual' : 'Admin'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-500 mt-1">
                            Roll No: {student.rollNo || student.id.slice(-8).toUpperCase()} · {student.academicYear}{getYearSuffix(student.academicYear)} Year · {student.department}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewAcademicData(student)}
                          className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-[#0B1220] hover:text-white hover:border-[#0B1220] transition-all duration-200 shadow-sm"
                          title="Manage Academic Data (Attendance, Midterm & Term Marks, Debarment)"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleContactStudent(student)}
                          className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all duration-200 shadow-sm"
                          title={`Email student: ${student.email}`}
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center text-gray-500">
                          <Mail className="flex-shrink-0 mr-2 h-4 w-4" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-500">
                          <BookOpen className="flex-shrink-0 mr-2 h-4 w-4" />
                          <span>{student.academicYear}{getYearSuffix(student.academicYear)} Year {student.department}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-500">
                          <Clock className="flex-shrink-0 mr-2 h-4 w-4" />
                          <span>Last seen: {formatLastLogin(student.lastLogin)}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-500">
                          <Calendar className="flex-shrink-0 mr-2 h-4 w-4" />
                          <span>Assigned: {formatAssignmentDate(assignment.assignedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {assignment.assignmentSource !== 'automatic' && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {assignment.assignmentSource === 'manual' ? 'Manually Assigned' : 'Admin Assigned'}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((assignment) => {
            const student = assignment.student;
            return (
              <div key={assignment.assignmentId || student.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {student.avatar ? (
                        <img
                          className="h-12 w-12 rounded-full"
                          src={student.avatar}
                          alt={student.name}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {student.name}
                        </h3>
                        <button
                          onClick={() => handleViewAcademicData(student)}
                          className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                          title="Quick access to academic data"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">
                        {student.academicYear}{getYearSuffix(student.academicYear)} Year • {student.department}
                      </p>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Academic Data Available
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="flex-shrink-0 mr-2 h-4 w-4" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="flex-shrink-0 mr-2 h-4 w-4" />
                      <span>Last seen: {formatLastLogin(student.lastLogin)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="flex-shrink-0 mr-2 h-4 w-4" />
                      <span>Assigned: {formatAssignmentDate(assignment.assignedAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => handleViewAcademicData(student)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                      title="Open full-page academic data manager: marks, attendance, debarment"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Manage Academic Data
                      <ChevronRight className="h-3 w-3 ml-1 opacity-60" />
                    </button>
                    <button
                      onClick={() => handleContactStudent(student)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Student
                    </button>
                  </div>

                  {assignment.assignmentSource !== 'automatic' && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {assignment.assignmentSource === 'manual' ? 'Manually Assigned' : 'Admin Assigned'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredStudents.length === 0 && assignedStudents.length > 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-500">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}

      {/* Academic Sidebar */}
      <AcademicSidebar
        student={selectedStudent}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Academic Data Manager - Full Page */}
      {showAcademicManager && selectedStudentForManager && (
        <AcademicDataManager
          student={selectedStudentForManager}
          onClose={handleCloseAcademicManager}
        />
      )}
    </div>
  );
};

export default StudentList;