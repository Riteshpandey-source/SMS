import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Clock, Tag, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { facultyService } from '../../services/facultyService';
import toast from 'react-hot-toast';
import { getAcademicDepartmentOptions } from '../../constants/departments';

const CreateEventModal = ({ isOpen, onClose, onSuccess, event = null }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  // Get user's accessible years or default to all years for admin
  const getUserAccessibleYears = () => {
    if (user?.role === 'admin') {
      return [1, 2, 3, 4];
    } else if (user?.role === 'faculty' && user?.accessibleYears && user.accessibleYears.length > 0) {
      return user.accessibleYears;
    } else {
      // Fallback for faculty without accessible years set
      return [1, 2, 3, 4];
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    category: 'academic',
    targetDepartments: [],
    targetAcademicYears: [],
    maxAttendees: '',
    registrationDeadline: '',
    registrationRequired: true,
    contactEmail: '',
    contactPhone: '',
    tags: '',
    isPublic: true
  });

  // Initialize form data when user is loaded
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        targetDepartments: user.department ? [user.department] : ['ALL'],
        targetAcademicYears: getUserAccessibleYears(),
        contactEmail: user.email || ''
      }));
    }
  }, [user]);

  // Reset form when modal opens/closes or event changes
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Editing existing event
        setFormData({
          title: event.title || '',
          description: event.description || '',
          date: event.date ? new Date(event.date).toISOString().slice(0, 16) : '',
          endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
          location: event.location || '',
          category: event.category || 'academic',
          targetDepartments: event.targetDepartments || ['ALL'],
          targetAcademicYears: event.targetAcademicYears || [1, 2, 3, 4],
          maxAttendees: event.maxAttendees || '',
          registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
          registrationRequired: event.registrationRequired !== false,
          contactEmail: event.contactEmail || '',
          contactPhone: event.contactPhone || '',
          tags: event.tags?.join(', ') || '',
          isPublic: event.isPublic !== false
        });
      } else {
        // Creating new event - reset to defaults
        setFormData({
          title: '',
          description: '',
          date: '',
          endDate: '',
          location: '',
          category: 'academic',
          targetDepartments: user?.department ? [user.department] : ['ALL'],
          targetAcademicYears: getUserAccessibleYears(),
          maxAttendees: '',
          registrationDeadline: '',
          registrationRequired: true,
          contactEmail: '',
          contactPhone: '',
          tags: '',
          isPublic: true
        });
      }
      setErrors({});
    }
  }, [isOpen, event]);

  const [errors, setErrors] = useState({});

  // Check if form is valid for submit button
  const isFormValid = () => {
    return formData.title.trim().length >= 3 &&
           formData.description.trim().length >= 3 &&
           formData.date &&
           formData.location.trim().length > 0 &&
           new Date(formData.date) > new Date();
  };

  const categories = [
    { value: 'academic', label: 'Academic' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'sports', label: 'Sports' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'conference', label: 'Conference' },
    { value: 'competition', label: 'Competition' },
    { value: 'other', label: 'Other' }
  ];

  // Only show departments that the user can target
  const getAvailableDepartments = () => {
    const allDepartments = [
      { value: 'ALL', label: 'All Departments' },
      ...getAcademicDepartmentOptions()
    ];

    if (user?.role === 'admin') {
      return allDepartments; // Admin can target all departments
    } else if (user?.role === 'faculty' && user?.department) {
      // Faculty can only target their own department
      return allDepartments.filter(dept => dept.value === user.department || dept.value === 'ALL');
    } else {
      return allDepartments; // Fallback
    }
  };

  const departments = getAvailableDepartments();

  // Only show academic years that the user has access to
  const getAvailableAcademicYears = () => {
    const allYears = [
      { value: 1, label: '1st Year' },
      { value: 2, label: '2nd Year' },
      { value: 3, label: '3rd Year' },
      { value: 4, label: '4th Year' }
    ];

    if (user?.role === 'admin') {
      return allYears; // Admin can target all years
    } else if (user?.role === 'faculty' && user?.accessibleYears && user.accessibleYears.length > 0) {
      return allYears.filter(year => user.accessibleYears.includes(year.value));
    } else {
      return allYears; // Fallback for faculty without accessible years
    }
  };

  const academicYears = getAvailableAcademicYears();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleMultiSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].includes(value)
        ? prev[name].filter(item => item !== value)
        : [...prev[name], value]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    console.log('Validating form with data:', {
      title: formData.title,
      titleLength: formData.title.length,
      description: formData.description,
      descriptionLength: formData.description.length,
      date: formData.date,
      location: formData.location
    });

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required (minimum 3 characters)';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required (minimum 10 characters)';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (formData.description.trim().length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }

    if (!formData.date) {
      newErrors.date = 'Event date is required';
    } else if (new Date(formData.date) <= new Date()) {
      newErrors.date = 'Event date must be in the future';
    }

    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.date)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Event location is required';
    }

    if (formData.registrationDeadline && new Date(formData.registrationDeadline) > new Date(formData.date)) {
      newErrors.registrationDeadline = 'Registration deadline must be before event date';
    }

    if (formData.maxAttendees && (isNaN(formData.maxAttendees) || parseInt(formData.maxAttendees) < 1)) {
      newErrors.maxAttendees = 'Maximum attendees must be a positive number';
    }

    if (formData.contactPhone && !/^[0-9]{10}$/.test(formData.contactPhone)) {
      newErrors.contactPhone = 'Contact phone must be a valid 10-digit number';
    }

    if (formData.targetDepartments.length === 0) {
      newErrors.targetDepartments = 'At least one department must be selected';
    }

    if (formData.targetAcademicYears.length === 0) {
      newErrors.targetAcademicYears = 'At least one academic year must be selected';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('Validation result:', { isValid, errors: newErrors });
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== NEW CODE LOADED - v2.0 ===');
    console.log('Form submission started');
    console.log('User accessible years:', user?.accessibleYears);
    console.log('Form data:', formData);
    console.log('Target years in form:', formData.targetAcademicYears);
    
    // Quick validation check before detailed validation
    if (!formData.title || formData.title.trim().length < 3) {
      toast.error('Event title must be at least 3 characters long');
      return;
    }
    
    if (!formData.description || formData.description.trim().length < 10) {
      toast.error('Event description must be at least 10 characters long');
      return;
    }
    
    if (!formData.date) {
      toast.error('Event date is required');
      return;
    }
    
    if (!formData.location || formData.location.trim().length === 0) {
      toast.error('Event location is required');
      return;
    }
    
    if (!validateForm()) {
      console.log('Form validation failed');
      toast.error('Please fill all required fields correctly before submitting.');
      return;
    }

    console.log('Form validation passed');
    setLoading(true);

    try {
      const eventData = {
        ...formData,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };
      
      console.log('Event data to be sent:', eventData);

      if (event) {
        const response = await facultyService.updateEvent(event._id, eventData);
        console.log('Update event response:', response);
        toast.success('Event updated successfully!');
      } else {
        const response = await facultyService.createEvent(eventData);
        console.log('Create event response:', response);
        toast.success('Event created successfully!');
      }

      onSuccess();
    } catch (error) {
      console.error('Event operation error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      
      // Extract error message from response
      let errorMessage = `Failed to ${event ? 'update' : 'create'} event`;
      
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        errorMessage = errorData.message || errorMessage;
        
        // Handle validation errors from backend
        if (errorData.details) {
          if (Array.isArray(errorData.details)) {
            const backendErrors = {};
            errorData.details.forEach(detail => {
              backendErrors[detail.field] = detail.message;
            });
            console.log('Backend validation errors:', backendErrors);
            setErrors(backendErrors);
            toast.error('Please fix the validation errors and try again');
            return;
          } else if (typeof errorData.details === 'object') {
            // Handle object-based details (like year access errors)
            if (errorData.details.deniedYears) {
              errorMessage += `. You don't have access to years: ${errorData.details.deniedYears.join(', ')}`;
            } else if (errorData.details.accessibleYears) {
              errorMessage += `. Your accessible years: ${errorData.details.accessibleYears.join(', ')}`;
            }
          } else if (typeof errorData.details === 'string') {
            errorMessage += `: ${errorData.details}`;
          }
        }
      }
      
      console.error('API Error:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        description: '',
        date: '',
        endDate: '',
        location: '',
        category: 'academic',
        targetDepartments: user?.department ? [user.department] : ['ALL'],
        targetAcademicYears: getUserAccessibleYears(),
        maxAttendees: '',
        registrationDeadline: '',
        registrationRequired: true,
        contactEmail: user?.email || '',
        contactPhone: '',
        tags: '',
        isPublic: true
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-orange-600" />
            {event ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Required Fields:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Title:</strong> At least 3 characters (e.g., "Programming Workshop")</li>
                    <li>• <strong>Description:</strong> At least 10 characters (explain what the event is about)</li>
                    <li>• <strong>Date & Time:</strong> Must be in the future</li>
                    <li>• <strong>Location:</strong> Where the event will take place</li>
                  </ul>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(14, 0, 0, 0);
                  
                  setFormData({
                    ...formData,
                    title: 'Advanced Programming Workshop',
                    description: 'This comprehensive workshop will cover advanced programming concepts including data structures, algorithms, object-oriented programming principles, and best practices for software development. Students will gain hands-on experience through practical exercises and real-world examples.',
                    date: tomorrow.toISOString().slice(0, 16),
                    location: 'Computer Lab 1, Main Building'
                  });
                }}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Fill Example
              </button>
            </div>
          </div>
          
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Example: Advanced Programming Workshop"
                disabled={loading}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.title}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.title.length}/100 characters (minimum 3 required)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Example: This workshop will cover advanced programming concepts including data structures, algorithms, and best practices for software development."
                disabled={loading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/1000 characters (minimum 10 required)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.date ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.endDate ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.endDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.location ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Example: Computer Lab 1, Main Building"
                disabled={loading}
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.location}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={loading}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Target Audience</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departments *
                {user?.role === 'faculty' && (
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (Faculty can only target their own department)
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {departments.map(dept => (
                  <label key={dept.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.targetDepartments.includes(dept.value)}
                      onChange={() => handleMultiSelectChange('targetDepartments', dept.value)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">{dept.label}</span>
                  </label>
                ))}
              </div>
              {errors.targetDepartments && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.targetDepartments}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Years *
                {user?.role === 'faculty' && user?.accessibleYears && (
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (You can only target years you have access to)
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {academicYears.map(year => (
                  <label key={year.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.targetAcademicYears.includes(year.value)}
                      onChange={() => handleMultiSelectChange('targetAcademicYears', year.value)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">{year.label}</span>
                  </label>
                ))}
              </div>
              {errors.targetAcademicYears && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.targetAcademicYears}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>
                {event ? 'Update Event' : 'Create Event'}
                {!isFormValid() && !loading && ' (Fill required fields)'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;