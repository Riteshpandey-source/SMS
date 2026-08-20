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
  GraduationCap
} from 'lucide-react';
import { useAssignment } from '../../contexts/AssignmentContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const FacultyList = () => {
  const { user } = useAuth();
  const {
    assignedFaculty,
    loading,
    error,
    loadAssignedFaculty,
    refreshAssignments,
    hasAssignedFaculty,
    totalAssignedFaculty,
    lastUpdated
  } = useAssignment();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load faculty on component mount
  useEffect(() => {
    if (user?.role === 'student') {
      loadAssignedFaculty();
    }
  }, [user, loadAssignedFaculty]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAssignments(true);
      toast.success('Faculty assignments refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh assignments');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter and sort faculty
  const filteredFaculty = assignedFaculty
    .filter(assignment => {
      const faculty = assignment.faculty;
      const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           faculty.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = selectedDepartment === 'all' || faculty.department === selectedDepartment;
      return matchesSearch && matchesDepartment;
    })
    .sort((a, b) => {
      const facultyA = a.faculty;
      const facultyB = b.faculty;
      
      switch (sortBy) {
        case 'name':
          return facultyA.name.localeCompare(facultyB.name);
        case 'department':
          return facultyA.department.localeCompare(facultyB.department);
        case 'assignedAt':
          return new Date(b.assignedAt) - new Date(a.assignedAt);
        default:
          return 0;
      }
    });

  // Get unique departments
  const departments = [...new Set(assignedFaculty.map(a => a.faculty.department))];

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

  // Get accessible years display
  const getAccessibleYearsDisplay = (accessibleYears) => {
    if (!accessibleYears || accessibleYears.length === 0) return 'None';
    return accessibleYears.map(year => `${year}${getYearSuffix(year)}`).join(', ');
  };

  const getYearSuffix = (year) => {
    if (year === 1) return 'st';
    if (year === 2) return 'nd';
    if (year === 3) return 'rd';
    return 'th';
  };

  // Handle contact faculty
  const handleContactFaculty = (faculty) => {
    window.location.href = `mailto:${faculty.email}`;
  };

  if (user?.role !== 'student') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">Only students can view assigned faculty.</p>
        </div>
      </div>
    );
  }

  if (loading && assignedFaculty.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your assigned faculty...</p>
        </div>
      </div>
    );
  }

  if (error && assignedFaculty.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Faculty</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => loadAssignedFaculty(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!hasAssignedFaculty()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Faculty Assigned</h3>
          <p className="text-gray-500 mb-4">
            No faculty members are currently assigned to your year and department.
          </p>
          <div className="text-sm text-gray-400 mb-4">
            <p>Your Details:</p>
            <p>Department: {user.department}</p>
            <p>Academic Year: {user.academicYear}{getYearSuffix(user.academicYear)}</p>
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
          <h2 className="text-2xl font-bold text-gray-900">My Faculty</h2>
          <p className="mt-1 text-sm text-gray-500">
            Faculty members assigned to your year and department
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated: {formatAssignmentDate(lastUpdated)}
            </span>
          )}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Faculty
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalAssignedFaculty}
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
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Your Year
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {user.academicYear}{getYearSuffix(user.academicYear)} Year
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Faculty
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
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <div className="relative">
              <Filter className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
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
              <option value="department">Department</option>
              <option value="assignedAt">Assignment Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Faculty List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredFaculty.map((assignment) => {
            const faculty = assignment.faculty;
            return (
              <li key={assignment.assignmentId || faculty.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {faculty.avatar ? (
                          <img
                            className="h-12 w-12 rounded-full"
                            src={faculty.avatar}
                            alt={faculty.name}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-lg font-medium text-gray-900">
                            {faculty.name}
                          </p>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Faculty
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <GraduationCap className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          <p>{faculty.department} Department</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleContactFaculty(faculty)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Contact
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-500">
                        <Mail className="flex-shrink-0 mr-2 h-4 w-4" />
                        <span className="truncate">{faculty.email}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-500">
                        <BookOpen className="flex-shrink-0 mr-2 h-4 w-4" />
                        <span>Years: {getAccessibleYearsDisplay(faculty.accessibleYears)}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-500">
                        <Clock className="flex-shrink-0 mr-2 h-4 w-4" />
                        <span>Last seen: {formatLastLogin(faculty.lastLogin)}</span>
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

      {filteredFaculty.length === 0 && assignedFaculty.length > 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No faculty found</h3>
          <p className="text-gray-500">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default FacultyList;