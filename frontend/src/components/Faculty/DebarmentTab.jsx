import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  ShieldCheck, 
  ShieldX,
  Edit3, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileText,
  RefreshCw,
  Info
} from 'lucide-react';
import { useAcademic } from '../../contexts/AcademicContext.jsx';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const DebarmentTab = ({ student }) => {
  const { user } = useAuth();
  const {
    debarments,
    attendance,
    loading,
    errors,
    updateDebarmentStatus,
    loadDebarments,
    setUnsavedChanges
  } = useAcademic();

  const [editingDebarments, setEditingDebarments] = useState({});
  const [debarmentReasons, setDebarmentReasons] = useState({});
  const [showReasonModal, setShowReasonModal] = useState(null);
  const [customReason, setCustomReason] = useState('');

  // Predefined debarment reasons
  const predefinedReasons = [
    'Low attendance (below 75%)',
    'Excessive absences without valid reason',
    'Poor academic performance',
    'Disciplinary issues',
    'Medical leave',
    'Administrative decision',
    'Custom reason'
  ];

  // Initialize debarment reasons
  useEffect(() => {
    if (debarments?.manualDebarments) {
      const reasons = {};
      Object.entries(debarments.manualDebarments).forEach(([subject, data]) => {
        reasons[subject] = data.reason || '';
      });
      setDebarmentReasons(reasons);
    }
  }, [debarments]);

  // Get all subjects (from attendance or debarments)
  const getAllSubjects = () => {
    const subjects = new Set();
    
    // Add subjects from attendance
    if (attendance) {
      attendance.forEach(att => {
        subjects.add(att.subjectCode || att.subjectId);
      });
    }
    
    // Add subjects from debarments
    if (debarments?.debarments) {
      debarments.debarments.forEach(subject => {
        subjects.add(subject);
      });
    }
    
    // Add subjects from manual debarments
    if (debarments?.manualDebarments) {
      Object.keys(debarments.manualDebarments).forEach(subject => {
        subjects.add(subject);
      });
    }
    
    return Array.from(subjects).map(subjectCode => {
      const attendanceData = attendance?.find(att => 
        att.subjectCode === subjectCode || att.subjectId === subjectCode
      );
      
      return {
        subjectCode,
        subjectName: attendanceData?.subjectName || `Subject ${subjectCode}`,
        attendancePercentage: attendanceData?.percentage || 0,
        isAutoDebarred: attendanceData?.isDebarred || false,
        isManuallyDebarred: debarments?.manualDebarments?.[subjectCode]?.isDebarred || false,
        manualDebarmentReason: debarments?.manualDebarments?.[subjectCode]?.reason || '',
        lastUpdated: debarments?.manualDebarments?.[subjectCode]?.updatedAt || null,
        updatedBy: debarments?.manualDebarments?.[subjectCode]?.updatedBy || null
      };
    });
  };

  const subjects = getAllSubjects();

  // Handle debarment toggle
  const handleDebarmentToggle = (subjectCode, currentStatus) => {
    if (!currentStatus) {
      // If debarring, show reason modal
      setShowReasonModal(subjectCode);
    } else {
      // If undebarring, do it directly
      handleDebarmentUpdate(subjectCode, false, 'Manual override by faculty');
    }
  };

  // Handle debarment update
  const handleDebarmentUpdate = async (subjectCode, isDebarred, reason) => {
    try {
      await updateDebarmentStatus(student._id || student.id, subjectCode, isDebarred, reason);
      setShowReasonModal(null);
      setCustomReason('');
    } catch (error) {
      console.error('Failed to update debarment status:', error);
    }
  };

  // Handle reason submission
  const handleReasonSubmit = () => {
    const subject = showReasonModal;
    let reason = debarmentReasons[subject] || '';
    
    if (reason === 'Custom reason') {
      reason = customReason.trim();
      if (!reason) {
        toast.error('Please enter a custom reason');
        return;
      }
    }
    
    if (!reason) {
      toast.error('Please select or enter a reason for debarment');
      return;
    }
    
    handleDebarmentUpdate(subject, true, reason);
  };

  // Get debarment status for a subject
  const getDebarmentStatus = (subject) => {
    const isAutoDebarred = subject.isAutoDebarred;
    const isManuallyDebarred = subject.isManuallyDebarred;
    const isDebarred = isAutoDebarred || isManuallyDebarred;
    
    if (isDebarred) {
      return {
        status: 'debarred',
        type: isManuallyDebarred ? 'manual' : 'automatic',
        reason: subject.manualDebarmentReason || 'Low attendance (below 75%)',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: ShieldX
      };
    } else {
      return {
        status: 'active',
        type: 'active',
        reason: 'Student is in good standing',
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: ShieldCheck
      };
    }
  };

  // Calculate statistics
  const getDebarmentStats = () => {
    const totalSubjects = subjects.length;
    const autoDebarred = subjects.filter(s => s.isAutoDebarred).length;
    const manuallyDebarred = subjects.filter(s => s.isManuallyDebarred).length;
    const totalDebarred = subjects.filter(s => s.isAutoDebarred || s.isManuallyDebarred).length;
    const activeSubjects = totalSubjects - totalDebarred;
    
    return {
      totalSubjects,
      autoDebarred,
      manuallyDebarred,
      totalDebarred,
      activeSubjects
    };
  };

  const stats = getDebarmentStats();

  if (loading.debarments && !subjects.length) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading debarment status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Statistics */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-red-900">Debarment Status</h3>
          <Shield className="h-6 w-6 text-red-600" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-red-600 font-medium">Total Subjects</span>
            <p className="text-2xl font-bold text-red-900">{stats.totalSubjects}</p>
          </div>
          <div>
            <span className="text-green-600 font-medium">Active</span>
            <p className="text-2xl font-bold text-green-900">{stats.activeSubjects}</p>
          </div>
          <div>
            <span className="text-orange-600 font-medium">Auto Debarred</span>
            <p className="text-2xl font-bold text-orange-900">{stats.autoDebarred}</p>
          </div>
          <div>
            <span className="text-red-600 font-medium">Manual Debarred</span>
            <p className="text-2xl font-bold text-red-900">{stats.manuallyDebarred}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.debarments && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error Loading Debarment Status</h3>
              <p className="text-sm text-red-700 mt-1">{errors.debarments}</p>
              <button
                onClick={() => loadDebarments(student._id || student.id)}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                Try Again →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800">Debarment Information</h3>
            <div className="text-sm text-blue-700 mt-1 space-y-1">
              <p>• <strong>Automatic Debarment:</strong> Students are automatically debarred when attendance falls below 75%</p>
              <p>• <strong>Manual Debarment:</strong> Faculty can manually debar students for disciplinary or academic reasons</p>
              <p>• <strong>Override:</strong> Manual debarment can override automatic calculations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects List */}
      {subjects.length > 0 ? (
        <div className="space-y-4">
          {subjects.map((subject) => {
            const status = getDebarmentStatus(subject);
            const StatusIcon = status.icon;
            const isDebarred = status.status === 'debarred';

            return (
              <div key={subject.subjectCode} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${status.color}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <StatusIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {subject.subjectCode}
                      </h4>
                      <p className="text-sm text-gray-600">{subject.subjectName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Status Badge */}
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                      <StatusIcon className="h-4 w-4 mr-2" />
                      <span className="capitalize">{status.status}</span>
                    </div>

                    {/* Debarment Type */}
                    {isDebarred && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        status.type === 'manual' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {status.type === 'manual' ? 'Manual' : 'Auto'}
                      </span>
                    )}

                    {/* Toggle Button */}
                    <button
                      onClick={() => handleDebarmentToggle(subject.subjectCode, isDebarred)}
                      disabled={loading.updating}
                      className={`px-4 py-2 text-sm font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                        isDebarred
                          ? 'text-green-700 bg-green-50 border-green-300 hover:bg-green-100 focus:ring-green-500'
                          : 'text-red-700 bg-red-50 border-red-300 hover:bg-red-100 focus:ring-red-500'
                      }`}
                    >
                      {loading.updating ? 'Updating...' : (isDebarred ? 'Remove Debarment' : 'Debar Student')}
                    </button>
                  </div>
                </div>

                {/* Status Details */}
                <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Reason:</p>
                      <p className="text-sm text-gray-700">{status.reason}</p>
                    </div>
                    
                    {subject.attendancePercentage > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Attendance:</p>
                        <p className={`text-sm font-semibold ${
                          subject.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {subject.attendancePercentage.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Last Updated Info */}
                {subject.lastUpdated && (
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white border-opacity-50">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Last updated: {new Date(subject.lastUpdated).toLocaleString()}</span>
                    </div>
                    {subject.updatedBy && (
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        <span>By faculty</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Found</h3>
          <p className="text-gray-500 mb-4">
            No subjects are available for debarment management.
          </p>
          <p className="text-sm text-gray-400">
            Subjects appear here when attendance records are created.
          </p>
        </div>
      )}

      {/* Reason Selection Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Debar Student from {showReasonModal}
              </h3>
              <button
                onClick={() => setShowReasonModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Reason for Debarment:
                </label>
                <div className="space-y-2">
                  {predefinedReasons.map((reason) => (
                    <label key={reason} className="flex items-center">
                      <input
                        type="radio"
                        name="debarmentReason"
                        value={reason}
                        checked={debarmentReasons[showReasonModal] === reason}
                        onChange={(e) => setDebarmentReasons(prev => ({
                          ...prev,
                          [showReasonModal]: e.target.value
                        }))}
                        className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {debarmentReasons[showReasonModal] === 'Custom reason' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Reason:
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={3}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    placeholder="Enter custom reason for debarment..."
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReasonModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReasonSubmit}
                disabled={loading.updating}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {loading.updating ? 'Debarring...' : 'Debar Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebarmentTab;