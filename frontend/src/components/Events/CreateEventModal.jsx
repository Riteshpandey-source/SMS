import React, { useState } from 'react';
import { X, Calendar, MapPin, Users, Clock, FileText, Tag, AlertCircle } from 'lucide-react';
import { departments, academicYears } from '../../data/mockData';
import { useYear } from '../../contexts/YearContext';

const CreateEventModal = ({ isOpen, onClose, onSubmit }) => {
  const { accessibleYears, isFaculty } = useYear();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    time: '10:00',
    location: '',
    category: 'academic',
    isOpenToAll: true,
    targetAcademicYears: [],
    targetDepartments: [],
    maxAttendees: '',
    registrationDeadline: '',
    contactEmail: '',
    contactPhone: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const categories = [
    { value: 'academic', label: 'Academic' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'sports', label: 'Sports' },
    { value: 'technical', label: 'Technical' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (field, value, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.date || !formData.time || !formData.location) {
        throw new Error('Please fill in all required fields');
      }

      // Validate title and description length
      if (formData.title.trim().length < 3) {
        throw new Error('Event title must be at least 3 characters long');
      }

      if (formData.description.trim().length < 3) {
        throw new Error('Event description must be at least 3 characters long');
      }

      if (formData.location.trim().length < 1) {
        throw new Error('Event location is required');
      }

      // Combine date and time
      const eventDateTime = new Date(`${formData.date}T${formData.time}`);
      
      // Validate that the event is in the future (allow same day events)
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset to start of day for comparison
      const eventDate = new Date(formData.date);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate < now) {
        throw new Error('Event date cannot be in the past');
      }

      // Determine target years based on faculty's accessible years
      let targetYears = [1, 2, 3, 4];
      
      console.log('Year selection logic:', {
        isFaculty,
        accessibleYears,
        isOpenToAll: formData.isOpenToAll,
        selectedYears: formData.targetAcademicYears
      });
      
      if (isFaculty && accessibleYears && accessibleYears.length > 0) {
        // Faculty can only create events for their accessible years
        if (formData.isOpenToAll) {
          // If open to all, use faculty's accessible years only
          targetYears = [...accessibleYears];
          console.log('Using faculty accessible years for "open to all":', targetYears);
        } else if (formData.targetAcademicYears.length > 0) {
          // Filter selected years to only include accessible years
          const selectedYears = formData.targetAcademicYears.map(Number);
          targetYears = selectedYears.filter(year => accessibleYears.includes(year));
          console.log('Filtered selected years:', { selectedYears, targetYears });
          
          if (targetYears.length === 0) {
            throw new Error(`You can only create events for your accessible years: ${accessibleYears.join(', ')}`);
          }
        } else {
          // Default to accessible years
          targetYears = [...accessibleYears];
          console.log('Using default accessible years:', targetYears);
        }
      } else if (!formData.isOpenToAll && formData.targetAcademicYears.length > 0) {
        // Non-faculty or admin
        targetYears = formData.targetAcademicYears.map(Number);
        console.log('Using selected years for non-faculty:', targetYears);
      }
      
      console.log('Final target years:', targetYears);

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: eventDateTime.toISOString(),
        location: formData.location.trim(),
        category: formData.category || 'academic',
        targetAcademicYears: targetYears,
        targetDepartments: formData.isOpenToAll ? ['ALL'] : (formData.targetDepartments.length > 0 ? formData.targetDepartments : ['ALL']),
        registrationRequired: true,
        isPublic: true
      };

      // Add optional fields only if they have valid values
      if (formData.maxAttendees && formData.maxAttendees.trim() !== '') {
        const maxAttendeesNum = parseInt(formData.maxAttendees);
        if (!isNaN(maxAttendeesNum) && maxAttendeesNum > 0) {
          eventData.maxAttendees = maxAttendeesNum;
        }
      }
      
      if (formData.registrationDeadline && formData.registrationDeadline.trim() !== '') {
        eventData.registrationDeadline = new Date(formData.registrationDeadline).toISOString();
      }
      
      if (formData.contactEmail && formData.contactEmail.trim() !== '') {
        eventData.contactEmail = formData.contactEmail.trim();
      }
      
      if (formData.contactPhone && formData.contactPhone.trim() !== '') {
        eventData.contactPhone = formData.contactPhone.trim();
      }

      console.log('Sending event data:', eventData);
      await onSubmit(eventData);
    } catch (error) {
      console.error('Error creating event:', error);
      
      // Extract error message from response
      let errorMessage = 'Failed to create event';
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        errorMessage = errorData.message || errorMessage;
        
        // Add details if available
        if (errorData.details) {
          if (typeof errorData.details === 'string') {
            errorMessage += `: ${errorData.details}`;
          } else if (errorData.details.deniedYears) {
            errorMessage += `. You don't have access to years: ${errorData.details.deniedYears.join(', ')}`;
          } else if (errorData.details.accessibleYears) {
            errorMessage += `. Your accessible years: ${errorData.details.accessibleYears.join(', ')}`;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Event</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800">Error Creating Event</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Faculty Year Access Info */}
          {isFaculty && accessibleYears && accessibleYears.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can create events for years: {accessibleYears.map(y => `${y}${y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'}`).join(', ')}
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Event Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter event title"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe your event"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time *
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Event location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Target Audience</h3>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="openToAll"
                checked={formData.isOpenToAll}
                onChange={(e) => handleInputChange('isOpenToAll', e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="openToAll" className="text-sm font-medium text-gray-700">
                {isFaculty && accessibleYears && accessibleYears.length > 0
                  ? `Open to all students in my accessible years (${accessibleYears.join(', ')})`
                  : 'Open to all students'}
              </label>
            </div>

            {!formData.isOpenToAll && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Academic Years
                  </label>
                  <div className="space-y-2">
                    {academicYears.map(year => {
                      const isAccessible = !isFaculty || !accessibleYears || accessibleYears.length === 0 || accessibleYears.includes(year.value);
                      return (
                        <div key={year.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`year-${year.value}`}
                            checked={formData.targetAcademicYears.includes(year.value)}
                            onChange={(e) => handleArrayChange('targetAcademicYears', year.value, e.target.checked)}
                            disabled={!isAccessible}
                            className={`w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <label htmlFor={`year-${year.value}`} className={`text-sm ${isAccessible ? 'text-gray-700' : 'text-gray-400'}`}>
                            {year.label} {!isAccessible && '(Not accessible)'}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Departments
                  </label>
                  <div className="space-y-2">
                    {departments.map(dept => (
                      <div key={dept.code} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`dept-${dept.code}`}
                          checked={formData.targetDepartments.includes(dept.code)}
                          onChange={(e) => handleArrayChange('targetDepartments', dept.code, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor={`dept-${dept.code}`} className="text-sm text-gray-700">
                          {dept.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Max Attendees (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxAttendees}
                onChange={(e) => handleInputChange('maxAttendees', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Deadline (Optional)
              </label>
              <input
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email (Optional)
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Contact email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Contact phone number"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;