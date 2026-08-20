import React, { useEffect } from 'react';
import { 
  X, 
  User, 
  GraduationCap, 
  Building, 
  Calendar,
  AlertCircle,
  RefreshCw,
  Save,
  Clock,
  BookOpen
} from 'lucide-react';
import { useAcademic } from '../../contexts/AcademicContext.jsx';
import StudentAcademicHeader from './StudentAcademicHeader';
import AcademicTabs from './AcademicTabs';
import MidTermMarksTab from './MidTermMarksTab';
import AttendanceTab from './AttendanceTab';
import DebarmentTab from './DebarmentTab';

const AcademicSidebar = ({ student, isOpen, onClose }) => {
  const {
    selectedStudent,
    activeTab,
    loading,
    errors,
    unsavedChanges,
    loadAllAcademicData,
    clearSelectedStudent,
    setActiveTab,
    clearAllErrors
  } = useAcademic();

  // Load academic data when student changes
  useEffect(() => {
    if (student && isOpen) {
      console.log('🎓 AcademicSidebar: Loading academic data for student:', student.name, 'Opening Academic Marks tab');
      console.log('🎓 Student details:', { id: student._id || student.id, academicYear: student.academicYear, department: student.department });
      loadAllAcademicData(student._id || student.id, student.academicYear);
      // Ensure we're on the academic marks tab when opening
      setActiveTab('marks');
    }
  }, [student, isOpen, loadAllAcademicData, setActiveTab]);

  // Clear data when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      clearSelectedStudent();
      clearAllErrors();
    }
  }, [isOpen, clearSelectedStudent, clearAllErrors]);

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (unsavedChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, unsavedChanges]);

  // Manage scrolling when sidebar is open
  useEffect(() => {
    if (isOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Don't render if not open or no student
  if (!isOpen || !student) {
    return null;
  }

  const currentStudent = selectedStudent || student;

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'marks':
        return <MidTermMarksTab student={currentStudent} />;
      case 'attendance':
        return <AttendanceTab student={currentStudent} />;
      case 'debarments':
        return <DebarmentTab student={currentStudent} />;
      default:
        return <MidTermMarksTab student={currentStudent} />;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Sidebar */}
      <div 
        className={`fixed right-0 top-0 h-screen w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {currentStudent.avatar ? (
                <img
                  className="h-12 w-12 rounded-full border-2 border-white shadow-sm"
                  src={currentStudent.avatar}
                  alt={currentStudent.name}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center border-2 border-white shadow-sm">
                  <User className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {currentStudent.name}
              </h2>
              <p className="text-sm font-medium text-blue-600 mb-1">Academic Data Management</p>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  <span>{currentStudent.academicYear}{getYearSuffix(currentStudent.academicYear)} Year</span>
                </div>
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  <span>{currentStudent.department}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Unsaved changes indicator */}
            {unsavedChanges && (
              <div className="flex items-center text-amber-600 text-sm">
                <Clock className="h-4 w-4 mr-1" />
                <span>Unsaved changes</span>
              </div>
            )}

            {/* Loading indicator */}
            {(loading.academicRecord || loading.updating) && (
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
            )}

            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
              title="Close sidebar"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {(errors.academicRecord || errors.updating) && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error Loading Academic Data</h3>
                <p className="text-sm text-red-700 mt-1">
                  {errors.academicRecord || errors.updating}
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => loadAllAcademicData(currentStudent._id || currentStudent.id, currentStudent.academicYear)}
                    className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                  >
                    Try Again →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Academic Header */}
        <StudentAcademicHeader student={currentStudent} />

        {/* Tabs Navigation */}
        <AcademicTabs />

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 sticky top-0 z-10">
            <div className="flex items-center text-sm text-blue-700">
              <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
              <span className="font-medium">📊 Academic Data Management for {currentStudent.name}</span>
            </div>
          </div>
          <div className="bg-white">
            {renderTabContent()}
          </div>
          {/* Extra padding to ensure footer is always visible */}
          <div className="h-20 bg-transparent"></div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0 mt-auto">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {loading.updating ? (
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  <span>Saving changes...</span>
                </div>
              ) : (
                <span>
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
              
              {unsavedChanges && (
                <button
                  onClick={() => {
                    // This will be implemented in individual tab components
                    console.log('Save all changes');
                  }}
                  disabled={loading.updating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper function for year suffix
const getYearSuffix = (year) => {
  if (year === 1) return 'st';
  if (year === 2) return 'nd';
  if (year === 3) return 'rd';
  return 'th';
};

export default AcademicSidebar;