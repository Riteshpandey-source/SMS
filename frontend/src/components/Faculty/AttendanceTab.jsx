import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Edit3, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  RefreshCw,
  Plus,
  BarChart3,
  Trash2
} from 'lucide-react';
import { useAcademic } from '../../contexts/AcademicContext.jsx';
import toast from 'react-hot-toast';

const AttendanceTab = ({ student }) => {
  const {
    attendance,
    loading,
    errors,
    updateAttendance,
    deleteAttendance,
    loadAttendance,
    setUnsavedChanges,
    calculateAttendancePercentage,
    getAttendanceStatus,
    isDebarred
  } = useAcademic();

  const [editingAttendance, setEditingAttendance] = useState({});
  const [localAttendance, setLocalAttendance] = useState([]);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    attendedClasses: '',
    totalClasses: '',
    applyToAll: false
  });

  // Initialize local attendance when attendance changes
  useEffect(() => {
    setLocalAttendance(attendance || []);
  }, [attendance]);

  // Handle edit mode toggle
  const handleEditToggle = (attendanceId) => {
    setEditingAttendance(prev => ({
      ...prev,
      [attendanceId]: !prev[attendanceId]
    }));
  };

  // Handle attendance value change
  const handleAttendanceChange = (attendanceId, field, value) => {
    const numValue = Number(value);
    
    setLocalAttendance(prev => prev.map(att => {
      if (att.subjectId === attendanceId || att.subjectCode === attendanceId) {
        const updatedAtt = { ...att, [field]: numValue };
        
        // Recalculate percentage
        if (field === 'attendedClasses' || field === 'totalClasses') {
          updatedAtt.percentage = calculateAttendancePercentage(
            field === 'attendedClasses' ? numValue : att.attendedClasses,
            field === 'totalClasses' ? numValue : att.totalClasses
          );
          
          // Update debarment status
          updatedAtt.isDebarred = isDebarred(updatedAtt.percentage, att.requiredPercentage || 75);
        }
        
        return updatedAtt;
      }
      return att;
    }));
    
    setUnsavedChanges(true);
  };

  // Handle save individual attendance
  const handleSaveAttendance = async (attendanceId) => {
    const att = localAttendance.find(a => a.subjectId === attendanceId || a.subjectCode === attendanceId);
    if (!att) return;

    // Validate attendance
    if (att.attendedClasses < 0 || att.totalClasses < 0) {
      toast.error('Attendance values cannot be negative');
      return;
    }

    if (att.attendedClasses > att.totalClasses) {
      toast.error('Attended classes cannot exceed total classes');
      return;
    }

    try {
      const attendanceData = {
        attendedClasses: att.attendedClasses,
        totalClasses: att.totalClasses,
        academicYear: student.academicYear,
        semester: 'current'
      };

      await updateAttendance(student._id || student.id, att.subjectId || att.subjectCode, attendanceData);
      setEditingAttendance(prev => ({ ...prev, [attendanceId]: false }));
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = (attendanceId) => {
    // Reset to original value
    const originalAtt = attendance.find(a => a.subjectId === attendanceId || a.subjectCode === attendanceId);
    if (originalAtt) {
      setLocalAttendance(prev => prev.map(att => 
        att.subjectId === attendanceId || att.subjectCode === attendanceId ? originalAtt : att
      ));
    }
    setEditingAttendance(prev => ({ ...prev, [attendanceId]: false }));
    setUnsavedChanges(false);
  };

  // Handle delete attendance
  const handleDeleteAttendance = async (attendanceId, subjectCode) => {
    if (!window.confirm(`Are you sure you want to delete attendance for ${subjectCode}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting attendance:', subjectCode, 'ID:', attendanceId);
      await deleteAttendance(student._id || student.id, attendanceId);
      toast.success(`Attendance for ${subjectCode} deleted successfully`);
    } catch (error) {
      console.error('❌ Failed to delete attendance:', error);
      toast.error('Failed to delete attendance');
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (!bulkUpdateData.attendedClasses || !bulkUpdateData.totalClasses) {
      toast.error('Please enter both attended and total classes');
      return;
    }

    const attendedClasses = Number(bulkUpdateData.attendedClasses);
    const totalClasses = Number(bulkUpdateData.totalClasses);

    if (attendedClasses < 0 || totalClasses < 0) {
      toast.error('Attendance values cannot be negative');
      return;
    }

    if (attendedClasses > totalClasses) {
      toast.error('Attended classes cannot exceed total classes');
      return;
    }

    try {
      // Update all subjects or selected ones
      const updates = localAttendance.map(att => ({
        studentId: student._id || student.id,
        subjectId: att.subjectId || att.subjectCode,
        attendedClasses: bulkUpdateData.applyToAll ? attendedClasses : att.attendedClasses,
        totalClasses: bulkUpdateData.applyToAll ? totalClasses : att.totalClasses
      }));

      // For now, update one by one (can be optimized with bulk API later)
      for (const update of updates) {
        if (bulkUpdateData.applyToAll || editingAttendance[update.subjectId]) {
          await updateAttendance(update.studentId, update.subjectId, {
            attendedClasses: update.attendedClasses,
            totalClasses: update.totalClasses,
            academicYear: student.academicYear,
            semester: 'current'
          });
        }
      }

      setShowBulkUpdate(false);
      setBulkUpdateData({ attendedClasses: '', totalClasses: '', applyToAll: false });
      setEditingAttendance({});
      setUnsavedChanges(false);
      toast.success('Bulk attendance update completed');
    } catch (error) {
      console.error('Failed to bulk update attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  // Get attendance status styling
  const getAttendanceStatusStyle = (percentage, requiredPercentage = 75) => {
    const status = getAttendanceStatus(percentage, requiredPercentage);
    
    switch (status.status) {
      case 'good':
        return {
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
          icon: CheckCircle
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500',
          icon: AlertTriangle
        };
      case 'critical':
        return {
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500',
          icon: AlertCircle
        };
      default:
        return {
          bgColor: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-500',
          icon: Clock
        };
    }
  };

  // Calculate overall statistics
  const getOverallStats = () => {
    if (!localAttendance.length) return null;

    const totalSubjects = localAttendance.length;
    const averageAttendance = localAttendance.reduce((sum, att) => sum + att.percentage, 0) / totalSubjects;
    const debarredCount = localAttendance.filter(att => att.isDebarred).length;
    const goodAttendance = localAttendance.filter(att => att.percentage >= 75).length;

    return {
      totalSubjects,
      averageAttendance: Math.round(averageAttendance * 100) / 100,
      debarredCount,
      goodAttendance,
      warningCount: totalSubjects - goodAttendance - debarredCount
    };
  };

  const stats = getOverallStats();

  if (loading.attendance && !localAttendance.length) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Statistics */}
      {stats && (
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Attendance Overview</h3>
            <BarChart3 className="h-5 w-5 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-bold uppercase tracking-wider">Total Subjects</span>
              <p className="text-xl font-black text-slate-800 mt-1">{stats.totalSubjects}</p>
            </div>
            <div>
              <span className="text-slate-500 font-bold uppercase tracking-wider">Average</span>
              <p className="text-xl font-black text-slate-800 mt-1">{stats.averageAttendance}%</p>
            </div>
            <div>
              <span className="text-emerald-600 font-bold uppercase tracking-wider">Good Standing</span>
              <p className="text-xl font-black text-emerald-700 mt-1">{stats.goodAttendance}</p>
            </div>
            <div>
              <span className="text-rose-600 font-bold uppercase tracking-wider">Debarred</span>
              <p className="text-xl font-black text-rose-700 mt-1">{stats.debarredCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {errors.attendance && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error Loading Attendance</h3>
              <p className="text-sm text-red-700 mt-1">{errors.attendance}</p>
              <button
                onClick={() => loadAttendance(student._id || student.id, student.academicYear)}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                Try Again →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowBulkUpdate(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Bulk Update
        </button>

        {Object.keys(editingAttendance).some(key => editingAttendance[key]) && (
          <div className="text-sm text-amber-600 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>You have unsaved changes</span>
          </div>
        )}
      </div>

      {/* Bulk Update Form */}
      {showBulkUpdate && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Bulk Update Attendance</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attended Classes
              </label>
              <input
                type="number"
                min="0"
                value={bulkUpdateData.attendedClasses}
                onChange={(e) => setBulkUpdateData(prev => ({ ...prev, attendedClasses: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., 45"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Classes
              </label>
              <input
                type="number"
                min="1"
                value={bulkUpdateData.totalClasses}
                onChange={(e) => setBulkUpdateData(prev => ({ ...prev, totalClasses: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., 50"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={bulkUpdateData.applyToAll}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, applyToAll: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Apply to all subjects</span>
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowBulkUpdate(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpdate}
              disabled={loading.updating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading.updating ? 'Updating...' : 'Update Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Attendance List */}
      {localAttendance.length > 0 ? (
        <div className="space-y-4">
          {localAttendance.map((att) => {
            const attId = att.subjectId || att.subjectCode;
            const isEditing = editingAttendance[attId];
            const statusStyle = getAttendanceStatusStyle(att.percentage, att.requiredPercentage);
            const StatusIcon = statusStyle.icon;
            const status = getAttendanceStatus(att.percentage, att.requiredPercentage);

            return (
              <div key={attId} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${statusStyle.bgColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {att.subjectCode}
                      </h4>
                      <p className="text-sm text-gray-600">{att.subjectName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Status Badge */}
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyle.textColor}`}>
                      <StatusIcon className={`h-4 w-4 mr-2 ${statusStyle.iconColor}`} />
                      <span>{att.percentage.toFixed(1)}%</span>
                    </div>

                    {/* Debarment Warning */}
                    {att.isDebarred && (
                      <div className="flex items-center text-red-600 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span>DEBARRED</span>
                      </div>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => isEditing ? handleCancelEdit(attId) : handleEditToggle(attId)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white hover:bg-opacity-50"
                      title={isEditing ? 'Cancel edit' : 'Edit attendance'}
                    >
                      {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteAttendance(attId, att.subjectCode)}
                      className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete attendance"
                      disabled={loading.updating}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Status Message */}
                <div className={`mb-4 p-3 rounded-lg bg-white bg-opacity-50 ${statusStyle.textColor}`}>
                  <p className="text-sm font-medium">{status.message}</p>
                  {att.requiredPercentage && att.percentage < att.requiredPercentage && (
                    <p className="text-xs mt-1">
                      Required: {att.requiredPercentage}% | Current: {att.percentage.toFixed(1)}% | 
                      Deficit: {(att.requiredPercentage - att.percentage).toFixed(1)}%
                    </p>
                  )}
                </div>

                {/* Attendance Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attended Classes
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max={att.totalClasses}
                        value={att.attendedClasses}
                        onChange={(e) => handleAttendanceChange(attId, 'attendedClasses', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-gray-900">{att.attendedClasses}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Classes
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={att.totalClasses}
                        onChange={(e) => handleAttendanceChange(attId, 'totalClasses', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-gray-900">{att.totalClasses}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Percentage
                    </label>
                    <p className="text-lg font-semibold text-gray-900">{att.requiredPercentage || 75}%</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Attendance Progress</span>
                    <span>{att.attendedClasses} / {att.totalClasses} classes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        att.percentage >= 75 ? 'bg-green-500' : 
                        att.percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(att.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Save Button for Individual Attendance */}
                {isEditing && (
                  <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-white border-opacity-50">
                    <button
                      onClick={() => handleCancelEdit(attId)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveAttendance(attId)}
                      disabled={loading.updating}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading.updating ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
          <p className="text-gray-500 mb-4">
            No attendance records have been found for this student yet.
          </p>
          <p className="text-sm text-gray-400">
            Attendance records are automatically created when academic records are set up.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;