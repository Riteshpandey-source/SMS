import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  Calendar,
  User,
  Building,
  GraduationCap,
  Star,
  ChevronUp,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notesService } from '../../services/notesService';
import toast from 'react-hot-toast';
import { getDepartmentName } from '../../constants/departments';

const NotesDataGrid = ({ 
  notes = [], 
  loading = false, 
  onEdit, 
  onDelete, 
  onView,
  onRefresh,
  showActions = true,
  showFilters = true 
}) => {
  const { user } = useAuth();
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter and sort notes
  const filteredAndSortedNotes = React.useMemo(() => {
    let filtered = notes.filter(note => {
      const matchesSearch = !searchTerm || 
        note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubject = subjectFilter === 'all' || note.subject === subjectFilter;
      const matchesCategory = categoryFilter === 'all' || note.category === categoryFilter;
      
      return matchesSearch && matchesSubject && matchesCategory;
    });

    // Sort notes
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [notes, searchTerm, subjectFilter, categoryFilter, sortField, sortDirection]);

  // Get unique subjects and categories
  const subjects = ['all', ...Array.from(new Set(notes.map(note => note.subject).filter(Boolean)))];
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'lecture', label: 'Lecture Notes' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'lab', label: 'Lab Manual' },
    { value: 'project', label: 'Project' },
    { value: 'exam', label: 'Exam Material' },
    { value: 'reference', label: 'Reference' },
    { value: 'other', label: 'Other' }
  ];

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle note selection
  const handleNoteSelect = (noteId, selected) => {
    const newSelected = new Set(selectedNotes);
    if (selected) {
      newSelected.add(noteId);
    } else {
      newSelected.delete(noteId);
    }
    setSelectedNotes(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  // Handle select all
  const handleSelectAll = (selected) => {
    if (selected) {
      setSelectedNotes(new Set(filteredAndSortedNotes.map(note => note._id)));
    } else {
      setSelectedNotes(new Set());
    }
    setShowBulkActions(selected && filteredAndSortedNotes.length > 0);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedNotes.size} selected notes?`)) {
      return;
    }

    try {
      for (const noteId of selectedNotes) {
        if (onDelete) {
          await onDelete(noteId);
        }
      }
      setSelectedNotes(new Set());
      setShowBulkActions(false);
      toast.success(`${selectedNotes.size} notes deleted successfully`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete some notes');
    }
  };

  // Handle download
  const handleDownload = async (note) => {
    try {
      await notesService.downloadAndSave(note._id, note.originalName || note.title);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download note');
    }
  };

  // Check if user can edit/delete note
  const canEditNote = (note) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'faculty') {
      return note.uploadedBy?._id === user._id || 
             note.uploadedBy?.name === user.name ||
             note.department === user.department;
    }
    return false;
  };

  // Department name is now imported from constants

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header with Search and Filters */}
      {showFilters && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select 
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>

              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </button>
            <button
              onClick={() => {
                setSelectedNotes(new Set());
                setShowBulkActions(false);
              }}
              className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedNotes.size === filteredAndSortedNotes.length && filteredAndSortedNotes.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-600"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Document Title
                  {sortField === 'title' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('subject')}
              >
                <div className="flex items-center">
                  Subject
                  {sortField === 'subject' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                Uploaded By
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">
                  Date
                  {sortField === 'createdAt' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                File Size
              </th>
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedNotes.map((note) => (
              <tr key={note._id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedNotes.has(note._id)}
                    onChange={(e) => handleNoteSelect(note._id, e.target.checked)}
                    className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-600"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                      <FileText className="h-4.5 w-4.5 text-[#0B1220]" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-slate-900 truncate max-w-xs">
                        {note.title}
                      </div>
                      <div className="text-xs text-slate-400 font-semibold truncate max-w-xs mt-0.5">
                        {note.description || 'No description provided'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                  {note.subject}
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                  <div className="font-bold text-slate-750">
                    {note.uploadedBy?.name || 'Faculty Member'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                    {note.uploadedBy?.role || 'faculty'}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                  {new Date(note.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                  {note.fileSizeDisplay || '1.2 MB'}
                </td>
                {showActions && (
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {onView && (
                        <button
                          onClick={() => onView(note)}
                          className="p-2 border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 rounded-xl transition-all duration-200 shadow-sm"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(note)}
                        className="p-2 border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 rounded-xl transition-all duration-200 shadow-sm"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {canEditNote(note) && onEdit && (
                        <button
                          onClick={() => onEdit(note)}
                          className="p-2 border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 rounded-xl transition-all duration-200 shadow-sm"
                          title="Edit Document"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canEditNote(note) && onDelete && (
                        <button
                          onClick={() => onDelete(note._id)}
                          className="p-2 border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 shadow-sm"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredAndSortedNotes.length === 0 && (
        <div className="p-8 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
          <p className="text-gray-600">
            {searchTerm || subjectFilter !== 'all' || categoryFilter !== 'all'
              ? 'No notes match your search criteria. Try adjusting your filters.'
              : 'No notes have been uploaded yet.'
            }
          </p>
        </div>
      )}

      {/* Footer with Stats */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
        Showing {filteredAndSortedNotes.length} of {notes.length} notes
        {selectedNotes.size > 0 && (
          <span className="ml-4">• {selectedNotes.size} selected</span>
        )}
      </div>
    </div>
  );
};

export default NotesDataGrid;