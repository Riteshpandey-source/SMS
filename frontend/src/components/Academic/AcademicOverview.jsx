import React from 'react';
import { GraduationCap, TrendingUp, AlertTriangle, Award, Calendar, BookOpen } from 'lucide-react';

const AcademicOverview = ({ record }) => {
  // Safe calculation - handle empty arrays
  const averageMarks = record.midTermMarks && record.midTermMarks.length > 0
    ? record.midTermMarks.reduce((sum, mark) => sum + mark.percentage, 0) / record.midTermMarks.length
    : 0;
  
  const debarredCount = record.attendance && record.attendance.length > 0
    ? record.attendance.filter(att => att.isDebarred).length
    : 0;
  
  const atRiskCount = record.attendance && record.attendance.length > 0
    ? record.attendance.filter(att => !att.isDebarred && att.percentage < 80).length
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <GraduationCap className="w-6 h-6 mr-2 text-indigo-600" />
          Academic Overview
        </h2>
        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
          {record.semester}
        </span>
      </div>

      {/* Alert Section */}
      {record.isDebarred && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <h3 className="font-semibold text-red-900">Debarment Alert</h3>
              <p className="text-sm text-red-700">
                Student is debarred from {debarredCount} subject(s): {record.debarredSubjects.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{record.cgpa}</div>
          <div className="text-sm text-blue-700">CGPA</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{record.sgpa}</div>
          <div className="text-sm text-green-700">SGPA</div>
        </div>
        
        <div className={`rounded-lg p-4 text-center ${
          record.overallAttendance >= 75 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
            : 'bg-gradient-to-r from-red-50 to-pink-50'
        }`}>
          <div className={`text-2xl font-bold ${
            record.overallAttendance >= 75 ? 'text-green-600' : 'text-red-600'
          }`}>
            {record.overallAttendance.toFixed(1)}%
          </div>
          <div className={`text-sm ${
            record.overallAttendance >= 75 ? 'text-green-700' : 'text-red-700'
          }`}>
            Overall Attendance
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{averageMarks.toFixed(1)}%</div>
          <div className="text-sm text-purple-700">Mid-Term Average</div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{debarredCount}</div>
              <div className="text-sm text-red-700">Debarred Subjects</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600">{atRiskCount}</div>
              <div className="text-sm text-yellow-700">At Risk Subjects</div>
            </div>
            <Calendar className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{record.totalCredits}</div>
              <div className="text-sm text-green-700">Total Credits</div>
            </div>
            <BookOpen className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicOverview;