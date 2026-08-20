import React from 'react';
import { X, Calendar, Clock, MapPin, Users, GraduationCap, Building, Mail, Phone } from 'lucide-react';

const EventDetailsModal = ({ event, isOpen, onClose }) => {
  if (!isOpen || !event) return null;

  const isUpcoming = new Date(event.date) >= new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Category Badge */}
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              event.category === 'academic' ? 'bg-blue-100 text-blue-800' :
              event.category === 'cultural' ? 'bg-purple-100 text-purple-800' :
              event.category === 'sports' ? 'bg-green-100 text-green-800' :
              event.category === 'technical' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {event.category?.charAt(0)?.toUpperCase() + event.category?.slice(1)}
            </span>
            {!isUpcoming && (
              <span className="ml-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                Past Event
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600">{event.description}</p>
          </div>

          {/* Event Details */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Event Details</h3>
            
            <div className="flex items-center text-gray-700">
              <Calendar className="w-5 h-5 mr-3 text-gray-400" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-sm text-gray-600">
                  {new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center text-gray-700">
              <Clock className="w-5 h-5 mr-3 text-gray-400" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-sm text-gray-600">{event.time || 'TBA'}</p>
              </div>
            </div>

            <div className="flex items-center text-gray-700">
              <MapPin className="w-5 h-5 mr-3 text-gray-400" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-sm text-gray-600">{event.location}</p>
              </div>
            </div>

            <div className="flex items-center text-gray-700">
              <Users className="w-5 h-5 mr-3 text-gray-400" />
              <div>
                <p className="font-medium">Attendees</p>
                <p className="text-sm text-gray-600">
                  {event.attendees?.length || 0} registered
                  {event.maxAttendees && ` / ${event.maxAttendees} max`}
                </p>
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Target Audience</h3>
            <div className="space-y-2">
              {event.targetDepartments?.includes('ALL') ? (
                <div className="flex items-center">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    Open to All Students
                  </span>
                </div>
              ) : (
                <>
                  {event.targetAcademicYears?.length > 0 && (
                    <div className="flex items-center text-gray-700">
                      <GraduationCap className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="font-medium">Academic Years</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {event.targetAcademicYears.map(year => (
                            <span key={year} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                              Year {year}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {event.targetDepartments?.length > 0 && (
                    <div className="flex items-center text-gray-700">
                      <Building className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="font-medium">Departments</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {event.targetDepartments.map(dept => (
                            <span key={dept} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                              {dept}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Organizer Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Organizer</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-gray-900">
                {event.organizer?.name || 'Faculty'}
              </p>
              {event.contactEmail && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  <a href={`mailto:${event.contactEmail}`} className="hover:text-indigo-600">
                    {event.contactEmail}
                  </a>
                </div>
              )}
              {event.contactPhone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <a href={`tel:${event.contactPhone}`} className="hover:text-indigo-600">
                    {event.contactPhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          {isUpcoming && event.registrationRequired && (
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={() => {
                // Handle registration
                alert('Registration functionality coming soon!');
              }}
            >
              Register for Event
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
