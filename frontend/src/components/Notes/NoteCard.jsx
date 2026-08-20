import React, { useState } from 'react';
import { Download, FileText, Calendar, User, Tag, GraduationCap, Building, Star, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notesService } from '../../services/notesService';
import toast from 'react-hot-toast';
import { getDepartmentName } from '../../constants/departments';

const NoteCard = ({ note, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    subject: '',
    tags: ''
  });

  // Debug: Log the note data
  console.log('NoteCard rendering with note:', note);

  // Safety check
  if (!note) {
    return (
      <div className="bg-red-100 border border-red-300 rounded-lg p-4">
        <p className="text-red-600">Error: Note data is missing</p>
      </div>
    );
  }

  // Provide fallback values for missing properties
  const safeNote = {
    ...note,
    mimeType: note.mimeType || 'application/pdf',
    fileSizeDisplay: note.fileSizeDisplay || '1.0 MB',
    academicYearDisplay: note.academicYearDisplay || (note.academicYear ? note.academicYear.join(', ') + ' Year' : 'All Years'),
    category: note.category || 'academic',
    uploaderRole: note.uploaderRole || note.uploadedBy?.role || 'faculty',
    tags: note.tags || [],
    downloads: note.downloads || 0,
    views: note.views || 0,
    rating: note.rating || { average: 0, count: 0 }
  };

  // Department name is now imported from constants

  // Handle download
  const handleDownload = async () => {
    try {
      console.log('Download started for note:', note._id, note.originalName);
      setDownloading(true);
      
      // Debug: Check if note has required properties
      if (!note._id) {
        throw new Error('Note ID is missing');
      }
      
      // Check if this is a localStorage note (timestamp-based ID) or database note (MongoDB ObjectId)
      const isLocalStorageNote = /^\d+$/.test(note._id); // Check if ID is only digits (timestamp)
      
      if (isLocalStorageNote) {
        // Handle localStorage notes - these are mock notes, so create a mock download
        console.log('Handling localStorage note download');
        
        // Create a mock PDF content for demo
        const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(${note.title}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;

        // Create blob and trigger download
        const blob = new Blob([mockPdfContent], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = note.originalName || note.title + '.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Download started!');
        
        // Update download count in localStorage
        const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
        const noteIndex = uploadedNotes.findIndex(n => n._id === note._id);
        if (noteIndex !== -1) {
          uploadedNotes[noteIndex].downloads = (uploadedNotes[noteIndex].downloads || 0) + 1;
          localStorage.setItem('uploadedNotes', JSON.stringify(uploadedNotes));
        }
        
        // Refresh note data to update download count
        if (onUpdate) onUpdate();
      } else {
        // Handle database notes - use API
        const result = await notesService.downloadAndSave(note._id, note.originalName || note.title + '.pdf');
        console.log('Download result:', result);
        
        if (result.success !== false) {
          toast.success('Download started!');
          // Refresh note data to update download count
          if (onUpdate) onUpdate();
        } else {
          throw new Error(result.error || 'Download failed');
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Failed to download note: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // Handle edit start
  const handleEditStart = () => {
    setEditData({
      title: safeNote.title || '',
      description: safeNote.description || '',
      subject: safeNote.subject || '',
      tags: safeNote.tags ? safeNote.tags.join(', ') : ''
    });
    setEditing(true);
  };

  // Handle edit save
  const handleEditSave = async () => {
    try {
      const updatedNote = {
        ...safeNote,
        title: editData.title,
        description: editData.description,
        subject: editData.subject,
        tags: editData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      // For demo purposes, update localStorage
      const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
      const noteIndex = uploadedNotes.findIndex(n => n._id === safeNote._id);
      if (noteIndex !== -1) {
        uploadedNotes[noteIndex] = updatedNote;
        localStorage.setItem('uploadedNotes', JSON.stringify(uploadedNotes));
      }

      // In real app, call API: await notesService.updateNote(safeNote._id, updatedNote);
      
      toast.success('Note updated successfully');
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update note');
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditing(false);
    setEditData({ title: '', description: '', subject: '', tags: '' });
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      // Use the onDelete prop to handle deletion in parent component
      if (onDelete) {
        onDelete(safeNote._id);
        toast.success('Note deleted successfully');
      } else {
        // Fallback: remove from localStorage only
        const uploadedNotes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
        const filteredNotes = uploadedNotes.filter(n => n._id !== safeNote._id);
        localStorage.setItem('uploadedNotes', JSON.stringify(filteredNotes));
        
        toast.success('Note deleted successfully');
        if (onUpdate) onUpdate();
      }

      // In real app: await notesService.deleteNote(safeNote._id);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete note');
    }
  };

  // Check if user can edit/delete this note
  const canEdit = () => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'faculty') {
      // Faculty can edit their own notes or notes in their department
      return safeNote.uploadedBy?.name === 'You' || 
             safeNote.uploadedBy?.name === user?.name ||
             safeNote.department === user?.department;
    }
    return false;
  };

  // Check if user can download
  const canDownload = () => {
    console.log('Checking download permission for user:', user);
    const hasPermission = user?.role === 'student' || user?.role === 'faculty' || user?.role === 'admin';
    console.log('Download permission:', hasPermission);
    return hasPermission;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {editing ? (
            // Edit Form
            <div className="space-y-3">
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({...editData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Note title"
              />
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({...editData, description: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Description"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={editData.subject}
                  onChange={(e) => setEditData({...editData, subject: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Subject"
                />
                <input
                  type="text"
                  value={editData.tags}
                  onChange={(e) => setEditData({...editData, tags: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Tags (comma separated)"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleEditSave}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleEditCancel}
                  className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Display Mode
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{safeNote.title}</h3>
                {canEdit() && (
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={handleEditStart}
                      className="p-1 hover:bg-blue-100 rounded transition-colors"
                      title="Edit note"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{safeNote.description}</p>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <div className="text-2xl">
            {notesService.getFileTypeIcon(safeNote.mimeType)}
          </div>
          <span className="text-sm text-gray-500">{safeNote.fileSizeDisplay}</span>
        </div>
      </div>

      {/* Academic Info */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
          <GraduationCap className="w-3 h-3 mr-1" />
          {safeNote.academicYearDisplay}
        </span>
        <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
          <Building className="w-3 h-3 mr-1" />
          {getDepartmentName(safeNote.department)}
        </span>
        <span className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
          {notesService.getCategoryDisplay(safeNote.category)}
        </span>
      </div>

      {/* Tags */}
      {safeNote.tags && safeNote.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {safeNote.tags.map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <User className="w-4 h-4 mr-2 text-gray-400" />
          Uploaded by {note.uploadedBy?.name || 'Unknown'} 
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {notesService.getUploaderRoleDisplay(note.uploaderRole)}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          {new Date(note.createdAt).toLocaleDateString()}
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="font-medium">{note.subject}</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1 text-gray-400" />
              {note.views || 0}
            </div>
            <div className="flex items-center">
              <Download className="w-4 h-4 mr-1 text-gray-400" />
              {note.downloads || 0}
            </div>
            {note.rating?.average > 0 && (
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 text-yellow-400 fill-current" />
                {note.rating.average.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <span className="text-sm font-medium text-gray-900 truncate flex-1 mr-4">
          {note.originalName}
        </span>
        {canDownload() ? (
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {downloading ? 'Downloading...' : 'Download'}
          </button>
        ) : (
          <div className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-medium flex items-center cursor-not-allowed">
            <Download className="w-4 h-4 mr-2" />
            Download Restricted
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteCard;