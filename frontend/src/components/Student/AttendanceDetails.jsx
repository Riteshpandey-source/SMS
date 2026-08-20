import React, { useState } from 'react';
import { UserCheck, AlertTriangle, CheckCircle, XCircle, Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import academicService from '../../services/academicService';

/**
 * AttendanceDetails Component
 * 
 * Displays detailed attendance information for each subject including:
 * - Subject-wise attendance breakdown
 * - Attendance percentages and status indicators
 * - Classes attended vs total classes
 * - Attendance trends and warnings
 * - Debarment risk indicators
 */
const AttendanceDetails = ({ attendanceData, className = '' }) => {
  const [sortBy, setSortBy] = useState('percentage'); // 'percentage', 'alphabetical', 'status'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'good', 'warning', 'critical'

  if (!attendanceData || !attendanceData.subjects || attendanceData.subjects.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center ${className}`}>
        <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data Available</h3>
        <p className="text-gray-500 mb-4">
          Your attendance records haven't been updated by faculty yet.
        </p>
        <p className="text-sm text-gray-400">
          Attendance will appear here once your faculty starts tracking classes.
        </p>
      </div>
    );
  }

  // Process subjects data with enhanced calculations
  const processedSubjects = attendanceData.subjects.map(subject => {
    const percentage = academicService.calculateAttendancePercentage(
      subject.attendedClasses || 0, 
      subject.totalClasses || 0
    );
    const status = academicService.getAttendanceStatus(percentage);
    
    // Calculate classes needed to reach 75%
    const classesNeededFor75 = subject.totalClasses > 0 
      ? Math.max(0, Math.ceil((75 * subject.totalClasses / 100) - subject.attendedClasses))
      : 0;
    
    // Calculate maximum classes that can be missed
    const maxMissableClasses = subject.totalClasses > 0
      ? Math.floor(subject.totalClasses * 0.25) // 25% can be missed
      : 0;
    
    const classesMissed = (subject.totalClasses || 0) - (subject.attendedClasses || 0);
    
    return {
      ...subject,
      percentage,
      status: status.status,
      statusMessage: status.message,
      statusColor: status.color,
      classesNeededFor75,
      maxMissableClasses,
      classesMissed,
      isAtRisk: percentage < 80 && percentage >= 75,
      isCritical: percentage < 75
    };
  });

  // Apply filtering
  const filteredSubjects = processedSubjects.filter(subject => {
    if (filterStatus === 'all') return true;
    return subject.status === filterStatus;
  });

  // Apply sorting
  const sortedSubjects = [...filteredSubjects].sort((a, b) => {
    switch (sortBy) {
      case 'percentage':
        return a.percentage - b.percentage; // Lowest first (needs attention)
      case 'alphabetical':
        return (a.subjectName || a.subjectCode).localeCompare(b.subjectName || b.subjectCode);
      case 'status':
        const statusOrder = { 'critical': 0, 'warning': 1, 'good': 2 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      default:
        return 0;
    }
  });

  // Calculate statistics
  const stats = {
    totalSubjects: processedSubjects.length,
    goodAttendance: processedSubjects.filter(s => s.status === 'good').length,
    warningAttendance: processedSubjects.filter(s => s.status === 'warning').length,
    criticalAttendance: processedSubjects.filter(s => s.status === 'critical').length,
    averagePercentage: attendanceData.overall.percentage,
    totalClasses: attendanceData.overall.total,
    totalAttended: attendanceData.overall.attended
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <UserCheck className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 85) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header with Statistics */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Attendance Details</h3>
            <p className="text-sm text-gray-500">Track your class attendance across all subjects</p>
          </div>
          <div className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              {stats.totalAttended}/{stats.totalClasses} Classes
            </span>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Overall</p>
            <p className="text-lg font-bold text-gray-900">{stats.averagePercentage}%</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600">Good</p>
            <p className="text-lg font-bold text-green-700">{stats.goodAttendance}</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-600">At Risk</p>
            <p className="text-lg font-bold text-yellow-700">{stats.warningAttendance}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600">Critical</p>
            <p className="text-lg font-bold text-red-700">{stats.criticalAttendance}</p>
          </div>
        </div>

        {/* Overall Status Alert */}
        {stats.averagePercentage < 75 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Attendance Warning</h4>
                <p className="text-sm text-red-700 mt-1">
                  Your overall attendance is below the required 75%. You may be debarred from examinations.
                </p>
              </div>
            </div>
          </div>
        )}

        {stats.averagePercentage >= 75 && stats.averagePercentage < 80 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Attendance Caution</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Your attendance is close to the minimum requirement. Try to attend more classes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Sorting */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">Attendance %</option>
                <option value="alphabetical">Subject Name</option>
                <option value="status">Status</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-600">Filter:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="good">Good (≥85%)</option>
                <option value="warning">Warning (75-84%)</option>
                <option value="critical">Critical (&lt;75%)</option>
              </select>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Showing {sortedSubjects.length} of {stats.totalSubjects} subjects
          </div>
        </div>
      </div>

      {/* Subjects List */}
      <div className="divide-y divide-gray-100">
        {sortedSubjects.map((subject, index) => (
          <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(subject.status)}
                <div>
                  <h4 className="font-medium text-gray-900">
                    {subject.subjectName || subject.subjectCode}
                  </h4>
                  {subject.subjectName && subject.subjectCode && (
                    <p className="text-xs text-gray-500">{subject.subjectCode}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    subject.status === 'good' ? 'text-green-600' :
                    subject.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {subject.percentage}%
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    getStatusColor(subject.status)
                  }`}>
                    {subject.status.charAt(0).toUpperCase() + subject.status.slice(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Attendance Progress</span>
                <span>Required: 75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 relative">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(subject.percentage)}`}
                  style={{ width: `${Math.min(subject.percentage, 100)}%` }}
                ></div>
                {/* Required threshold marker */}
                <div 
                  className="absolute w-0.5 h-2 bg-gray-400 -mt-2"
                  style={{ left: '75%' }}
                ></div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Classes Attended:</span>
                  <span className="font-medium">{subject.attendedClasses || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Classes:</span>
                  <span className="font-medium">{subject.totalClasses || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Classes Missed:</span>
                  <span className={`font-medium ${subject.classesMissed > subject.maxMissableClasses ? 'text-red-600' : 'text-gray-900'}`}>
                    {subject.classesMissed}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Can Miss:</span>
                  <span className="font-medium">{Math.max(0, subject.maxMissableClasses - subject.classesMissed)}</span>
                </div>
                {subject.classesNeededFor75 > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Need to Attend:</span>
                    <span className="font-medium text-orange-600">{subject.classesNeededFor75}</span>
                  </div>
                )}
                {subject.lastUpdated && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-xs text-gray-500">
                      {new Date(subject.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {subject.isCritical && (
                  <div className="bg-red-50 p-2 rounded text-xs">
                    <p className="text-red-800 font-medium">⚠ Debarment Risk</p>
                    <p className="text-red-700">Attend {subject.classesNeededFor75} more classes</p>
                  </div>
                )}
                {subject.isAtRisk && !subject.isCritical && (
                  <div className="bg-yellow-50 p-2 rounded text-xs">
                    <p className="text-yellow-800 font-medium">⚠ At Risk</p>
                    <p className="text-yellow-700">Don't miss more classes</p>
                  </div>
                )}
                {subject.status === 'good' && (
                  <div className="bg-green-50 p-2 rounded text-xs">
                    <p className="text-green-800 font-medium">✓ Good Standing</p>
                    <p className="text-green-700">Keep up the good work!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Summary */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Overall Status: 
              <span className={`font-medium ml-1 ${
                stats.averagePercentage >= 85 ? 'text-green-600' :
                stats.averagePercentage >= 75 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats.averagePercentage >= 85 ? 'Excellent' :
                 stats.averagePercentage >= 75 ? 'Satisfactory' : 'Below Requirement'}
              </span>
            </span>
            <span className="text-gray-600">
              Average: <span className="font-medium">{stats.averagePercentage}%</span>
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {attendanceData.lastUpdated ? new Date(attendanceData.lastUpdated).toLocaleString() : 'Not available'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetails;