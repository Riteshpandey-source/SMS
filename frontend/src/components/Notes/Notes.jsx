import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Search, BookOpen, GraduationCap, AlertCircle, Filter, Users, Eye, EyeOff } from 'lucide-react';
import NoteCard from './NoteCard';
import UploadNotes from '../Faculty/UploadNotes';
import YearFilter from '../Common/YearFilter';
import AccessIndicator from '../Common/AccessIndicator';
import AssignmentIndicator from '../Common/AssignmentIndicator';
import AssignmentStatus from '../Common/AssignmentStatus';

import { useAuth } from '../../contexts/AuthContext';
import { useYear } from '../../contexts/YearContext';
import { useAssignment } from '../../contexts/AssignmentContext';
import { notesService } from '../../services/notesService';
import toast from 'react-hot-toast';

const Notes = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { 
    currentYearFilter, 
    getYearFilterForAPI, 
    accessibleYears,
    hasYearAccess,
    isStudent,
    isFaculty,
    isAdmin
  } = useYear();
  const {
    assignedFaculty,
    assignedStudents,
    hasAssignedFaculty,
    hasAssignedStudents,
    loading: assignmentLoading,
    error: assignmentError
  } = useAssignment();
  
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploaderRoleFilter, setUploaderRoleFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [showAssignmentInfo, setShowAssignmentInfo] = useState(false);
  
  // UI states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletedNotes, setDeletedNotes] = useState(new Set());

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Department and year options
  const departments = [
    { code: 'CS', name: 'Computer Science' },
    { code: 'ECE', name: 'Electronics & Communication' },
    { code: 'ME', name: 'Mechanical Engineering' },
    { code: 'CE', name: 'Civil Engineering' },
    { code: 'EE', name: 'Electrical Engineering' },
    { code: 'IT', name: 'Information Technology' },
    { code: 'CHE', name: 'Chemical Engineering' }
  ];

  const academicYears = [
    { value: 1, label: '1st Year' },
    { value: 2, label: '2nd Year' },
    { value: 3, label: '3rd Year' },
    { value: 4, label: '4th Year' }
  ];

  const categories = [
    { value: 'lecture', label: 'Lecture Notes' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'lab', label: 'Lab Manual' },
    { value: 'project', label: 'Project' },
    { value: 'exam', label: 'Exam Material' },
    { value: 'reference', label: 'Reference' },
    { value: 'other', label: 'Other' }
  ];

  const uploaderRoles = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'admin', label: 'Admin' }
  ];

  // Test debug API
  const testDebugAPI = useCallback(async () => {
    try {
      console.log('=== Testing debug API ===');
      const debugResponse = await notesService.getDebugNotes();
      console.log('Debug API response:', debugResponse);
      return debugResponse;
    } catch (error) {
      console.error('Debug API error:', error);
      return null;
    }
  }, []);

  // Fetch notes
  const fetchNotes = useCallback(async (page = 1) => {
    try {
      console.log('=== fetchNotes called ===');
      console.log('User:', user);
      
      // Test debug API first
      const debugData = await testDebugAPI();
      if (debugData && debugData.success) {
        console.log('Debug API shows ECE notes available:', debugData.data.totalECENotes);
      }
      
      setLoading(true);
      
      const params = {
        page,
        limit: pagination.limit
      };

      // Add filters
      if (searchTerm) params.search = searchTerm;
      if (subjectFilter !== 'all') params.subject = subjectFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (uploaderRoleFilter !== 'all') params.uploaderRole = uploaderRoleFilter;
      
      // Add year filter from Year Context
      const yearFilterValue = getYearFilterForAPI();
      if (yearFilterValue) {
        params.academicYear = yearFilterValue;
      }
      
      // Admin can filter by department
      if (isAdmin && deptFilter !== 'all') {
        params.department = deptFilter;
      }

      // Add assignment-based filtering for students and faculty
      if (assignmentFilter === 'assigned') {
        if (isStudent && hasAssignedFaculty()) {
          // Students: only show notes from assigned faculty
          const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
          params.assignedFacultyIds = assignedFacultyIds.join(',');
        } else if (isFaculty && hasAssignedStudents()) {
          // Faculty: only show notes from assigned students
          const assignedStudentIds = assignedStudents.map(a => a.student.id || a.student._id);
          params.assignedStudentIds = assignedStudentIds.join(',');
        }
      }

      const data = await notesService.getNotes(params);
      
      // Get uploaded notes from localStorage
      const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
      console.log('Uploaded notes from localStorage:', uploadedNotes.length);
      
      // Combine API notes with uploaded notes
      const allNotes = [...uploadedNotes, ...(data.notes || [])];
      console.log('Combined notes:', allNotes.length, '(uploaded:', uploadedNotes.length, ', API:', data.notes?.length || 0, ')');
      
      // Filter out deleted notes and apply assignment filtering
      let filteredNotes = allNotes.filter(note => !deletedNotes.has(note._id));
      
      // Apply assignment-based filtering on client side for additional filtering
      if (assignmentFilter === 'assigned') {
        if (isStudent && hasAssignedFaculty()) {
          const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
          filteredNotes = filteredNotes.filter(note => 
            assignedFacultyIds.includes(note.uploadedBy?._id) || 
            assignedFacultyIds.includes(note.createdBy) ||
            note.uploaderRole === 'faculty' // Fallback for notes without specific uploader ID
          );
        } else if (isFaculty && hasAssignedStudents()) {
          const assignedStudentIds = assignedStudents.map(a => a.student.id || a.student._id);
          filteredNotes = filteredNotes.filter(note => 
            assignedStudentIds.includes(note.uploadedBy?._id) || 
            assignedStudentIds.includes(note.createdBy) ||
            note.uploaderRole === 'student' // Fallback for notes without specific uploader ID
          );
        }
      } else if (assignmentFilter === 'unassigned') {
        if (isStudent && hasAssignedFaculty()) {
          const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
          filteredNotes = filteredNotes.filter(note => 
            !assignedFacultyIds.includes(note.uploadedBy?._id) && 
            !assignedFacultyIds.includes(note.createdBy)
          );
        } else if (isFaculty && hasAssignedStudents()) {
          const assignedStudentIds = assignedStudents.map(a => a.student.id || a.student._id);
          filteredNotes = filteredNotes.filter(note => 
            !assignedStudentIds.includes(note.uploadedBy?._id) && 
            !assignedStudentIds.includes(note.createdBy)
          );
        }
      }
      
      console.log('Final filtered notes:', filteredNotes.length);
      setNotes(filteredNotes);
      setPagination({
        ...data.pagination,
        total: (data.pagination?.total || 0) + uploadedNotes.length
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      
      // Get uploaded notes from localStorage
      const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
      
      // Filter out deleted notes and apply assignment filtering
      let filteredNotes = uploadedNotes.filter(note => !deletedNotes.has(note._id));
      
      // Apply assignment-based filtering for mock data
      if (assignmentFilter === 'assigned') {
        if (isStudent && hasAssignedFaculty()) {
          const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
          filteredNotes = filteredNotes.filter(note => 
            assignedFacultyIds.includes(note.uploadedBy?._id) || 
            assignedFacultyIds.includes(note.createdBy) ||
            note.uploaderRole === 'faculty'
          );
        } else if (isFaculty && hasAssignedStudents()) {
          const assignedStudentIds = assignedStudents.map(a => a.student.id || a.student._id);
          filteredNotes = filteredNotes.filter(note => 
            assignedStudentIds.includes(note.uploadedBy?._id) || 
            assignedStudentIds.includes(note.createdBy) ||
            note.uploaderRole === 'student'
          );
        }
      } else if (assignmentFilter === 'unassigned') {
        if (isStudent && hasAssignedFaculty()) {
          const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
          filteredNotes = filteredNotes.filter(note => 
            !assignedFacultyIds.includes(note.uploadedBy?._id) && 
            !assignedFacultyIds.includes(note.createdBy)
          );
        } else if (isFaculty && hasAssignedStudents()) {
          const assignedStudentIds = assignedStudents.map(a => a.student.id || a.student._id);
          filteredNotes = filteredNotes.filter(note => 
            !assignedStudentIds.includes(note.uploadedBy?._id) && 
            !assignedStudentIds.includes(note.createdBy)
          );
        }
      }
      
      setNotes(filteredNotes);
      setPagination({
        page: 1,
        limit: 20,
        total: filteredNotes.length,
        pages: Math.ceil(filteredNotes.length / 20)
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, subjectFilter, deptFilter, categoryFilter, uploaderRoleFilter, assignmentFilter, getYearFilterForAPI, isAdmin, isStudent, isFaculty, hasAssignedFaculty, hasAssignedStudents, assignedFaculty, assignedStudents, pagination.limit, deletedNotes]);

  // Fetch stats
  const fetchStats = useCallback(async (currentNotes = []) => {
    try {
      const data = await notesService.getNotesStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      
      const activeNotes = currentNotes.length > 0 ? currentNotes : [];
      setStats({
        overall: {
          totalNotes: activeNotes.length,
          totalDownloads: activeNotes.reduce((sum, note) => sum + (note.downloads || 0), 0),
          totalViews: activeNotes.reduce((sum, note) => sum + (note.views || 0), 0)
        },
        personal: {
          uploadedNotes: user?.role === 'faculty' ? activeNotes.length : 0,
          downloadedNotes: 0
        },
        byDepartment: {
          [user?.department || 'CS']: activeNotes.length
        }
      });
    }
  }, [user?.role, user?.department]);

  // Initial load
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchNotes();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated]);

  // Refetch when filters change
  useEffect(() => {
    if (user && isAuthenticated) {
      const timeoutId = setTimeout(() => {
        fetchNotes(1);
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, subjectFilter, deptFilter, categoryFilter, uploaderRoleFilter, assignmentFilter, user, isAuthenticated]);

  // Handle upload success
  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    fetchNotes(); // Refresh notes list
  };

  // Handle note deletion
  const handleNoteDelete = (noteId) => {
    // Add to deleted notes set
    setDeletedNotes(prev => new Set([...prev, noteId]));
    
    // Also remove from localStorage if it exists there
    const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
    const filteredNotes = uploadedNotes.filter(n => n._id !== noteId);
    localStorage.setItem('uploadedNotes', JSON.stringify(filteredNotes));
    
    // Refresh the notes list
    fetchNotes();
  };


  // Reset filters to user's context
  const resetToMyNotes = () => {
    setSearchTerm('');
    setSubjectFilter('all');
    setCategoryFilter('all');
    setUploaderRoleFilter('all');
    
    if (isAdmin) {
      setDeptFilter('all');
    } else {
      setDeptFilter(user?.department || 'all');
    }
  };

  // Get unique subjects from current notes
  const subjects = ['all', ...Array.from(new Set(notes.map(note => note.subject)))];

  if (loading && notes.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="text-center text-gray-500">
          Loading notes... (Check console for debug info)
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load notes</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchNotes()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Get user context info
  const getUserContextInfo = () => {
    if (isStudent) {
      return `${user.academicYear}${user.academicYear === 1 ? 'st' : user.academicYear === 2 ? 'nd' : user.academicYear === 3 ? 'rd' : 'th'} Year ${user.department}`;
    } else if (isFaculty) {
      const yearText = accessibleYears.length === 1 
        ? `${accessibleYears[0]}${accessibleYears[0] === 1 ? 'st' : accessibleYears[0] === 2 ? 'nd' : accessibleYears[0] === 3 ? 'rd' : 'th'} Year`
        : `${accessibleYears.length} Years`;
      return `${user.department} Faculty (${yearText})`;
    } else {
      return 'All Departments & Years';
    }
  };

  // Debug: Log when component renders
  console.log('Notes component render:', { 
    user: user?.name, 
    role: user?.role, 
    isAuthenticated, 
    isLoading,
    notesCount: notes.length 
  });

  // Debug info
  if (import.meta.env.DEV) {
    console.log('Notes component state:', {
      loading,
      error,
      notesCount: notes.length,
      user: user?.name,
      userRole: user?.role,
      userDept: user?.department,
      userYear: user?.academicYear
    });
  }

  // Early return for debugging
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please login to view notes</p>
          <p className="text-sm text-gray-500 mt-2">
            User: {user ? 'Found' : 'Not found'} | Auth: {isAuthenticated ? 'Yes' : 'No'} | Loading: {isLoading ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Access Indicator */}
      <AccessIndicator 
        variant="default" 
        showDetails={true} 
        showYearBreakdown={true}
      />

      {/* Assignment Status Alert for Students */}
      {isStudent && !hasAssignedFaculty() && (
        <div className="bg-amber-50 border border-amber-250 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-[#C6A15B] mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">No Faculty Advisor Assigned</h3>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                You don't have any faculty members assigned to your year and department yet. 
                This may limit the study materials, notes, and resources you can access. Please contact your coordinator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="bg-blue-100 p-2 sm:p-3 rounded-xl">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900">Notes Library</h1>
              <p className="text-blue-700 mt-1 text-sm sm:text-base">
                {stats?.overall?.totalNotes || 0} notes available for {getUserContextInfo()}
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-blue-600">
                {(isFaculty || isAdmin) && (
                  <span>• {stats?.personal?.uploadedNotes || 0} uploaded by you</span>
                )}
                {isStudent && (
                  <span>• Curated by faculty</span>
                )}
                <span>• {accessibleYears.length} year{accessibleYears.length !== 1 ? 's' : ''} accessible</span>
                {/* Assignment Status */}
                {isStudent && (
                  <span>• {hasAssignedFaculty() ? `${assignedFaculty.length} faculty assigned` : 'No faculty assigned'}</span>
                )}
                {isFaculty && (
                  <span>• {hasAssignedStudents() ? `${assignedStudents.length} students assigned` : 'No students assigned'}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Upload Button for Faculty and Admin */}
          {(isFaculty || isAdmin) && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Upload Notes
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notes, subjects, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            {/* Year Filter */}
            <div className="w-48">
              <YearFilter 
                label="Academic Year"
                size="medium"
                showAllOption={true}
                showAccessIndicator={true}
              />
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select 
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Uploader</label>
              <select 
                value={uploaderRoleFilter}
                onChange={(e) => setUploaderRoleFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Uploaders</option>
                {uploaderRoles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Filter (Students and Faculty only) */}
            {(isStudent || isFaculty) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Filter
                  <AssignmentIndicator 
                    variant="dot" 
                    size="small" 
                    className="ml-2 inline-block" 
                  />
                </label>
                <select 
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Notes</option>
                  <option value="assigned">
                    From Assigned {isStudent ? 'Faculty' : 'Students'}
                  </option>
                  <option value="unassigned">
                    From Other {isStudent ? 'Faculty' : 'Students'}
                  </option>
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  {isStudent && hasAssignedFaculty() && `${assignedFaculty.length} faculty assigned`}
                  {isFaculty && hasAssignedStudents() && `${assignedStudents.length} students assigned`}
                  {((isStudent && !hasAssignedFaculty()) || (isFaculty && !hasAssignedStudents())) && 'No assignments yet'}
                </div>
              </div>
            )}

            {/* Department (Admin only) */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select 
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.code} value={dept.code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-end">
              <button 
                onClick={resetToMyNotes}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{stats.overall.totalNotes}</p>
            <p className="text-sm text-gray-600">Available Notes</p>
            {currentYearFilter !== 'all' && (
              <p className="text-xs text-blue-600 mt-1">
                Filtered by year
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{stats.overall.totalDownloads}</p>
            <p className="text-sm text-gray-600">Total Downloads</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{stats.overall.subjectsCount || 0}</p>
            <p className="text-sm text-gray-600">Subjects Covered</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-2xl font-bold text-indigo-600">{stats.personal.uploadedNotes || 0}</p>
            <p className="text-sm text-gray-600">
              {isFaculty || isAdmin ? 'Your Uploads' : 'Downloaded'}
            </p>
          </div>
        </div>
      )}



      {/* Notes Grid */}
      {notes.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{notes.length} notes</span> found for {getUserContextInfo()}
              {currentYearFilter !== 'all' && (
                <span className="ml-2 text-blue-600">
                  • Filtered by {currentYearFilter === user?.academicYear?.toString() ? 'your year' : `${currentYearFilter}${currentYearFilter == 1 ? 'st' : currentYearFilter == 2 ? 'nd' : currentYearFilter == 3 ? 'rd' : 'th'} year`}
                </span>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              {isFaculty && (
                <span>• Manage your notes with edit/delete options</span>
              )}
              {isStudent && (
                <span>• Download notes to save locally</span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {notes.map((note, index) => {
              console.log(`Rendering note ${index}:`, note);
              return (
                <NoteCard 
                  key={note._id || index} 
                  note={note} 
                  onUpdate={() => fetchNotes(pagination.page)}
                  onDelete={handleNoteDelete}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} notes
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => fetchNotes(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchNotes(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-[#C6A15B]/80 mx-auto mb-4 border border-amber-100 bg-amber-50/50 p-2.5 rounded-xl" />
          <h3 className="text-base font-bold text-gray-900 mb-1.5">No notes available yet</h3>
          <p className="text-gray-500 text-xs leading-relaxed mb-6">
            Your faculty hasn't uploaded any study material for this subject.
          </p>
          <button
            onClick={() => {
              setSubjectFilter('all');
              setSearchTerm('');
              setCategoryFilter('all');
              setUploaderRoleFilter('all');
              setAssignmentFilter('all');
            }}
            className="inline-flex items-center text-xs font-bold text-[#C6A15B] hover:text-amber-700 transition-colors"
          >
            Browse other subjects →
          </button>
        </div>
      )}

      {/* Upload Notes Modal */}
      <UploadNotes 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={() => {
          // Refresh notes list after successful upload
          console.log('Upload success - refreshing notes...');
          fetchNotes();
          fetchStats();
        }}
      />

    </div>
  );
};

export default Notes;
