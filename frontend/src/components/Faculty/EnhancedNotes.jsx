import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Upload, 
  Search, 
  BookOpen, 
  GraduationCap, 
  AlertCircle, 
  Filter, 
  Users, 
  Eye, 
  EyeOff,
  BarChart3,
  FileText,
  TrendingUp
} from 'lucide-react';
import NotesDataGrid from './NotesDataGrid';
import UploadNotes from './UploadNotes';
import NoteModal from './NoteModal';
import { useAuth } from '../../contexts/AuthContext';
import { useYear } from '../../contexts/YearContext';
import { useAssignment } from '../../contexts/AssignmentContext';
import { notesService } from '../../services/notesService';
import toast from 'react-hot-toast';

const EnhancedNotes = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { 
    currentYearFilter, 
    getYearFilterForAPI, 
    accessibleYears,
    hasYearAccess,
    isStudent,
    isFaculty,
    isAdmin
  } = useYear();
  const {
    assignedFaculty,
    assignedStudents,
    hasAssignedFaculty,
    hasAssignedStudents,
    loading: assignmentLoading,
    error: assignmentError
  } = useAssignment();
  
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  
  // View states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Fetch notes
  const fetchNotes = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      
      const params = {
        page,
        limit: pagination.limit
      };

      // Add year filter from Year Context
      const yearFilterValue = getYearFilterForAPI();
      if (yearFilterValue) {
        params.academicYear = yearFilterValue;
      }
      
      // Faculty-specific filtering
      if (isFaculty) {
        params.uploadedBy = user._id; // Only show faculty's own notes
      }
      
      // Admin can see all notes
      if (isAdmin) {
        // No additional filtering needed
      }

      const data = await notesService.getNotes(params);
      
      // Get uploaded notes from localStorage for faculty
      const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
      
      // Combine API notes with uploaded notes
      const allNotes = [...uploadedNotes, ...(data.notes || [])];
      
      setNotes(allNotes);
      setPagination({
        ...data.pagination,
        total: (data.pagination?.total || 0) + uploadedNotes.length
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      
      // Get uploaded notes from localStorage as fallback
      const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
      
      setNotes(uploadedNotes);
      setPagination({
        page: 1,
        limit: 20,
        total: uploadedNotes.length,
        pages: Math.ceil(uploadedNotes.length / 20)
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [getYearFilterForAPI, isFaculty, isAdmin, user, pagination.limit]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await notesService.getNotesStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      
      // Use fallback mock stats
      const mockStats = {
        overall: {
          totalNotes: notes.length,
          totalDownloads: notes.reduce((sum, note) => sum + (note.downloads || 0), 0),
          totalViews: notes.reduce((sum, note) => sum + (note.views || 0), 0),
          subjectsCount: new Set(notes.map(note => note.subject)).size
        },
        personal: {
          uploadedNotes: notes.filter(note => note.uploadedBy?._id === user?._id || note.uploadedBy?.name === user?.name).length,
          totalDownloads: notes.reduce((sum, note) => sum + (note.downloads || 0), 0)
        },
        byDepartment: {
          [user?.department || 'CS']: notes.filter(note => note.department === user?.department).length
        },
        byCategory: {
          lecture: notes.filter(note => note.category === 'lecture').length,
          assignment: notes.filter(note => note.category === 'assignment').length,
          lab: notes.filter(note => note.category === 'lab').length,
          project: notes.filter(note => note.category === 'project').length,
          exam: notes.filter(note => note.category === 'exam').length,
          reference: notes.filter(note => note.category === 'reference').length,
          other: notes.filter(note => note.category === 'other').length
        }
      };
      
      setStats(mockStats);
    }
  }, [notes, user]);

  // Initial load
  useEffect(() => {
    if (user && isAuthenticated && !isLoading) {
      fetchNotes();
    }
  }, [user, isAuthenticated, isLoading, fetchNotes]);

  // Update stats when notes change
  useEffect(() => {
    if (notes.length > 0) {
      fetchStats();
    }
  }, [notes, fetchStats]);

  // Handle upload success
  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    fetchNotes(); // Refresh notes list
    toast.success('Note uploaded successfully!');
  };

  // Handle note edit
  const handleEditNote = (note) => {
    setSelectedNote(note);
    setShowEditModal(true);
  };

  // Handle note view
  const handleViewNote = (note) => {
    setSelectedNote(note);
    setShowViewModal(true);
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      // Remove from localStorage if it exists there
      const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
      const filteredNotes = uploadedNotes.filter(n => n._id !== noteId);
      localStorage.setItem('uploadedNotes', JSON.stringify(filteredNotes));
      
      await notesService.deleteNote(noteId);
      
      // Refresh the notes list
      fetchNotes();
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete note');
    }
  };

  // Handle note update
  const handleUpdateNote = async (updatedNote) => {
    try {
      // Update in localStorage for demo
      const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
      const noteIndex = uploadedNotes.findIndex(n => n._id === updatedNote._id);
      if (noteIndex !== -1) {
        uploadedNotes[noteIndex] = { ...uploadedNotes[noteIndex], ...updatedNote };
        localStorage.setItem('uploadedNotes', JSON.stringify(uploadedNotes));
      }

      // In real app: await notesService.updateNote(updatedNote._id, updatedNote);
      
      setShowEditModal(false);
      setSelectedNote(null);
      fetchNotes();
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update note');
    }
  };

  // Get user context info
  const getUserContextInfo = () => {
    if (isFaculty) {
      const yearText = accessibleYears.length === 1 
        ? `${accessibleYears[0]}${accessibleYears[0] === 1 ? 'st' : accessibleYears[0] === 2 ? 'nd' : accessibleYears[0] === 3 ? 'rd' : 'th'} Year`
        : `${accessibleYears.length} Years`;
      return `${user.department} Faculty (${yearText})`;
    } else if (isAdmin) {
      return 'All Departments & Years';
    }
    return 'Faculty Dashboard';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please login to manage notes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Notes Management</h1>
              <p className="text-blue-700 mt-1">
                {stats?.personal?.uploadedNotes || 0} notes uploaded • {getUserContextInfo()}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-blue-600">
                <span>• {stats?.overall?.totalDownloads || 0} total downloads</span>
                <span>• {stats?.overall?.totalViews || 0} total views</span>
                <span>• {accessibleYears.length} year{accessibleYears.length !== 1 ? 's' : ''} accessible</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg border border-gray-300">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Grid
              </button>
            </div>

            {/* Analytics Toggle */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                showAnalytics 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </button>

            {/* Upload Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Notes
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Notes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.personal.uploadedNotes}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Downloads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overall.totalDownloads}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overall.totalViews}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Subjects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overall.subjectsCount || 0}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <BookOpen className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Data Grid */}
      <NotesDataGrid
        notes={notes}
        loading={loading}
        onEdit={handleEditNote}
        onDelete={handleDeleteNote}
        onView={handleViewNote}
        onRefresh={fetchNotes}
        showActions={true}
        showFilters={true}
      />

      {/* Upload Notes Modal */}
      <UploadNotes 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Edit Note Modal */}
      {showEditModal && selectedNote && (
        <NoteModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedNote(null);
          }}
          note={selectedNote}
          onSave={handleUpdateNote}
          mode="edit"
        />
      )}

      {/* View Note Modal */}
      {showViewModal && selectedNote && (
        <NoteModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedNote(null);
          }}
          note={selectedNote}
          mode="view"
        />
      )}
    </div>
  );
};

export default EnhancedNotes;
