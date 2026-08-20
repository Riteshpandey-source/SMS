import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Save,
  RefreshCw,
  User,
  BookOpen,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Calendar,
  Award,
  CheckCircle,
  X,
  Plus,
  Minus,
  Edit3
} from 'lucide-react';
import { useAcademic } from '../../contexts/AcademicContext';
import toast from 'react-hot-toast';

const AcademicDataManager = ({ student, onClose }) => {
  const {
    getStudentAcademicData,
    updateStudentMarks,
    updateStudentAttendance,
    updateStudentDebarment,
    loading
  } = useAcademic();

  const [activeTab, setActiveTab] = useState('marks');
  const [academicData, setAcademicData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);

  // Local state for editing
  const [editingMarks, setEditingMarks] = useState({});
  const [editingAttendance, setEditingAttendance] = useState({});
  const [editingDebarment, setEditingDebarment] = useState({});

  useEffect(() => {
    if (student) {
      loadAcademicData();
    }
  }, [student]);

  const loadAcademicData = async () => {
    setLocalLoading(true);
    try {
      const data = await getStudentAcademicData(student.id || student._id);
      setAcademicData(data);
      
      // Initialize editing states with default structure if empty
      setEditingMarks(data.marks || { subjects: {} });
      setEditingAttendance(data.attendance || { subjects: {} });
      setEditingDebarment(data.debarment || { subjects: {} });
      
      console.log('Academic data loaded successfully:', data);
    } catch (error) {
      console.error('Failed to load academic data:', error);
      toast.error('Failed to load academic data');
      
      // Set default data structure on error
      const defaultData = {
        marks: { subjects: {} },
        attendance: { subjects: {} },
        debarment: { subjects: {} }
      };
      
      setAcademicData(defaultData);
      setEditingMarks(defaultData.marks);
      setEditingAttendance(defaultData.attendance);
      setEditingDebarment(defaultData.debarment);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSaveMarks = async () => {
    try {
      setSaving(true);
      
      // Convert empty strings to numbers before saving
      const processedMarks = {
        ...editingMarks,
        subjects: Object.fromEntries(
          Object.entries(editingMarks.subjects || {}).map(([subject, marks]) => [
            subject,
            {
              obtainedMarks: parseFloat(marks.obtainedMarks) || 0,
              totalMarks: parseFloat(marks.totalMarks) || 100
            }
          ])
        )
      };
      
      console.log('📊 Saving marks:', processedMarks);
      console.log('📊 Student academic year:', student.academicYear);
      
      await updateStudentMarks(student.id || student._id, processedMarks, student.academicYear);
      setAcademicData(prev => ({ ...prev, marks: processedMarks }));
      setEditingMarks(processedMarks);
      setHasChanges(false);
      toast.success('Marks updated successfully');
    } catch (error) {
      console.error('Failed to save marks:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`Failed to save marks: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      
      // Convert empty strings to numbers before saving
      const processedAttendance = {
        ...editingAttendance,
        subjects: Object.fromEntries(
          Object.entries(editingAttendance.subjects || {}).map(([subject, attendance]) => [
            subject,
            {
              attended: parseInt(attendance.attended) || 0,
              total: parseInt(attendance.total) || 0,
              percentage: attendance.total > 0 ? Math.round((attendance.attended / attendance.total) * 100) : 0
            }
          ])
        )
      };
      
      console.log('Saving processed attendance:', processedAttendance);
      
      await updateStudentAttendance(student.id || student._id, processedAttendance);
      setAcademicData(prev => ({ ...prev, attendance: processedAttendance }));
      setEditingAttendance(processedAttendance);
      setHasChanges(false);
      toast.success('Attendance updated successfully');
    } catch (error) {
      console.error('Failed to save attendance:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`Failed to save attendance: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDebarment = async () => {
    try {
      setSaving(true);
      await updateStudentDebarment(student.id || student._id, editingDebarment);
      setAcademicData(prev => ({ ...prev, debarment: editingDebarment }));
      setHasChanges(false);
      toast.success('Debarment status updated successfully');
    } catch (error) {
      console.error('Failed to save debarment status:', error);
      toast.error('Failed to save debarment status');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      
      // Track results for each operation
      const results = {
        marks: { success: false, error: null, attempted: false },
        attendance: { success: false, error: null, attempted: false },
        debarment: { success: false, error: null, attempted: false }
      };

      // Save Marks (independent operation)
      if (editingMarks && Object.keys(editingMarks.subjects || {}).length > 0) {
        results.marks.attempted = true;
        try {
          const processedMarks = {
            ...editingMarks,
            subjects: Object.fromEntries(
              Object.entries(editingMarks.subjects || {}).map(([subject, marks]) => [
                subject,
                {
                  obtainedMarks: parseFloat(marks.obtainedMarks) || 0,
                  totalMarks: parseFloat(marks.totalMarks) || 100
                }
              ])
            )
          };
          
          console.log('📊 Saving marks:', processedMarks);
          console.log('📊 Student academic year:', student.academicYear);
          await updateStudentMarks(student.id || student._id, processedMarks, student.academicYear);
          setAcademicData(prev => ({ ...prev, marks: processedMarks }));
          setEditingMarks(processedMarks);
          results.marks.success = true;
          console.log('✅ Marks saved successfully');
        } catch (error) {
          results.marks.error = error.response?.data?.error?.message || error.message;
          console.error('❌ Failed to save marks:', error);
        }
      }

      // Save Attendance (independent operation - continues even if marks failed)
      if (editingAttendance && Object.keys(editingAttendance.subjects || {}).length > 0) {
        results.attendance.attempted = true;
        try {
          const processedAttendance = {
            ...editingAttendance,
            subjects: Object.fromEntries(
              Object.entries(editingAttendance.subjects || {}).map(([subject, attendance]) => [
                subject,
                {
                  attended: parseInt(attendance.attended) || 0,
                  total: parseInt(attendance.total) || 0,
                  percentage: attendance.total > 0 ? Math.round((attendance.attended / attendance.total) * 100) : 0
                }
              ])
            )
          };
          
          console.log('📅 Saving attendance:', processedAttendance);
          console.log('📅 Student academic year:', student.academicYear);
          await updateStudentAttendance(student.id || student._id, processedAttendance, student.academicYear);
          setAcademicData(prev => ({ ...prev, attendance: processedAttendance }));
          setEditingAttendance(processedAttendance);
          results.attendance.success = true;
          console.log('✅ Attendance saved successfully');
        } catch (error) {
          results.attendance.error = error.response?.data?.error?.message || error.message;
          console.error('❌ Failed to save attendance:', error);
        }
      }

      // Save Debarment (independent operation - continues even if others failed)
      if (editingDebarment && Object.keys(editingDebarment.subjects || {}).length > 0) {
        results.debarment.attempted = true;
        try {
          console.log('⚠️ Saving debarment:', editingDebarment);
          await updateStudentDebarment(student.id || student._id, editingDebarment);
          setAcademicData(prev => ({ ...prev, debarment: editingDebarment }));
          results.debarment.success = true;
          console.log('✅ Debarment saved successfully');
        } catch (error) {
          results.debarment.error = error.response?.data?.error?.message || error.message;
          console.error('❌ Failed to save debarment:', error);
        }
      }

      // Calculate success and failure counts
      const attemptedOperations = Object.values(results).filter(r => r.attempted);
      const successfulOperations = attemptedOperations.filter(r => r.success);
      const failedOperations = attemptedOperations.filter(r => !r.success);
      
      const successCount = successfulOperations.length;
      const failureCount = failedOperations.length;
      const totalAttempted = attemptedOperations.length;

      console.log('📊 Save All Results:', {
        total: totalAttempted,
        successful: successCount,
        failed: failureCount,
        details: results
      });

      // Update UI state based on results
      if (successCount === totalAttempted && totalAttempted > 0) {
        // All operations succeeded
        setHasChanges(false);
        toast.success(`✅ All data saved successfully! (${successCount}/${totalAttempted} operations)`);
      } else if (successCount > 0 && failureCount > 0) {
        // Partial success
        setHasChanges(failureCount > 0); // Keep changes flag if some failed
        toast(`⚠️ Partially saved: ${successCount} succeeded, ${failureCount} failed`, {
          icon: '⚠️',
          duration: 5000
        });
        
        // Show specific errors
        Object.entries(results).forEach(([operation, result]) => {
          if (result.attempted && !result.success && result.error) {
            toast.error(`${operation.charAt(0).toUpperCase() + operation.slice(1)}: ${result.error}`, {
              duration: 5000
            });
          }
        });
      } else if (failureCount === totalAttempted && totalAttempted > 0) {
        // All operations failed
        toast.error(`❌ Failed to save all data (${failureCount} operations failed)`);
        
        // Show specific errors
        Object.entries(results).forEach(([operation, result]) => {
          if (result.attempted && result.error) {
            toast.error(`${operation.charAt(0).toUpperCase() + operation.slice(1)}: ${result.error}`, {
              duration: 5000
            });
          }
        });
      } else if (totalAttempted === 0) {
        toast.info('No changes to save');
      }

      // Store failed operations for potential retry
      if (failureCount > 0) {
        const failedOps = Object.entries(results)
          .filter(([_, result]) => result.attempted && !result.success)
          .map(([operation, _]) => operation);
        
        console.log('Failed operations that can be retried:', failedOps);
        // You can store this in state if you want to add a retry button
      }

    } catch (error) {
      console.error('Unexpected error in handleSaveAll:', error);
      toast.error('An unexpected error occurred while saving data');
    } finally {
      setSaving(false);
    }
  };

  const handleMarksChange = (subject, field, value) => {
    console.log('handleMarksChange called:', { subject, field, value });
    
    // Allow empty string for editing, convert to number only when needed
    let processedValue;
    if (value === '') {
      processedValue = '';
    } else {
      const numericValue = parseFloat(value);
      processedValue = isNaN(numericValue) ? 0 : numericValue;
    }
    
    console.log('Processed value:', processedValue);
    
    setEditingMarks(prev => {
      const newState = {
        ...prev,
        subjects: {
          ...prev.subjects,
          [subject]: {
            ...prev.subjects?.[subject],
            [field]: processedValue
          }
        }
      };
      console.log('New editing marks state:', newState);
      return newState;
    });
    setHasChanges(true);
  };

  const handleAttendanceChange = (subject, field, value) => {
    console.log('handleAttendanceChange called:', { subject, field, value });
    
    // Allow empty string for editing, convert to number only when needed
    let processedValue;
    if (value === '') {
      processedValue = '';
    } else {
      const numericValue = parseInt(value);
      processedValue = isNaN(numericValue) ? 0 : numericValue;
    }
    
    console.log('Processed attendance value:', processedValue);
    
    setEditingAttendance(prev => {
      const newState = {
        ...prev,
        subjects: {
          ...prev.subjects,
          [subject]: {
            ...prev.subjects?.[subject],
            [field]: processedValue
          }
        }
      };
      console.log('New editing attendance state:', newState);
      return newState;
    });
    setHasChanges(true);
  };

  const handleDebarmentChange = (subject, field, value) => {
    console.log('handleDebarmentChange called:', { subject, field, value });
    
    setEditingDebarment(prev => {
      const newState = {
        ...prev,
        subjects: {
          ...prev.subjects,
          [subject]: {
            ...prev.subjects?.[subject],
            [field]: value
          }
        }
      };
      console.log('New editing debarment state:', newState);
      return newState;
    });
    setHasChanges(true);
  };

  const addSubject = (type) => {
    const subjectName = prompt('Enter subject name:');
    if (subjectName) {
      if (type === 'marks') {
        setEditingMarks(prev => ({
          ...prev,
          subjects: {
            ...prev.subjects,
            [subjectName]: {
              obtainedMarks: 0,
              totalMarks: 100
            }
          }
        }));
      } else if (type === 'attendance') {
        setEditingAttendance(prev => ({
          ...prev,
          subjects: {
            ...prev.subjects,
            [subjectName]: {
              attended: 0,
              total: 0,
              percentage: 0
            }
          }
        }));
      } else if (type === 'debarment') {
        setEditingDebarment(prev => ({
          ...prev,
          subjects: {
            ...prev.subjects,
            [subjectName]: {
              isDebarred: false,
              eligibleForExams: true,
              reason: ''
            }
          }
        }));
      }
      setHasChanges(true);
    }
  };

  const removeSubject = (type, subjectName) => {
    if (confirm(`Are you sure you want to remove ${subjectName}?`)) {
      if (type === 'marks') {
        setEditingMarks(prev => {
          const newSubjects = { ...prev.subjects };
          delete newSubjects[subjectName];
          return { ...prev, subjects: newSubjects };
        });
      } else if (type === 'attendance') {
        setEditingAttendance(prev => {
          const newSubjects = { ...prev.subjects };
          delete newSubjects[subjectName];
          return { ...prev, subjects: newSubjects };
        });
      } else if (type === 'debarment') {
        setEditingDebarment(prev => {
          const newSubjects = { ...prev.subjects };
          delete newSubjects[subjectName];
          return { ...prev, subjects: newSubjects };
        });
      }
      setHasChanges(true);
    }
  };

  const calculatePercentage = (obtainedMarks, totalMarks) => {
    if (totalMarks === 0) return 0;
    return Math.round((obtainedMarks / totalMarks) * 100);
  };

  const calculateAttendancePercentage = (attended, total) => {
    if (total === 0) return 0;
    return Math.round((attended / total) * 100);
  };

  if (localLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading academic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{student?.name}</h1>
                  <p className="text-sm text-gray-500">
                    {student?.academicYear}
                    {student?.academicYear === 1 ? 'st' : student?.academicYear === 2 ? 'nd' : student?.academicYear === 3 ? 'rd' : 'th'} Year • {student?.department}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <span className="text-sm text-orange-600 font-medium">Unsaved changes</span>
              )}
              <button
                onClick={loadAcademicData}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving || !hasChanges}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-pulse' : ''}`} />
                {saving ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto scrollbar-none flex-nowrap" aria-label="Tabs">
            {[
              { id: 'marks', title: 'Marks Management', icon: TrendingUp },
              { id: 'attendance', title: 'Attendance', icon: UserCheck },
              { id: 'debarment', title: 'Debarment', icon: AlertTriangle }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Marks Tab */}
        {activeTab === 'marks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Marks Management</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => addSubject('marks')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </button>
                <button
                  onClick={handleSaveMarks}
                  disabled={saving || !hasChanges}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  {Object.entries(editingMarks.subjects || {}).map(([subject, marks]) => (
                    <div key={subject} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{subject}</h3>
                        <button
                          onClick={() => removeSubject('marks', subject)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Obtained Marks
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={marks.obtainedMarks === '' ? '' : (marks.obtainedMarks || 0)}
                            onChange={(e) => {
                              console.log('Obtained marks input changing:', subject, e.target.value);
                              handleMarksChange(subject, 'obtainedMarks', e.target.value);
                            }}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter obtained marks"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Marks
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={marks.totalMarks === '' ? '' : (marks.totalMarks || 100)}
                            onChange={(e) => {
                              console.log('Total marks input changing:', subject, e.target.value);
                              handleMarksChange(subject, 'totalMarks', e.target.value);
                            }}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter total marks"
                          />
                        </div>
                      </div>
                      
                      {/* Percentage Display */}
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Percentage:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {(() => {
                              const obtained = parseFloat(marks.obtainedMarks) || 0;
                              const total = parseFloat(marks.totalMarks) || 100;
                              return total > 0 ? Math.round((obtained / total) * 100) : 0;
                            })()}%
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ 
                                width: `${(() => {
                                  const obtained = parseFloat(marks.obtainedMarks) || 0;
                                  const total = parseFloat(marks.totalMarks) || 100;
                                  return total > 0 ? Math.min((obtained / total) * 100, 100) : 0;
                                })()}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(editingMarks.subjects || {}).length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects added</h3>
                      <p className="text-gray-500 mb-4">Add subjects to start managing marks</p>
                      <button
                        onClick={() => addSubject('marks')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Subject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Attendance Management</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => addSubject('attendance')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </button>
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving || !hasChanges}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  {Object.entries(editingAttendance.subjects || {}).map(([subject, attendance]) => (
                    <div key={subject} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{subject}</h3>
                        <button
                          onClick={() => removeSubject('attendance', subject)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Classes Attended
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={attendance.attended === '' ? '' : (attendance.attended || 0)}
                            onChange={(e) => {
                              console.log('Attended classes changing:', subject, e.target.value);
                              handleAttendanceChange(subject, 'attended', e.target.value);
                            }}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter attended classes"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Classes
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={attendance.total === '' ? '' : (attendance.total || 0)}
                            onChange={(e) => {
                              console.log('Total classes changing:', subject, e.target.value);
                              handleAttendanceChange(subject, 'total', e.target.value);
                            }}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter total classes"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Percentage
                          </label>
                          <div className={`block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                            calculateAttendancePercentage(attendance.attended, attendance.total) >= 75 
                              ? 'bg-green-50 text-green-800' 
                              : 'bg-red-50 text-red-800'
                          }`}>
                            {calculateAttendancePercentage(attendance.attended, attendance.total)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(editingAttendance.subjects || {}).length === 0 && (
                    <div className="text-center py-12">
                      <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects added</h3>
                      <p className="text-gray-500 mb-4">Add subjects to start managing attendance</p>
                      <button
                        onClick={() => addSubject('attendance')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Subject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debarment Tab */}
        {activeTab === 'debarment' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Subject-wise Debarment Status</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => addSubject('debarment')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </button>
                <button
                  onClick={handleSaveDebarment}
                  disabled={saving || !hasChanges}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-6">
                  {Object.entries(editingDebarment.subjects || {}).map(([subject, debarment]) => (
                    <div key={subject} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{subject}</h3>
                        <button
                          onClick={() => removeSubject('debarment', subject)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Debarment Status
                          </label>
                          <select
                            value={debarment.isDebarred ? 'true' : 'false'}
                            onChange={(e) => handleDebarmentChange(subject, 'isDebarred', e.target.value === 'true')}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="false">Not Debarred</option>
                            <option value="true">Debarred</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Exam Eligibility
                          </label>
                          <select
                            value={debarment.eligibleForExams ? 'true' : 'false'}
                            onChange={(e) => handleDebarmentChange(subject, 'eligibleForExams', e.target.value === 'true')}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="true">Eligible</option>
                            <option value="false">Not Eligible</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason/Notes
                        </label>
                        <textarea
                          rows={3}
                          value={debarment.reason || ''}
                          onChange={(e) => handleDebarmentChange(subject, 'reason', e.target.value)}
                          placeholder="Enter reason for debarment or any additional notes..."
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      {debarment.isDebarred && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                          <div className="flex">
                            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                            <div className="ml-2">
                              <h4 className="text-sm font-medium text-red-800">
                                Student is debarred from {subject}
                              </h4>
                              <p className="text-sm text-red-700 mt-1">
                                Cannot appear for {subject} examinations until debarment is lifted.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {Object.keys(editingDebarment.subjects || {}).length === 0 && (
                    <div className="text-center py-12">
                      <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects added</h3>
                      <p className="text-gray-500 mb-4">Add subjects to manage debarment status</p>
                      <button
                        onClick={() => addSubject('debarment')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Subject
                      </button>
                    </div>
                  )}
                  
                  {/* Overall Summary */}
                  {Object.keys(editingDebarment.subjects || {}).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Overall Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            {Object.values(editingDebarment.subjects || {}).filter(s => !s.isDebarred).length}
                          </div>
                          <div className="text-blue-700">Eligible Subjects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600">
                            {Object.values(editingDebarment.subjects || {}).filter(s => s.isDebarred).length}
                          </div>
                          <div className="text-blue-700">Debarred Subjects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {Object.keys(editingDebarment.subjects || {}).length}
                          </div>
                          <div className="text-blue-700">Total Subjects</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicDataManager;