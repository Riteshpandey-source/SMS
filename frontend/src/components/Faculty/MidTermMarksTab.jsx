import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Calendar,
  Award,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useAcademic } from '../../contexts/AcademicContext.jsx';
import toast from 'react-hot-toast';

const MidTermMarksTab = ({ student }) => {
  const {
    midTermMarks,
    loading,
    errors,
    updateMidTermMarks,
    loadMidTermMarks,
    setUnsavedChanges,
    calculateGrade
  } = useAcademic();

  const [editingMarks, setEditingMarks] = useState({});
  const [newSubject, setNewSubject] = useState({
    subjectCode: '',
    subjectName: '',
    maxMarks: 100,
    obtainedMarks: 0,
    examDate: new Date().toISOString().split('T')[0]
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [localMarks, setLocalMarks] = useState([]);

  // Initialize local marks when midTermMarks changes
  useEffect(() => {
    console.log('📊 MidTermMarksTab: Received midTermMarks from context:', midTermMarks);
    console.log('📊 MidTermMarksTab: Student prop:', student);
    setLocalMarks(midTermMarks || []);
  }, [midTermMarks, student]);

  // Handle edit mode toggle
  const handleEditToggle = (markId) => {
    setEditingMarks(prev => ({
      ...prev,
      [markId]: !prev[markId]
    }));
  };

  // Handle mark value change
  const handleMarkChange = (markId, field, value) => {
    setLocalMarks(prev => prev.map(mark => 
      mark._id === markId || mark.subjectCode === markId
        ? { ...mark, [field]: field === 'obtainedMarks' || field === 'maxMarks' ? Number(value) : value }
        : mark
    ));
    setUnsavedChanges(true);
  };

  // Handle save individual mark
  const handleSaveMark = async (markId) => {
    const mark = localMarks.find(m => m._id === markId || m.subjectCode === markId);
    if (!mark) return;

    // Validate mark
    if (mark.obtainedMarks < 0 || mark.obtainedMarks > mark.maxMarks) {
      toast.error('Obtained marks must be between 0 and maximum marks');
      return;
    }

    try {
      await updateMidTermMarks(student._id || student.id, [mark], student.academicYear);
      setEditingMarks(prev => ({ ...prev, [markId]: false }));
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save mark:', error);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = (markId) => {
    // Reset to original value
    const originalMark = midTermMarks.find(m => m._id === markId || m.subjectCode === markId);
    if (originalMark) {
      setLocalMarks(prev => prev.map(mark => 
        mark._id === markId || mark.subjectCode === markId ? originalMark : mark
      ));
    }
    setEditingMarks(prev => ({ ...prev, [markId]: false }));
    setUnsavedChanges(false);
  };

  // Handle add new subject
  const handleAddSubject = async () => {
    // Validate new subject
    if (!newSubject.subjectCode.trim() || !newSubject.subjectName.trim()) {
      toast.error('Subject code and name are required');
      return;
    }

    if (newSubject.obtainedMarks < 0 || newSubject.obtainedMarks > newSubject.maxMarks) {
      toast.error('Obtained marks must be between 0 and maximum marks');
      return;
    }

    // Check if subject already exists
    const existingSubject = localMarks.find(mark => 
      mark.subjectCode.toLowerCase() === newSubject.subjectCode.toLowerCase()
    );
    if (existingSubject) {
      toast.error('Subject already exists');
      return;
    }

    try {
      const markToAdd = {
        ...newSubject,
        subjectCode: newSubject.subjectCode.toUpperCase(),
        grade: calculateGrade(newSubject.obtainedMarks, newSubject.maxMarks)
      };

      await updateMidTermMarks(student._id || student.id, [markToAdd], student.academicYear);
      
      // Reset form
      setNewSubject({
        subjectCode: '',
        subjectName: '',
        maxMarks: 100,
        obtainedMarks: 0,
        examDate: new Date().toISOString().split('T')[0]
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add subject:', error);
    }
  };

  // Handle save all changes
  const handleSaveAll = async () => {
    try {
      await updateMidTermMarks(student._id || student.id, localMarks, student.academicYear);
      setEditingMarks({});
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save all marks:', error);
    }
  };

  // Handle delete subject
  const handleDeleteSubject = async (markId, subjectCode) => {
    if (!window.confirm(`Are you sure you want to delete ${subjectCode}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting subject:', subjectCode, 'Mark ID:', markId);
      console.log('🗑️ Current marks:', localMarks);
      
      // Remove from local state
      const updatedMarks = localMarks.filter(mark => {
        const currentMarkId = mark._id || mark.subjectCode;
        console.log('   Checking mark:', currentMarkId, 'vs', markId);
        return currentMarkId !== markId;
      });
      
      console.log('🗑️ Updated marks after filter:', updatedMarks);
      console.log('🗑️ Sending to backend:', updatedMarks.length, 'marks');
      
      // Update in backend - this will replace the entire array
      await updateMidTermMarks(student._id || student.id, updatedMarks, student.academicYear);
      
      console.log('✅ Backend updated successfully');
      console.log('✅ Cache cleared, forcing reload...');
      
      // Force reload from backend to ensure we have latest data
      // Cache is already cleared by updateMidTermMarks
      await loadMidTermMarks(student._id || student.id, student.academicYear);
      
      console.log('✅ Reload complete');
      toast.success(`${subjectCode} deleted successfully`);
    } catch (error) {
      console.error('❌ Failed to delete subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  // Get grade color
  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-50';
      case 'B+':
      case 'B':
        return 'text-blue-600 bg-blue-50';
      case 'C+':
      case 'C':
        return 'text-yellow-600 bg-yellow-50';
      case 'D':
        return 'text-orange-600 bg-orange-50';
      case 'F':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Get performance trend
  const getPerformanceTrend = (obtainedMarks, maxMarks) => {
    const percentage = (obtainedMarks / maxMarks) * 100;
    if (percentage >= 80) return { icon: TrendingUp, color: 'text-green-500', text: 'Excellent' };
    if (percentage >= 60) return { icon: TrendingUp, color: 'text-blue-500', text: 'Good' };
    if (percentage >= 40) return { icon: TrendingDown, color: 'text-yellow-500', text: 'Average' };
    return { icon: TrendingDown, color: 'text-red-500', text: 'Needs Improvement' };
  };

  // Calculate statistics
  const getStatistics = () => {
    if (!localMarks.length) return null;

    const totalMarks = localMarks.reduce((sum, mark) => sum + mark.obtainedMarks, 0);
    const totalMaxMarks = localMarks.reduce((sum, mark) => sum + mark.maxMarks, 0);
    const averagePercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    const passedSubjects = localMarks.filter(mark => (mark.obtainedMarks / mark.maxMarks) * 100 >= 40).length;

    return {
      totalSubjects: localMarks.length,
      averagePercentage: Math.round(averagePercentage * 100) / 100,
      passedSubjects,
      failedSubjects: localMarks.length - passedSubjects
    };
  };

  const stats = getStatistics();

  if (loading.midTermMarks && !localMarks.length) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading mid-term marks...</p>
        </div>
      </div>
    );
  }

  console.log('📊 MidTermMarksTab: Rendering with localMarks:', localMarks);
  console.log('📊 MidTermMarksTab: Stats:', stats);

  return (
    <div className="p-6 space-y-6">
      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
        <p><strong>Debug Info:</strong></p>
        <p>Student: {student?.name} (ID: {student?._id || student?.id})</p>
        <p>Local Marks Count: {localMarks?.length || 0}</p>
        <p>Context Marks Count: {midTermMarks?.length || 0}</p>
        <p>Loading: {loading.midTermMarks ? 'Yes' : 'No'}</p>
        <p>Error: {errors.midTermMarks || 'None'}</p>
      </div>

      {/* Header with Statistics */}
      {stats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-blue-900">Performance Overview</h3>
            <Award className="h-6 w-6 text-blue-600" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Total Subjects</span>
              <p className="text-2xl font-bold text-blue-900">{stats.totalSubjects}</p>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Average</span>
              <p className="text-2xl font-bold text-blue-900">{stats.averagePercentage}%</p>
            </div>
            <div>
              <span className="text-green-600 font-medium">Passed</span>
              <p className="text-2xl font-bold text-green-900">{stats.passedSubjects}</p>
            </div>
            <div>
              <span className="text-red-600 font-medium">Failed</span>
              <p className="text-2xl font-bold text-red-900">{stats.failedSubjects}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {errors.midTermMarks && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error Loading Marks</h3>
              <p className="text-sm text-red-700 mt-1">{errors.midTermMarks}</p>
              <button
                onClick={() => loadMidTermMarks(student._id || student.id, student.academicYear)}
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
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </button>

        {Object.keys(editingMarks).some(key => editingMarks[key]) && (
          <button
            onClick={handleSaveAll}
            disabled={loading.updating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading.updating ? 'Saving...' : 'Save All Changes'}
          </button>
        )}
      </div>

      {/* Add New Subject Form */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Add New Subject</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Code *
              </label>
              <input
                type="text"
                value={newSubject.subjectCode}
                onChange={(e) => setNewSubject(prev => ({ ...prev, subjectCode: e.target.value.toUpperCase() }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., CS101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Name *
              </label>
              <input
                type="text"
                value={newSubject.subjectName}
                onChange={(e) => setNewSubject(prev => ({ ...prev, subjectName: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Computer Science Fundamentals"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Marks
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={newSubject.maxMarks}
                onChange={(e) => setNewSubject(prev => ({ ...prev, maxMarks: Number(e.target.value) }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Obtained Marks
              </label>
              <input
                type="number"
                min="0"
                max={newSubject.maxMarks}
                value={newSubject.obtainedMarks}
                onChange={(e) => setNewSubject(prev => ({ ...prev, obtainedMarks: Number(e.target.value) }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Date
              </label>
              <input
                type="date"
                value={newSubject.examDate}
                onChange={(e) => setNewSubject(prev => ({ ...prev, examDate: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSubject}
              disabled={loading.updating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading.updating ? 'Adding...' : 'Add Subject'}
            </button>
          </div>
        </div>
      )}

      {/* Marks List */}
      {localMarks.length > 0 ? (
        <div className="space-y-4">
          {localMarks.map((mark) => {
            const markId = mark._id || mark.subjectCode;
            const isEditing = editingMarks[markId];
            const grade = calculateGrade(mark.obtainedMarks, mark.maxMarks);
            const percentage = Math.round((mark.obtainedMarks / mark.maxMarks) * 100);
            const trend = getPerformanceTrend(mark.obtainedMarks, mark.maxMarks);
            const TrendIcon = trend.icon;

            return (
              <div key={markId} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <BookOpen className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {mark.subjectCode}
                      </h4>
                      <p className="text-sm text-gray-600">{mark.subjectName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Grade Badge */}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(grade)}`}>
                      {grade}
                    </span>

                    {/* Performance Trend */}
                    <div className={`flex items-center ${trend.color}`} title={trend.text}>
                      <TrendIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{percentage}%</span>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => isEditing ? handleCancelEdit(markId) : handleEditToggle(markId)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title={isEditing ? 'Cancel edit' : 'Edit marks'}
                    >
                      {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteSubject(markId, mark.subjectCode)}
                      className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete subject"
                      disabled={loading.updating}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Marks Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Obtained Marks
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max={mark.maxMarks}
                        value={mark.obtainedMarks}
                        onChange={(e) => handleMarkChange(markId, 'obtainedMarks', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-gray-900">{mark.obtainedMarks}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Marks
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={mark.maxMarks}
                        onChange={(e) => handleMarkChange(markId, 'maxMarks', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-gray-900">{mark.maxMarks}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exam Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={mark.examDate ? new Date(mark.examDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleMarkChange(markId, 'examDate', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <div className="flex items-center text-gray-900">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{mark.examDate ? new Date(mark.examDate).toLocaleDateString() : 'Not set'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Button for Individual Mark */}
                {isEditing && (
                  <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleCancelEdit(markId)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveMark(markId)}
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
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Mid-term Marks</h3>
          <p className="text-gray-500 mb-4">
            No mid-term marks have been recorded for this student yet.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Subject
          </button>
        </div>
      )}
    </div>
  );
};

export default MidTermMarksTab;