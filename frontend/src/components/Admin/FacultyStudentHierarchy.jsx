import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyListView from './FacultyListView';
import StudentListView from './StudentListView';
import StudentDetailView from './StudentDetailView';
import { adminHierarchyService } from '../../services/adminHierarchyService';

const FacultyStudentHierarchy = () => {
  // Navigation state
  const [currentView, setCurrentView] = useState('faculty'); // 'faculty' | 'students' | 'detail'
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Data state
  const [facultyData, setFacultyData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [studentDetails, setStudentDetails] = useState(null);
  const [groupedByYear, setGroupedByYear] = useState({});

  // Filter state
  const [filters, setFilters] = useState({
    department: '',
    year: ''
  });

  // Loading and error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load faculty hierarchy on mount
  useEffect(() => {
    loadFacultyHierarchy();
  }, []);

  /**
   * Load faculty hierarchy with optional filters
   */
  const loadFacultyHierarchy = async (filterOverrides = {}) => {
    setLoading(true);
    setError(null);

    try {
      const appliedFilters = { ...filters, ...filterOverrides };
      const response = await adminHierarchyService.getFacultyHierarchy(appliedFilters);

      if (response.success) {
        setFacultyData(response.data.faculty || []);
      } else {
        throw new Error(response.error?.message || 'Failed to load faculty');
      }
    } catch (err) {
      console.error('Load faculty hierarchy error:', err);
      setError(err.message || 'Failed to load faculty hierarchy');
      toast.error('Failed to load faculty data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load students for selected faculty
   */
  const loadFacultyStudents = async (facultyId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminHierarchyService.getFacultyStudents(facultyId);

      if (response.success) {
        setStudentsData(response.data.students || []);
        setGroupedByYear(response.data.groupedByYear || {});
      } else {
        throw new Error(response.error?.message || 'Failed to load students');
      }
    } catch (err) {
      console.error('Load faculty students error:', err);
      setError(err.message || 'Failed to load students');
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load student details
   */
  const loadStudentDetails = async (studentId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminHierarchyService.getStudentDetails(studentId);

      if (response.success) {
        setStudentDetails(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to load student details');
      }
    } catch (err) {
      console.error('Load student details error:', err);
      setError(err.message || 'Failed to load student details');
      toast.error('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle faculty selection
   */
  const handleFacultySelect = async (faculty) => {
    setSelectedFaculty(faculty);
    setCurrentView('students');
    await loadFacultyStudents(faculty.id);
  };

  /**
   * Handle student selection
   */
  const handleStudentSelect = async (student) => {
    setSelectedStudent(student);
    setCurrentView('detail');
    await loadStudentDetails(student.id);
  };

  /**
   * Handle back to faculty list
   */
  const handleBackToFaculty = () => {
    setCurrentView('faculty');
    setSelectedFaculty(null);
    setSelectedStudent(null);
    setStudentsData([]);
    setGroupedByYear({});
    setStudentDetails(null);
  };

  /**
   * Handle back to student list
   */
  const handleBackToStudents = () => {
    setCurrentView('students');
    setSelectedStudent(null);
    setStudentDetails(null);
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    loadFacultyHierarchy(newFilters);
  };

  /**
   * Render current view
   */
  const renderView = () => {
    switch (currentView) {
      case 'faculty':
        return (
          <FacultyListView
            faculty={facultyData}
            loading={loading}
            onFacultySelect={handleFacultySelect}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        );

      case 'students':
        return (
          <StudentListView
            faculty={selectedFaculty}
            students={studentsData}
            groupedByYear={groupedByYear}
            loading={loading}
            onStudentSelect={handleStudentSelect}
            onBack={handleBackToFaculty}
          />
        );

      case 'detail':
        return (
          <StudentDetailView
            student={studentDetails?.student || selectedStudent}
            faculty={selectedFaculty}
            academicData={studentDetails?.academicData}
            parentInfo={studentDetails?.parentInfo}
            assignedFaculty={studentDetails?.assignedFaculty}
            loading={loading}
            onBack={handleBackToStudents}
            onBackToFaculty={handleBackToFaculty}
          />
        );

      default:
        return null;
    }
  };

  // Error state
  if (error && !loading && currentView === 'faculty' && facultyData.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => loadFacultyHierarchy()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Only show on faculty view */}
      {currentView === 'faculty' && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Faculty-Student Hierarchy</h2>
              <p className="text-gray-600 mt-1">
                Browse faculty members and their assigned students, view detailed academic records
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {renderView()}
    </div>
  );
};

export default FacultyStudentHierarchy;
