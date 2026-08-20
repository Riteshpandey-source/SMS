import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle, XCircle, Clock, User, FileText, Calendar } from 'lucide-react';

/**
 * DebarmentStatus Component
 * 
 * Displays comprehensive debarment information including:
 * - Overall exam eligibility status
 * - Subject-wise debarment details
 * - Debarment reasons and types (manual/automatic)
 * - Recovery actions and requirements
 * - Historical debarment information
 */
const DebarmentStatus = ({ debarmentData, attendanceData, className = '' }) => {
  const [filterType, setFilterType] = useState('all'); // 'all', 'manual', 'automatic'
  const [showHistory, setShowHistory] = useState(false);

  if (!debarmentData) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center ${className}`}>
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Debarment Data Available</h3>
        <p className="text-gray-500 mb-4">
          Debarment information is not available at this time.
        </p>
        <p className="text-sm text-gray-400">
          Your exam eligibility status will be updated by faculty.
        </p>
      </div>
    );
  }

  // Process debarment subjects with enhanced information
  const processedDebarments = (debarmentData.debarredSubjects || []).map(debarment => {
    // Find corresponding attendance data for context
    const attendanceInfo = attendanceData?.subjects?.find(
      att => att.subjectCode === debarment.subject || att.subjectName === debarment.subject
    );

    return {
      ...debarment,
      attendancePercentage: attendanceInfo?.percentage || 0,
      attendedClasses: attendanceInfo?.attendedClasses || 0,
      totalClasses: attendanceInfo?.totalClasses || 0,
      isAutomatic: debarment.type === 'automatic' || debarment.type === 'auto',
      isManual: debarment.type === 'manual',
      severity: debarment.reason?.toLowerCase().includes('attendance') ? 'high' : 'medium'
    };
  });

  // Apply filtering
  const filteredDebarments = processedDebarments.filter(debarment => {
    if (filterType === 'all') return true;
    if (filterType === 'manual') return debarment.isManual;
    if (filterType === 'automatic') return debarment.isAutomatic;
    return true;
  });

  // Calculate statistics
  const stats = {
    totalDebarments: processedDebarments.length,
    manualDebarments: processedDebarments.filter(d => d.isManual).length,
    automaticDebarments: processedDebarments.filter(d => d.isAutomatic).length,
    attendanceRelated: processedDebarments.filter(d => 
      d.reason?.toLowerCase().includes('attendance') || d.reason?.toLowerCase().includes('75%')
    ).length,
    isEligible: debarmentData.eligibleForExams,
    overallAttendance: attendanceData?.overall?.percentage || 0
  };

  const getDebarmentIcon = (type, severity) => {
    if (type === 'manual') {
      return <ShieldAlert className={`h-5 w-5 ${severity === 'high' ? 'text-red-600' : 'text-orange-600'}`} />;
    }
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const getStatusColor = (isEligible) => {
    return isEligible 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getTypeColor = (type) => {
    return type === 'manual' 
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  const getRecoverySteps = () => {
    const steps = [];
    
    if (stats.attendanceRelated > 0) {
      steps.push({
        title: 'Improve Attendance',
        description: 'Attend more classes to reach the minimum 75% requirement',
        action: 'Contact faculty about makeup classes or special arrangements',
        priority: 'high',
        icon: Clock
      });
    }

    if (stats.manualDebarments > 0) {
      steps.push({
        title: 'Resolve Manual Debarments',
        description: 'Address specific issues that led to manual debarment',
        action: 'Schedule a meeting with your faculty or academic advisor',
        priority: 'high',
        icon: User
      });
    }

    if (steps.length === 0 && !stats.isEligible) {
      steps.push({
        title: 'Contact Academic Office',
        description: 'Get clarification on your debarment status',
        action: 'Visit the academic office for detailed information',
        priority: 'medium',
        icon: FileText
      });
    }

    return steps;
  };

  const recoverySteps = getRecoverySteps();

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header with Overall Status */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Exam Eligibility Status</h3>
            <p className="text-sm text-gray-500">Your current debarment and eligibility information</p>
          </div>
          <div className="flex items-center space-x-2">
            {stats.isEligible ? (
              <ShieldCheck className="h-6 w-6 text-green-600" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-red-600" />
            )}
          </div>
        </div>

        {/* Overall Status Card */}
        <div className={`p-4 rounded-lg border-2 ${
          stats.isEligible 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-lg font-bold ${
              stats.isEligible ? 'text-green-900' : 'text-red-900'
            }`}>
              {stats.isEligible ? 'ELIGIBLE FOR EXAMS' : 'DEBARRED FROM EXAMS'}
            </h4>
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(stats.isEligible)}`}>
              {stats.isEligible ? 'CLEARED' : 'RESTRICTED'}
            </div>
          </div>
          
          <p className={`text-sm ${
            stats.isEligible ? 'text-green-700' : 'text-red-700'
          }`}>
            {stats.isEligible 
              ? '🎉 Congratulations! You can appear in all examinations.'
              : `❌ You are currently debarred from ${stats.totalDebarments} subject(s).`
            }
          </p>

          {!stats.isEligible && (
            <div className="mt-3 text-sm text-red-700">
              <p><strong>Primary Issues:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {stats.overallAttendance < 75 && (
                  <li>Overall attendance ({stats.overallAttendance}%) is below required 75%</li>
                )}
                {stats.manualDebarments > 0 && (
                  <li>{stats.manualDebarments} manual debarment(s) by faculty</li>
                )}
                {stats.automaticDebarments > 0 && (
                  <li>{stats.automaticDebarments} automatic debarment(s) due to attendance</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Quick Statistics */}
        {!stats.isEligible && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Total Debarments</p>
              <p className="text-lg font-bold text-gray-900">{stats.totalDebarments}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600">Manual</p>
              <p className="text-lg font-bold text-red-700">{stats.manualDebarments}</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-600">Automatic</p>
              <p className="text-lg font-bold text-yellow-700">{stats.automaticDebarments}</p>
            </div>
          </div>
        )}
      </div>

      {/* Debarred Subjects Section */}
      {!stats.isEligible && processedDebarments.length > 0 && (
        <>
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-medium text-gray-600">Filter by type:</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="manual">Manual Only</option>
                    <option value="automatic">Automatic Only</option>
                  </select>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Showing {filteredDebarments.length} of {stats.totalDebarments} debarments
              </div>
            </div>
          </div>

          {/* Debarred Subjects List */}
          <div className="divide-y divide-gray-100">
            {filteredDebarments.map((debarment, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    {getDebarmentIcon(debarment.type, debarment.severity)}
                    <div>
                      <h4 className="font-medium text-gray-900">{debarment.subject}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(debarment.type)}`}>
                          {debarment.isManual ? 'Manual' : 'Automatic'}
                        </span>
                        {debarment.severity === 'high' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            High Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Debarment Details */}
                <div className="ml-8 space-y-2">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-800 mb-1">Reason:</p>
                    <p className="text-sm text-gray-700">{debarment.reason || 'No specific reason provided'}</p>
                  </div>

                  {debarment.attendancePercentage > 0 && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Current Attendance:</p>
                        <p className={`font-medium ${
                          debarment.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {debarment.attendancePercentage}% ({debarment.attendedClasses}/{debarment.totalClasses})
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status:</p>
                        <p className={`font-medium ${
                          debarment.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {debarment.attendancePercentage >= 75 ? 'Meets Requirement' : 'Below Requirement'}
                        </p>
                      </div>
                    </div>
                  )}

                  {debarment.isAutomatic && debarment.attendancePercentage < 75 && (
                    <div className="bg-yellow-50 p-2 rounded text-xs">
                      <p className="text-yellow-800 font-medium">Recovery Action:</p>
                      <p className="text-yellow-700">
                        Need {Math.ceil((75 * debarment.totalClasses / 100) - debarment.attendedClasses)} more classes to reach 75%
                      </p>
                    </div>
                  )}

                  {debarment.isManual && (
                    <div className="bg-red-50 p-2 rounded text-xs">
                      <p className="text-red-800 font-medium">Manual Review Required:</p>
                      <p className="text-red-700">
                        Contact your faculty to discuss resolution of this debarment.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recovery Actions Section */}
      {!stats.isEligible && recoverySteps.length > 0 && (
        <div className="p-6 border-t border-gray-200 bg-blue-50">
          <h4 className="text-lg font-semibold text-blue-900 mb-4">Recovery Action Plan</h4>
          <div className="space-y-3">
            {recoverySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  step.priority === 'high' ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-yellow-50'
                }`}>
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      step.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                    <div className="flex-1">
                      <h5 className={`font-medium ${
                        step.priority === 'high' ? 'text-red-900' : 'text-yellow-900'
                      }`}>
                        {step.title}
                      </h5>
                      <p className={`text-sm mt-1 ${
                        step.priority === 'high' ? 'text-red-700' : 'text-yellow-700'
                      }`}>
                        {step.description}
                      </p>
                      <p className={`text-xs mt-2 font-medium ${
                        step.priority === 'high' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        Action: {step.action}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success Message for Eligible Students */}
      {stats.isEligible && (
        <div className="p-6 border-t border-gray-200 bg-green-50">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h4 className="text-lg font-semibold text-green-900">All Clear!</h4>
              <p className="text-sm text-green-700 mt-1">
                You meet all requirements for examination eligibility. Keep up the excellent work!
              </p>
              <div className="mt-3 text-xs text-green-600">
                <p>✓ Attendance requirement met ({stats.overallAttendance}% ≥ 75%)</p>
                <p>✓ No active debarments</p>
                <p>✓ Eligible for all examinations</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Status: <span className={`font-medium ${stats.isEligible ? 'text-green-600' : 'text-red-600'}`}>
              {stats.isEligible ? 'Eligible for Exams' : 'Debarred from Exams'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {debarmentData.lastUpdated ? new Date(debarmentData.lastUpdated).toLocaleString() : 'Not available'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebarmentStatus;