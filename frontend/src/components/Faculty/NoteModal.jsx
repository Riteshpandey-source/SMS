import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Edit, FileText, Calendar, User, Building, GraduationCap, Tag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDepartmentName } from '../../constants/departments';

const NoteModal = ({ isOpen, onClose, note, onSave, mode = 'view' }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    category: 'lecture',
    academicYear: [],
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when note changes
  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title || '',
        description: note.description || '',
        subject: note.subject || '',
        category: note.category || 'lecture',
        academicYear: note.academicYear || [],
        tags: note.tags ? note.tags.join(', ') : ''
      });
    }
  }, [note]);

  // Categories
  const categories = [
    { value: 'lecture', label: 'Lecture Notes' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'lab', label: 'Lab Manual' },
    { value: 'project', label: 'Project' },
    { value: 'exam', label: 'Exam Material' },
    { value: 'reference', label: 'Reference' },
    { value: 'other', label: 'Other' }
  ];

  // Academic years
  const academicYears = [
    { value: 1, label: '1st Year' },
    { value: 2, label: '2nd Year' },
    { value: 3, label: '3rd Year' },
    { value: 4, label: '4th Year' }
  ];

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle academic year selection
  const handleAcademicYearChange = (year, checked) => {
    setFormData(prev => ({
      ...prev,
      academicYear: checked 
        ? [...prev.academicYear, year]
        : prev.academicYear.filter(y => y !== year)
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (formData.academicYear.length === 0) {
      newErrors.academicYear = 'At least one academic year must be selected';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const updatedNote = {
        ...note,
        title: formData.title.trim(),
        description: formData.description.trim(),
        subject: formData.subject.trim(),
        category: formData.category,
        academicYear: formData.academicYear,
        academicYearDisplay: formData.academicYear.map(year => 
          `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'}`
        ).join(', ') + ' Year',
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        updatedAt: new Date().toISOString()
      };

      if (onSave) {
        await onSave(updatedNote);
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Department name is now imported from constants

  // Get category display name
  const getCategoryDisplay = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              {mode === 'edit' ? (
                <Edit className="w-5 h-5 text-blue-600" />
              ) : (
                <Eye className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'edit' ? 'Edit Note' : 'View Note'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'edit' ? 'Update note information' : 'Note details and metadata'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {mode === 'view' ? (
            // View Mode
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{note?.title}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{note?.subject}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{note?.description}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full">
                      {getCategoryDisplay(note?.category)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full">
                      <GraduationCap className="w-3 h-3 mr-1" />
                      {note?.academicYearDisplay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                      <Building className="w-3 h-3 mr-1" />
                      {getDepartmentName(note?.department)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">File Size</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{note?.fileSizeDisplay}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {note?.tags && note.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{note?.downloads || 0}</p>
                  <p className="text-sm text-gray-600">Downloads</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{note?.views || 0}</p>
                  <p className="text-sm text-gray-600">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{note?.rating?.average?.toFixed(1) || '0.0'}</p>
                  <p className="text-sm text-gray-600">Rating</p>
                </div>
              </div>

              {/* Upload Info */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Uploaded by {note?.uploadedBy?.name}
                      </p>
                      <p className="text-sm text-blue-700">
                        {new Date(note?.createdAt).toLocaleDateString()} at {new Date(note?.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {note?.uploaderRole}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter note title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.subject ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter subject"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter tags separated by commas"
                  />
                </div>
              </div>

              {/* Academic Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {academicYears.map(year => (
                    <label key={year.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.academicYear.includes(year.value)}
                        onChange={(e) => handleAcademicYearChange(year.value, e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{year.label}</span>
                    </label>
                  ))}
                </div>
                {errors.academicYear && (
                  <p className="mt-1 text-sm text-red-600">{errors.academicYear}</p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            {mode === 'edit' ? 'Cancel' : 'Close'}
          </button>
          {mode === 'edit' && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteModal;