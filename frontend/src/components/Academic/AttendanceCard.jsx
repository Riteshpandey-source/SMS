import React from 'react';
import { Calendar, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';

const AttendanceCard = ({ attendance }) => {
  // Provide safe defaults so UI doesn't crash when data is incomplete
  const {
    percentage = 0,
    isDebarred = false,
    subjectName = 'Subject',
    subjectCode = '',
    attendedClasses = 0,
    totalClasses = 0,
    lastUpdated = new Date().toISOString()
  } = attendance || {};

  const getStatusColor = (pct, debarred) => {
    if (isDebarred) return 'text-red-600 bg-red-50 border-red-200';
    if (pct >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (pct >= 75) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = (pct, debarred) => {
    if (debarred) return AlertTriangle;
    if (pct >= 85) return CheckCircle;
    if (pct >= 75) return Clock;
    return AlertTriangle;
  };

  const safePercentage = Number.isFinite(Number(percentage)) ? Number(percentage) : 0;
  const StatusIcon = getStatusIcon(safePercentage, isDebarred);
  const statusColor = getStatusColor(safePercentage, isDebarred);

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all duration-200 ${
      attendance.isDebarred ? 'border-red-200' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{attendance.subjectName}</h3>
          <p className="text-sm text-gray-600">{attendance.subjectCode}</p>
        </div>
        <div className={`p-2 rounded-lg border ${statusColor}`}>
          <StatusIcon className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Attendance Percentage */}
        <div className="text-center">
          <div className={`text-3xl font-bold mb-1 ${
            isDebarred ? 'text-red-600' : 
            safePercentage >= 85 ? 'text-green-600' :
            safePercentage >= 75 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {safePercentage.toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600">Attendance</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              isDebarred ? 'bg-red-500' :
              safePercentage >= 85 ? 'bg-green-500' :
              safePercentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(safePercentage, 100)}%` }}
          ></div>
        </div>

        {/* Class Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{attendedClasses}</p>
            <p className="text-gray-600">Attended</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalClasses}</p>
            <p className="text-gray-600">Total Classes</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center">
          {isDebarred ? (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              DEBARRED
            </span>
          ) : safePercentage < 75 ? (
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              AT RISK
            </span>
          ) : (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              SAFE
            </span>
          )}
        </div>

        {/* Last Updated */}
        <div className="flex items-center justify-center text-xs text-gray-500">
          <Calendar className="w-3 h-3 mr-1" />
           Updated: {new Date(lastUpdated).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default AttendanceCard;
