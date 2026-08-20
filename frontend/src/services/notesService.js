import api from './api';

// Debug: Log API base URL
console.log('NotesService: API base URL:', import.meta.env.VITE_API_BASE_URL);

export const notesService = {
  // Get all notes with filtering
  getNotes: async (params = {}) => {
    try {
      console.log('NotesService: Making API call with params:', params);
      const response = await api.get('/notes', { params });
      console.log('NotesService: API response:', response.data);
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid API response format');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('NotesService: API call failed:', error);
      throw error;
    }
  },

  // Upload new note
  uploadNote: async (noteData, file) => {
    const formData = new FormData();
    
    // Append file
    formData.append('file', file);
    
    // Append note data
    Object.keys(noteData).forEach(key => {
      if (noteData[key] !== undefined && noteData[key] !== null) {
        if (Array.isArray(noteData[key])) {
          // Handle arrays (like academicYear, tags)
          noteData[key].forEach(item => {
            formData.append(key, item);
          });
        } else {
          formData.append(key, noteData[key]);
        }
      }
    });

    const response = await api.post('/notes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Get single note
  getNote: async (noteId) => {
    const response = await api.get(`/notes/${noteId}`);
    return response.data.data;
  },

  // Download note
  downloadNote: async (noteId) => {
    const response = await api.get(`/notes/${noteId}/download`, {
      responseType: 'blob'
    });
    return response;
  },

  // Update note
  updateNote: async (noteId, updates) => {
    const response = await api.put(`/notes/${noteId}`, updates);
    return response.data.data;
  },

  // Delete note
  deleteNote: async (noteId) => {
    const response = await api.delete(`/notes/${noteId}`);
    return response.data;
  },

  // Get user's uploaded notes
  getMyNotes: async (params = {}) => {
    const response = await api.get('/notes/my/uploads', { params });
    return response.data.data;
  },

  // Get notes statistics
  getNotesStats: async () => {
    const response = await api.get('/notes/stats');
    return response.data.data;
  },

  // Debug API to test ECE notes
  getDebugNotes: async () => {
    console.log('NotesService: Calling debug API');
    try {
      const response = await api.get('/notes/debug');
      console.log('NotesService: Debug API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('NotesService: Debug API error:', error);
      throw error;
    }
  },

  // Search notes
  searchNotes: async (searchTerm, filters = {}) => {
    const params = {
      search: searchTerm,
      ...filters
    };
    const response = await api.get('/notes', { params });
    return response.data.data;
  },

  // Get notes by academic context
  getNotesByContext: async (department, academicYear, additionalFilters = {}) => {
    const params = {
      department,
      academicYear,
      ...additionalFilters
    };
    const response = await api.get('/notes', { params });
    return response.data.data;
  },

  // Get notes by subject
  getNotesBySubject: async (subject, filters = {}) => {
    const params = {
      subject,
      ...filters
    };
    const response = await api.get('/notes', { params });
    return response.data.data;
  },

  // Get notes by category
  getNotesByCategory: async (category, filters = {}) => {
    const params = {
      category,
      ...filters
    };
    const response = await api.get('/notes', { params });
    return response.data.data;
  },

  // Get notes by uploader role
  getNotesByRole: async (uploaderRole, filters = {}) => {
    const params = {
      uploaderRole,
      ...filters
    };
    const response = await api.get('/notes', { params });
    return response.data.data;
  },

  // Helper function to trigger file download
  triggerDownload: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Download and save note file
  downloadAndSave: async (noteId, filename) => {
    try {
      console.log('downloadAndSave called with:', { noteId, filename });
      
      if (!noteId) {
        throw new Error('Note ID is required for download');
      }
      
      const response = await notesService.downloadNote(noteId);
      console.log('Download response received:', response.status, response.headers);
      
      if (!response.data) {
        throw new Error('No file data received from server');
      }
      
      notesService.triggerDownload(response.data, filename || 'download.pdf');
      return { success: true };
    } catch (error) {
      console.error('Download failed:', error);
      
      // Provide more specific error messages
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;
        
        if (status === 401) {
          return { success: false, error: 'Authentication required. Please log in again.' };
        } else if (status === 403) {
          return { success: false, error: 'You do not have permission to download this note.' };
        } else if (status === 404) {
          return { success: false, error: 'Note file not found on server.' };
        } else {
          return { success: false, error: `Server error: ${message}` };
        }
      } else if (error.request) {
        return { success: false, error: 'Unable to connect to server. Please check your internet connection.' };
      } else {
        return { success: false, error: error.message || 'An unexpected error occurred during download.' };
      }
    }
  },

  // Get file type icon
  getFileTypeIcon: (mimeType) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('text')) return '📃';
    return '📁';
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get academic year display
  getAcademicYearDisplay: (academicYears) => {
    if (!Array.isArray(academicYears)) {
      academicYears = [academicYears];
    }
    
    if (academicYears.length === 1) {
      const year = academicYears[0];
      return `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`;
    } else {
      return academicYears.map(year => 
        `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'}`
      ).join(', ') + ' Years';
    }
  },

  // Get category display name
  getCategoryDisplay: (category) => {
    const categoryMap = {
      lecture: 'Lecture Notes',
      assignment: 'Assignment',
      lab: 'Lab Manual',
      project: 'Project',
      exam: 'Exam Material',
      reference: 'Reference',
      other: 'Other'
    };
    return categoryMap[category] || category;
  },

  // Get uploader role display
  getUploaderRoleDisplay: (role) => {
    const roleMap = {
      student: 'Student',
      faculty: 'Faculty',
      admin: 'Admin'
    };
    return roleMap[role] || role;
  },

  // Check if user can edit note
  canEditNote: (note, user) => {
    if (!user || !note) return false;
    return note.uploadedBy === user.id || user.role === 'admin';
  },

  // Check if user can delete note
  canDeleteNote: (note, user) => {
    if (!user || !note) return false;
    return note.uploadedBy === user.id || user.role === 'admin';
  },

  // Validate file before upload
  validateFile: (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 50MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, JPEG, PNG' };
    }

    return { valid: true };
  }
};