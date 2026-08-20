import React, { useState } from 'react';
import { ChevronLeft, BookOpen, UserCheck, Shield, BarChart3, Download, Printer, RefreshCw, Eye, EyeOff, Filter, X } from 'lucide-react';
import SubjectWiseMarks from './SubjectWiseMarks';
import AttendanceDetails from './AttendanceDetails';
import DebarmentStatus from './DebarmentStatus';

/**
 * DetailedAcademicView Container Component
 * 
 * A comprehensive container that manages and displays detailed academic information:
 * - Tabbed navigation between different academic data views
 * - Integration of SubjectWiseMarks, AttendanceDetails, and DebarmentStatus
 * - Export and print functionality
 * - Responsive design with mobile-friendly navigation
 * - Smooth transitions between different views
 */
const DetailedAcademicView = ({ 
  academicData, 
  isVisible, 
  onClose, 
  onRefresh,
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState('marks'); // 'marks', 'attendance', 'debarment'
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  if (!isVisible) {
    return null;
  }

  if (!academicData) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center ${className}`}>
        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Data Available</h3>
        <p className="text-gray-500 mb-4">
          Detailed academic information is not available at this time.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  // Extract unique semesters and subjects from academic data
  const getAvailableSemesters = () => {
    const semesters = new Set();
    
    // Add semesters from marks data
    academicData.marks?.subjects?.forEach(subject => {
      if (subject.semester) semesters.add(subject.semester);
    });
    
    // Add semesters from attendance data
    academicData.attendance?.subjects?.forEach(subject => {
      if (subject.semester) semesters.add(subject.semester);
    });
    
    // If no semester data, add current semester
    if (semesters.size === 0) {
      semesters.add('Current');
    }
    
    return Array.from(semesters).sort();
  };

  const getAvailableSubjects = () => {
    const subjects = new Set();
    
    // Add subjects from marks data
    academicData.marks?.subjects?.forEach(subject => {
      const subjectName = subject.subjectName || subject.subjectCode;
      if (subjectName) subjects.add(subjectName);
    });
    
    // Add subjects from attendance data
    academicData.attendance?.subjects?.forEach(subject => {
      const subjectName = subject.subjectName || subject.subjectCode;
      if (subjectName) subjects.add(subjectName);
    });
    
    return Array.from(subjects).sort();
  };

  const availableSemesters = getAvailableSemesters();
  const availableSubjects = getAvailableSubjects();

  // Filter academic data based on selected filters
  const getFilteredData = () => {
    if (!academicData) return null;

    const filterSubjects = (subjects) => {
      if (!subjects) return [];
      
      return subjects.filter(subject => {
        // Semester filter
        if (selectedSemester !== 'all' && subject.semester !== selectedSemester) {
          return false;
        }
        
        // Subject filter
        if (selectedSubject !== 'all') {
          const subjectName = subject.subjectName || subject.subjectCode;
          if (subjectName !== selectedSubject) {
            return false;
          }
        }
        
        return true;
      });
    };

    const filteredMarks = {
      ...academicData.marks,
      subjects: filterSubjects(academicData.marks?.subjects || [])
    };

    const filteredAttendance = {
      ...academicData.attendance,
      subjects: filterSubjects(academicData.attendance?.subjects || [])
    };

    // For debarment, filter based on subject names
    const filteredDebarment = {
      ...academicData.debarment,
      debarredSubjects: (academicData.debarment?.debarredSubjects || []).filter(debarment => {
        if (selectedSubject !== 'all' && debarment.subject !== selectedSubject) {
          return false;
        }
        return true;
      })
    };

    // Recalculate overall statistics for filtered data
    if (filteredMarks.subjects.length > 0) {
      const totalObtained = filteredMarks.subjects.reduce((sum, s) => sum + (s.obtainedMarks || 0), 0);
      const totalMax = filteredMarks.subjects.reduce((sum, s) => sum + (s.maxMarks || 100), 0);
      const average = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
      
      filteredMarks.overall = {
        ...filteredMarks.overall,
        average,
        totalSubjects: filteredMarks.subjects.length,
        passedSubjects: filteredMarks.subjects.filter(s => (s.obtainedMarks / s.maxMarks) * 100 >= 40).length
      };
    }

    if (filteredAttendance.subjects.length > 0) {
      const totalAttended = filteredAttendance.subjects.reduce((sum, s) => sum + (s.attendedClasses || 0), 0);
      const totalClasses = filteredAttendance.subjects.reduce((sum, s) => sum + (s.totalClasses || 0), 0);
      const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
      
      filteredAttendance.overall = {
        ...filteredAttendance.overall,
        percentage,
        attended: totalAttended,
        total: totalClasses
      };
    }

    return {
      marks: filteredMarks,
      attendance: filteredAttendance,
      debarment: filteredDebarment,
      lastUpdated: academicData.lastUpdated
    };
  };

  const filteredAcademicData = getFilteredData();

  const tabs = [
    {
      id: 'marks',
      label: 'Subject Marks',
      icon: BookOpen,
      description: 'Detailed marks breakdown',
      count: filteredAcademicData?.marks?.subjects?.length || 0,
      color: 'blue'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: UserCheck,
      description: 'Class attendance details',
      count: filteredAcademicData?.attendance?.subjects?.length || 0,
      color: 'green'
    },
    {
      id: 'debarment',
      label: 'Exam Status',
      icon: Shield,
      description: 'Eligibility and debarment info',
      count: filteredAcademicData?.debarment?.debarredSubjects?.length || 0,
      color: filteredAcademicData?.debarment?.eligibleForExams ? 'green' : 'red'
    }
  ];

  const handleExport = () => {
    // Create a simple text export of academic data
    const exportData = {
      timestamp: new Date().toISOString(),
      student: 'Academic Report',
      marks: academicData.marks,
      attendance: academicData.attendance,
      debarment: academicData.debarment
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `academic-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const getTabColor = (color, isActive) => {
    const colors = {
      blue: isActive ? 'bg-blue-100 text-blue-700 border-blue-200' : 'text-blue-600 hover:bg-blue-50',
      green: isActive ? 'bg-green-100 text-green-700 border-green-200' : 'text-green-600 hover:bg-green-50',
      red: isActive ? 'bg-red-100 text-red-700 border-red-200' : 'text-red-600 hover:bg-red-50'
    };
    return colors[color] || colors.blue;
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'marks':
        return (
          <SubjectWiseMarks 
            marksData={filteredAcademicData.marks}
            className="border-0 shadow-none"
          />
        );
      case 'attendance':
        return (
          <AttendanceDetails 
            attendanceData={filteredAcademicData.attendance}
            className="border-0 shadow-none"
          />
        );
      case 'debarment':
        return (
          <DebarmentStatus 
            debarmentData={filteredAcademicData.debarment}
            attendanceData={filteredAcademicData.attendance}
            className="border-0 shadow-none"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close detailed view"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Detailed Academic View</h2>
              <p className="text-sm text-gray-500">Comprehensive academic performance analysis</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Toggle filters"
            >
              <Filter className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? 'Collapse view' : 'Expand view'}
            >
              {isExpanded ? (
                <EyeOff className="h-5 w-5 text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-600" />
              )}
            </button>
            
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="h-5 w-5 text-gray-600" />
              </button>
            )}
            
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Print report"
            >
              <Printer className="h-5 w-5 text-gray-600" />
            </button>
            
            <button
              onClick={handleExport}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export data"
            >
              <Download className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Filter Academic Data</h4>
              <button
                onClick={() => {
                  setSelectedSemester('all');
                  setSelectedSubject('all');
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Semester Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Semesters</option>
                  {availableSemesters.map(semester => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Subjects</option>
                  {availableSubjects.map(subject => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedSemester !== 'all' || selectedSubject !== 'all') && (
              <div className="mt-3 flex items-center space-x-2">
                <span className="text-xs text-gray-600">Active filters:</span>
                {selectedSemester !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {selectedSemester}
                    <button
                      onClick={() => setSelectedSemester('all')}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedSubject !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {selectedSubject}
                    <button
                      onClick={() => setSelectedSubject('all')}
                      className="ml-1 hover:text-green-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Filter Results Summary */}
            <div className="mt-3 text-xs text-gray-500">
              Showing {filteredAcademicData?.marks?.subjects?.length || 0} subjects
              {selectedSemester !== 'all' && ` in ${selectedSemester}`}
              {selectedSubject !== 'all' && ` for ${selectedSubject}`}
            </div>
          </div>
        )}

        {/* Quick Summary */}
        {isExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {(selectedSemester !== 'all' || selectedSubject !== 'all') ? 'Filtered' : 'Overall'} Grade
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    {filteredAcademicData.marks?.overall?.grade || 'N/A'}
                  </p>
                  <p className="text-xs text-blue-600">
                    {filteredAcademicData.marks?.overall?.average || 0}% Average
                  </p>
                  {(selectedSemester !== 'all' || selectedSubject !== 'all') && (
                    <p className="text-xs text-blue-500">
                      {filteredAcademicData.marks?.subjects?.length || 0} subjects
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    {(selectedSemester !== 'all' || selectedSubject !== 'all') ? 'Filtered' : 'Overall'} Attendance
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    {filteredAcademicData.attendance?.overall?.percentage || 0}%
                  </p>
                  <p className="text-xs text-green-600">
                    {filteredAcademicData.attendance?.overall?.attended || 0}/{filteredAcademicData.attendance?.overall?.total || 0} Classes
                  </p>
                  {(selectedSemester !== 'all' || selectedSubject !== 'all') && (
                    <p className="text-xs text-green-500">
                      {filteredAcademicData.attendance?.subjects?.length || 0} subjects
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${
              filteredAcademicData.debarment?.eligibleForExams ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center space-x-2">
                <Shield className={`h-5 w-5 ${
                  filteredAcademicData.debarment?.eligibleForExams ? 'text-green-600' : 'text-red-600'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    filteredAcademicData.debarment?.eligibleForExams ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Exam Status
                  </p>
                  <p className={`text-lg font-bold ${
                    filteredAcademicData.debarment?.eligibleForExams ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {filteredAcademicData.debarment?.eligibleForExams ? 'Eligible' : 'Debarred'}
                  </p>
                  <p className={`text-xs ${
                    filteredAcademicData.debarment?.eligibleForExams ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {filteredAcademicData.debarment?.eligibleForExams 
                      ? 'Can appear in exams' 
                      : `${filteredAcademicData.debarment?.debarredSubjects?.length || 0} subjects affected`
                    }
                  </p>
                  {(selectedSemester !== 'all' || selectedSubject !== 'all') && (
                    <p className="text-xs text-gray-500">
                      Filtered view
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation */}
      {(selectedSemester !== 'all' || selectedSubject !== 'all') && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-blue-600 font-medium">Filtered View:</span>
            {selectedSemester !== 'all' && (
              <span className="text-blue-800">
                {selectedSemester}
              </span>
            )}
            {selectedSemester !== 'all' && selectedSubject !== 'all' && (
              <span className="text-blue-400">→</span>
            )}
            {selectedSubject !== 'all' && (
              <span className="text-blue-800">
                {selectedSubject}
              </span>
            )}
            <button
              onClick={() => {
                setSelectedSemester('all');
                setSelectedSubject('all');
              }}
              className="ml-2 text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-0" aria-label="Academic data tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive 
                    ? `border-${tab.color}-500 ${getTabColor(tab.color, true)}` 
                    : `border-transparent ${getTabColor(tab.color, false)}`
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    isActive 
                      ? `bg-${tab.color}-200 text-${tab.color}-800` 
                      : `bg-gray-100 text-gray-600`
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {isExpanded ? (
          <div className="transition-all duration-300 ease-in-out">
            {renderActiveComponent()}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">View Collapsed</h3>
            <p className="text-gray-500 mb-4">
              Click the expand button to view detailed academic information.
            </p>
            <button
              onClick={() => setIsExpanded(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Expand View
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Current View: <span className="font-medium capitalize">{activeTab}</span>
            </span>
            <span className="text-gray-600">
              Data Source: <span className="font-medium">Faculty Entries</span>
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {academicData.lastUpdated ? new Date(academicData.lastUpdated).toLocaleString() : 'Not available'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedAcademicView;