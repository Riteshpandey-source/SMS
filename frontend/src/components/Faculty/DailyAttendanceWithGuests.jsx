import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  Save, 
  Send,
  Plus,
  Edit3,
  Eye,
  Trash2,
  UserPlus,
  X,
  MapPin,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import dailyAttendanceService from '../../services/dailyAttendanceService';
import { useAuth } from '../../contexts/AuthContext';

const DailyAttendanceWithGuests = () => {
  const { user } = useAuth();
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Guest student form
  const [guestData, setGuestData] = useState({
    studentName: '',
    studentEmail: '',
    rollNumber: '',
    isPresent: true
  });

  // Form data for creating new session
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    subjectId: '',
    subjectCode: '',
    subjectName: '',
    department: user?.department || '',
    academicYear: '',
    classStartTime: '',
    classEndTime: '',
    classType: 'lecture',
    location: ''
  });

  // Load attendance sessions
  const loadAttendanceSessions = async () => {
    setLoading(true);
    try {
      const response = await dailyAttendanceService.getFacultySessions({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      setAttendanceSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to load attendance sessions:', error);
      toast.error('Failed to load attendance sessions');
      setAttendanceSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceSessions();
  }, []);

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle guest form changes
  const handleGuestChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGuestData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Create new attendance session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Generate unique subject ID
      const subjectId = `${formData.subjectCode}-year${formData.academicYear}-${Date.now()}`;
      
      const sessionData = {
        ...formData,
        subjectId,
        department: user.department,
        subjectCode: formData.subjectCode.toUpperCase()
      };

      const response = await dailyAttendanceService.createSession(sessionData);
      toast.success('Attendance session created successfully!');
      setShowCreateForm(false);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        subjectId: '',
        subjectCode: '',
        subjectName: '',
        department: user?.department || '',
        academicYear: '',
        classStartTime: '',
        classEndTime: '',
        classType: 'lecture',
        location: ''
      });
      
      loadAttendanceSessions();
    } catch (error) {
      console.error('Failed to create attendance session:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to create attendance session');
    } finally {
      setLoading(false);
    }
  };

  // View session details
  const handleViewSession = async (sessionId) => {
    try {
      const response = await dailyAttendanceService.getSession(sessionId);
      setSelectedSession(response.data.attendanceSession);
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Failed to load session details');
    }
  };

  // Add guest student to session
  const handleAddGuest = async (e) => {
    e.preventDefault();
    
    if (!selectedSession) {
      toast.error('No session selected');
      return;
    }

    setLoading(true);
    try {
      await dailyAttendanceService.addGuestStudent(selectedSession._id, guestData);
      toast.success(`Guest student ${guestData.studentName} added successfully!`);
      
      // Reset guest form
      setGuestData({
        studentName: '',
        studentEmail: '',
        rollNumber: '',
        isPresent: true
      });
      setShowGuestForm(false);
      
      // Reload session details
      await handleViewSession(selectedSession._id);
    } catch (error) {
      console.error('Failed to add guest student:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to add guest student');
    } finally {
      setLoading(false);
    }
  };

  // Remove student from session
  const handleRemoveStudent = async (studentEmail) => {
    if (!selectedSession) return;
    
    if (!window.confirm(`Remove ${studentEmail} from this session?`)) return;

    try {
      await dailyAttendanceService.removeStudent(selectedSession._id, studentEmail);
      toast.success('Student removed successfully');
      await handleViewSession(selectedSession._id);
    } catch (error) {
      console.error('Failed to remove student:', error);
      toast.error('Failed to remove student');
    }
  };

  // Edit student details
  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setGuestData({
      studentName: student.studentName,
      studentEmail: student.studentEmail,
      rollNumber: student.rollNumber || '',
      isPresent: student.isPresent
    });
    setShowEditForm(true);
  };

  // Update student details
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    
    if (!selectedSession || !editingStudent) return;

    try {
      // Remove old student
      await dailyAttendanceService.removeStudent(selectedSession._id, editingStudent.studentEmail);
      
      // Add updated student
      await dailyAttendanceService.addGuestStudent(selectedSession._id, guestData);
      
      toast.success('Student updated successfully!');
      
      // Reset form
      setGuestData({
        studentName: '',
        studentEmail: '',
        rollNumber: '',
        isPresent: true
      });
      setShowEditForm(false);
      setEditingStudent(null);
      
      // Reload session
      await handleViewSession(selectedSession._id);
    } catch (error) {
      console.error('Failed to update student:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update student');
    }
  };

  // Toggle student attendance
  const handleToggleAttendance = async (studentId, currentStatus) => {
    if (!selectedSession) return;

    console.log('Toggle attendance:', { studentId, currentStatus, newStatus: !currentStatus });

    try {
      const response = await dailyAttendanceService.updateStudentAttendance(selectedSession._id, {
        studentId,
        isPresent: !currentStatus,
        remarks: ''
      });
      console.log('Update response:', response);
      toast.success(`Marked as ${!currentStatus ? 'Present' : 'Absent'}`);
      
      // Reload session to get updated data
      await handleViewSession(selectedSession._id);
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update attendance');
    }
  };

  // Submit session
  const handleSubmitSession = async () => {
    if (!selectedSession) return;

    try {
      await dailyAttendanceService.submitSession(selectedSession._id);
      toast.success('Session submitted successfully!');
      setSelectedSession(null);
      loadAttendanceSessions();
    } catch (error) {
      console.error('Failed to submit session:', error);
      toast.error('Failed to submit session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Daily Attendance Management
          </h1>
          <p className="text-gray-600 mt-1">Create sessions, add students, and mark attendance</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      {/* Sessions List */}
      {!selectedSession && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-900">Recent Sessions</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading sessions...</p>
            </div>
          ) : attendanceSessions.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No sessions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {attendanceSessions.map((session) => (
                <div key={session._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-900">
                          {session.subjectCode} - {session.subjectName}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          session.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          session.status === 'submitted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.classStartTime} - {session.classEndTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {session.presentCount || 0}/{session.totalStudents || 0} Present
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location || 'No location'}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleViewSession(session._id)}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session Details View */}
      {selectedSession && (
        <div className="space-y-4">
          {/* Session Header */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedSession.subjectCode} - {selectedSession.subjectName}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedSession.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedSession.classStartTime} - {selectedSession.classEndTime}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedSession.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedSession.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowGuestForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                disabled={selectedSession.status !== 'draft'}
              >
                <UserPlus className="h-4 w-4" />
                Add Guest Student
              </button>
              <button
                onClick={handleSubmitSession}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                disabled={selectedSession.status !== 'draft'}
              >
                <Send className="h-4 w-4" />
                Submit Session
              </button>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-900">
                Students ({selectedSession.studentAttendance?.length || 0})
              </h3>
            </div>

            <div className="divide-y divide-gray-200">
              {selectedSession.studentAttendance?.map((student, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{student.studentName}</span>
                        {student.isGuest && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
                            🎫 Guest
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Roll No: {student.rollNumber || student.studentId?.rollNumber || '—'}
                        {student.isGuest && ' (email kept private)'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAttendance(
                          student.studentId || student._id || student.studentEmail, 
                          student.isPresent
                        )}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          student.isPresent
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                        disabled={selectedSession.status !== 'draft'}
                      >
                        {student.isPresent ? (
                          <><CheckCircle className="h-4 w-4 inline mr-1" />Present</>
                        ) : (
                          <><XCircle className="h-4 w-4 inline mr-1" />Absent</>
                        )}
                      </button>

                      {student.isGuest && selectedSession.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit Student"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveStudent(student.studentEmail)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove Guest"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Attendance Session</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                  <select
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    name="subjectCode"
                    value={formData.subjectCode}
                    onChange={handleFormChange}
                    placeholder="e.g., IT301"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                  <input
                    type="text"
                    name="subjectName"
                    value={formData.subjectName}
                    onChange={handleFormChange}
                    placeholder="e.g., Advanced Programming"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    name="classStartTime"
                    value={formData.classStartTime}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    name="classEndTime"
                    value={formData.classEndTime}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Type</label>
                  <select
                    name="classType"
                    value={formData.classType}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="practical">Practical</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="seminar">Seminar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="e.g., Room 401"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Guest Student Modal */}
      {showGuestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Guest Student</h3>
              <button
                onClick={() => setShowGuestForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  name="studentName"
                  value={guestData.studentName}
                  onChange={handleGuestChange}
                  placeholder="e.g., Rahul Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Email *</label>
                <input
                  type="email"
                  name="studentEmail"
                  value={guestData.studentEmail}
                  onChange={handleGuestChange}
                  placeholder="e.g., rahul.guest@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number (Optional)</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={guestData.rollNumber}
                  onChange={handleGuestChange}
                  placeholder="e.g., GUEST001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isPresent"
                  checked={guestData.isPresent}
                  onChange={handleGuestChange}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Mark as Present
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Guest Student'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuestForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditForm && editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Student</h3>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingStudent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  name="studentName"
                  value={guestData.studentName}
                  onChange={handleGuestChange}
                  placeholder="e.g., Rahul Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Email *</label>
                <input
                  type="email"
                  name="studentEmail"
                  value={guestData.studentEmail}
                  onChange={handleGuestChange}
                  placeholder="e.g., rahul.guest@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number (Optional)</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={guestData.rollNumber}
                  onChange={handleGuestChange}
                  placeholder="e.g., GUEST001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isPresent"
                  checked={guestData.isPresent}
                  onChange={handleGuestChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Mark as Present
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Student'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyAttendanceWithGuests;
