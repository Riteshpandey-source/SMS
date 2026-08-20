import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  CheckCircle,
  BookOpen,
  Users,
  Calendar,
  Tag
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notesService } from '../../services/notesService';
import toast from 'react-hot-toast';

const UploadNotes = ({ isOpen, onClose, onUploadSuccess }) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Clear localStorage notes on component mount to avoid showing mock data
  React.useEffect(() => {
    // Clear any old mock notes from localStorage when faculty opens upload modal
    // This ensures only real API-uploaded notes are shown
    if (isOpen && user?.role === 'faculty') {
      localStorage.removeItem('uploadedNotes');
    }
  }, [isOpen, user?.role]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      subject: '',
      academicYear: [],
      tags: '',
      isPublic: true,
      department: user?.department || ''
    }
  });

  // Ensure department is set when user changes
  React.useEffect(() => {
    if (user?.department) {
      setValue('department', user.department);
    }
  }, [user?.department, setValue]);

  // Subjects for different departments
  const subjectsByDepartment = {
    CS: [
      'Data Structures', 'Algorithms', 'Database Management', 'Computer Networks',
      'Operating Systems', 'Software Engineering', 'Web Development', 'Machine Learning',
      'Artificial Intelligence', 'Computer Graphics', 'Cybersecurity', 'Mobile Development'
    ],
    ECE: [
      'Digital Electronics', 'Analog Electronics', 'Signal Processing', 'Communication Systems',
      'Microprocessors', 'VLSI Design', 'Control Systems', 'Electromagnetic Theory',
      'Power Electronics', 'Embedded Systems'
    ],
    ME: [
      'Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing Processes',
      'Heat Transfer', 'Strength of Materials', 'Dynamics', 'CAD/CAM',
      'Automobile Engineering', 'Industrial Engineering'
    ],
    EE: [
      'Circuit Analysis', 'Power Systems', 'Electrical Machines', 'Control Systems',
      'Power Electronics', 'Digital Signal Processing', 'Renewable Energy',
      'High Voltage Engineering', 'Electrical Drives'
    ],
    IT: [
      'Programming Fundamentals', 'Data Structures', 'Database Systems', 'Computer Networks',
      'Web Technologies', 'Software Engineering', 'System Administration', 'Network Security',
      'Cloud Computing', 'Mobile App Development', 'DevOps', 'IT Project Management'
    ],
    CSAI: [
      'Machine Learning', 'Deep Learning', 'Natural Language Processing', 'Computer Vision',
      'Neural Networks', 'Data Mining', 'Pattern Recognition', 'Robotics',
      'Expert Systems', 'AI Ethics', 'Reinforcement Learning', 'Cognitive Computing'
    ],
    AIDS: [
      'Data Science Fundamentals', 'Statistical Analysis', 'Data Mining', 'Big Data Analytics',
      'Machine Learning', 'Deep Learning', 'Data Visualization', 'Business Intelligence',
      'Predictive Analytics', 'Data Warehousing', 'Python for Data Science', 'R Programming'
    ],
    CIVIL: [
      'Structural Engineering', 'Geotechnical Engineering', 'Transportation Engineering',
      'Environmental Engineering', 'Hydraulics', 'Construction Management',
      'Surveying', 'Concrete Technology', 'Steel Structures', 'Urban Planning'
    ]
  };

  const subjects = subjectsByDepartment[user?.department] || [];

  const academicYears = [
    { value: 1, label: '1st Year' },
    { value: 2, label: '2nd Year' },
    { value: 3, label: '3rd Year' },
    { value: 4, label: '4th Year' }
  ];

  // Handle file selection
  const handleFileSelect = (file) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid file (PDF, DOC, DOCX, PPT, PPTX, TXT)');
      return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size should be less than 50MB');
      return;
    }

    setSelectedFile(file);
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      // Prepare note data for API
      const noteData = {
        title: data.title,
        description: data.description,
        subject: data.subject,
        department: data.department,
        academicYear: data.academicYear,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        category: 'lecture'
      };

      console.log('Uploading note with data:', noteData);
      console.log('Selected file:', selectedFile);

      // Call actual API to upload note
      const response = await notesService.uploadNote(noteData, selectedFile);
      
      console.log('Note uploaded successfully:', response);

      toast.success('Notes uploaded successfully!');
      reset();
      setSelectedFile(null);
      
      // Call success callback to refresh notes list
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      console.error('Error response:', error.response?.data);
      
      // Show specific validation error if available
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to upload notes';
      
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-600" />
            Upload Study Notes
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* File Upload Area */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Upload File
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : selectedFile 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop your file here, or{' '}
                      <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                          onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-600">
                      Supports: PDF, DOC, DOCX, PPT, PPTX, TXT (Max 50MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-2" />
                Title *
              </label>
              <input
                type="text"
                {...register('title', {
                  required: 'Title is required',
                  minLength: { value: 5, message: 'Title must be at least 5 characters' },
                  maxLength: { value: 100, message: 'Title cannot exceed 100 characters' }
                })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Data Structures and Algorithms - Complete Notes"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                {...register('subject', { required: 'Subject is required' })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.subject ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.subject.message}
                </p>
              )}
            </div>

            {/* Department (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={user?.department || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Academic Years */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                Target Academic Years *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {academicYears.map((year) => (
                  <label key={year.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={year.value}
                      {...register('academicYear', { 
                        required: 'Select at least one academic year' 
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{year.label}</span>
                  </label>
                ))}
              </div>
              {errors.academicYear && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.academicYear.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Description must be at least 10 characters long' },
                  maxLength: { value: 500, message: 'Description cannot exceed 500 characters' }
                })}
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Brief description of the notes content, topics covered, etc."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Tags
              </label>
              <input
                type="text"
                {...register('tags')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., algorithms, sorting, searching"
              />
              <p className="mt-1 text-xs text-gray-500">Separate tags with commas</p>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value={true}
                    {...register('isPublic')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Public (All students can access)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value={false}
                    {...register('isPublic')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Department only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-6 py-2 bg-[#0B1220] text-white rounded-lg hover:bg-[#1a253a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{uploading ? 'Uploading...' : 'Upload Notes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadNotes;