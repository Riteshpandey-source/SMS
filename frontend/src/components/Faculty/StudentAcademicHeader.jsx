import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BookOpen,
  Users,
  Award,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useAcademic } from '../../contexts/AcademicContext.jsx';

const StudentAcademicHeader = ({ student }) => {
  const {
    academicRecord,
    midTermMarks,
    attendance,
    debarments,
    loading,
    lastUpdated,
    loadAllAcademicData
  } = useAcademic();

  // Calculate overall statistics
  const getOverallStats = () => {
    const stats = {
      totalSubjects: 0,
      averageMarks: 0,
      averageAttendance: 0,
      debarredSubjects: 0,
      academicStatus: 'active'
    };

    // Calculate from mid-term marks
    if (midTermMarks && midTermMarks.length > 0) {
      stats.totalSubjects = midTermMarks.length;
      const totalMarks = midTermMarks.reduce((sum, mark) => sum + (mark.obtainedMarks || 0), 0);
      const totalMaxMarks = midTermMarks.reduce((sum, mark) => sum + (mark.maxMarks || 100), 0);
      stats.averageMarks = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0;
    }

    // Calculate from attendance
    if (attendance && attendance.length > 0) {
      const totalPercentage = attendance.reduce((sum, att) => sum + (att.percentage || 0), 0);
      stats.averageAttendance = Math.round(totalPercentage / attendance.length);
      stats.debarredSubjects = attendance.filter(att => att.isDebarred).length;
    }

    // Determine academic status
    if (stats.debarredSubjects > 0) {
      stats.academicStatus = 'debarred';
    } else if (stats.averageAttendance < 75) {
      stats.academicStatus = 'warning';
    } else if (stats.averageMarks >= 80 && stats.averageAttendance >= 90) {
      stats.academicStatus = 'excellent';
    } else {
      stats.academicStatus = 'good';
    }

    return stats;
  };

  const stats = getOverallStats();

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'excellent':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: Award,
          text: 'Excellent Performance'
        };
      case 'good':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: CheckCircle,
          text: 'Good Standing'
        };
      case 'warning':
        return {
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: AlertTriangle,
          text: 'Needs Attention'
        };
      case 'debarred':
        return {
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: AlertTriangle,
          text: 'Debarred Status'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: Clock,
          text: 'Status Unknown'
        };
    }
  };

  const statusDisplay = getStatusDisplay(stats.academicStatus);
  const StatusIcon = statusDisplay.icon;

  // Handle refresh
  const handleRefresh = () => {
    loadAllAcademicData(student._id || student.id, student.academicYear);
  };

  return (
    <div className="p-6 bg-white border-b border-gray-200">
      {/* Academic Status Banner */}
      <div className={`mb-6 p-4 rounded-lg border ${statusDisplay.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <StatusIcon className="h-5 w-5 mr-3" />
            <div>
              <h3 className="font-semibold">{statusDisplay.text}</h3>
              <p className="text-sm opacity-75">
                Academic performance overview for {student.name}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading.academicRecord}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh academic data"
          >
            <RefreshCw className={`h-4 w-4 ${loading.academicRecord ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Subjects */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Subjects</p>
              {loading.midTermMarks ? (
                <div className="h-6 w-8 bg-blue-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-blue-900">{stats.totalSubjects}</p>
              )}
            </div>
            <BookOpen className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        {/* Average Marks */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Average Marks</p>
              {loading.midTermMarks ? (
                <div className="h-6 w-8 bg-green-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-green-900">{`${stats.averageMarks}%`}</p>
              )}
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        {/* Average Attendance */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Attendance</p>
              {loading.attendance ? (
                <div className="h-6 w-8 bg-purple-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-purple-900">{`${stats.averageAttendance}%`}</p>
              )}
            </div>
            <Users className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        {/* Debarred Subjects */}
        <div className={`rounded-lg p-4 border ${
          stats.debarredSubjects > 0 
            ? 'bg-red-50 border-red-100' 
            : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                stats.debarredSubjects > 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                Debarred
              </p>
              {loading.debarments ? (
                <div className={`h-6 w-8 rounded animate-pulse ${
                  stats.debarredSubjects > 0 ? 'bg-red-200' : 'bg-gray-200'
                }`}></div>
              ) : (
                <p className={`text-2xl font-bold ${
                  stats.debarredSubjects > 0 ? 'text-red-900' : 'text-gray-900'
                }`}>{stats.debarredSubjects}</p>
              )}
            </div>
            <AlertTriangle className={`h-8 w-8 ${
              stats.debarredSubjects > 0 ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
        </div>
      </div>

      {/* Academic Record Summary */}
      {academicRecord && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Academic Record Summary</h4>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              <span>
                AY {academicRecord.academicYear} • {academicRecord.semester || 'Current'} Semester
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Department:</span>
              <span className="ml-2 font-medium">{academicRecord.department}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Credits:</span>
              <span className="ml-2 font-medium">{academicRecord.totalCredits || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Earned Credits:</span>
              <span className="ml-2 font-medium">{academicRecord.earnedCredits || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated Info */}
      {lastUpdated && (
        <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
          <Clock className="h-3 w-3 mr-1" />
          <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default StudentAcademicHeader;