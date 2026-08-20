import React, { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, Users, GraduationCap, Edit3, Trash2, Filter } from 'lucide-react';
import EventCard from './EventCard';
import CreateEventModal from './CreateEventModal';
import EditEventModal from './EditEventModal';
import EventDetailsModal from './EventDetailsModal';
import YearFilter from '../Common/YearFilter';
import AccessIndicator from '../Common/AccessIndicator';
import { mockEvents } from '../../data/mockData';
import { departments } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';
import { useYear } from '../../contexts/YearContext';
import { useAssignment } from '../../contexts/AssignmentContext';
import { facultyService } from '../../services/facultyService';
import toast from 'react-hot-toast';

const Events = () => {
  const { user } = useAuth();
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
    hasAssignedStudents
  } = useAssignment();
  
  const [filter, setFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [viewMode, setViewMode] = useState('grid');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch events
  const fetchEvents = async () => {
    try {
      console.log('🎉 Events: Starting to fetch events...');
      setLoading(true);
      // Direct API call for all users (faculty, students, admin)
      const api = (await import('../../services/api')).default;
      console.log('🎉 Events: Making API call to /events');
      const response = await api.get('/events');
      console.log('🎉 Events: API response received:', response.data);
      console.log('🎉 Events: Full response data:', JSON.stringify(response.data, null, 2));
      console.log('🎉 Events: Number of events:', response.data.data.events?.length || 0);
      console.log('🎉 Events: User access info:', response.data.data.userAccess);
      setEvents(response.data.data.events || []);
    } catch (error) {
      console.error('❌ Events: Failed to fetch events:', error);
      console.error('❌ Events: Error details:', error.response?.data || error.message);
      setEvents([]);
    } finally {
      setLoading(false);
      console.log('🎉 Events: Fetch complete');
    }
  };

  useEffect(() => {
    console.log('🎉 Events: useEffect triggered, isFaculty:', isFaculty);
    fetchEvents();
  }, [isFaculty]);

  // Handle event creation
  const handleCreateEvent = async (eventData) => {
    try {
      console.log('Creating event with data:', eventData);
      await facultyService.createEvent(eventData);
      toast.success('Event created successfully!');
      setShowCreateModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.error?.message || 'Failed to create event';
      toast.error(errorMessage);
    }
  };

  // Handle event update
  const handleUpdateEvent = async (eventId, eventData) => {
    try {
      await facultyService.updateEvent(eventId, eventData);
      toast.success('Event updated successfully!');
      setShowEditModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
      toast.error('Failed to update event');
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      return;
    }

    try {
      await facultyService.deleteEvent(eventId);
      toast.success('Event deleted successfully!');
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event');
    }
  };

  // Handle edit event
  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  // Handle open event details
  const handleOpenEvent = (event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const filteredEvents = events.filter(event => {
    // Category filter
    const matchesCategory = filter === 'all' || event.category === filter;
    
    // Year filter using Year Context
    let matchesYear = true;
    if (currentYearFilter !== 'all') {
      const targetYear = parseInt(currentYearFilter);
      matchesYear = event.targetDepartments?.includes('ALL') || 
                   event.targetAcademicYears?.includes(targetYear);
    }
    
    // Department filter
    const matchesDept = deptFilter === 'all' || 
                       event.targetDepartments?.includes('ALL') || 
                       event.targetDepartments?.length === 0 ||
                       event.targetDepartments?.includes(deptFilter);
    
    // Additional year access validation for faculty
    if (isFaculty && event.targetAcademicYears?.length > 0) {
      const hasAccessToEventYears = event.targetAcademicYears.some(year => hasYearAccess(year));
      if (!hasAccessToEventYears) {
        matchesYear = false;
      }
    }

    // Assignment-based filtering
    let matchesAssignment = true;
    if (assignmentFilter === 'assigned') {
      if (isStudent && hasAssignedFaculty()) {
        // Students: show events from assigned faculty
        const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
        matchesAssignment = assignedFacultyIds.includes(event.createdBy?.id) || 
                           assignedFacultyIds.includes(event.createdBy) ||
                           (event.createdBy?.role === 'faculty' && event.targetDepartments?.includes(user.department));
      } else if (isFaculty && hasAssignedStudents()) {
        // Faculty: show events relevant to assigned students
        const assignedStudentYears = [...new Set(assignedStudents.map(a => a.student.academicYear))];
        matchesAssignment = event.targetAcademicYears?.some(year => assignedStudentYears.includes(year)) ||
                           event.targetDepartments?.includes('ALL') ||
                           event.targetDepartments?.includes(user.department);
      }
    } else if (assignmentFilter === 'unassigned') {
      if (isStudent && hasAssignedFaculty()) {
        // Students: show events NOT from assigned faculty
        const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
        matchesAssignment = !assignedFacultyIds.includes(event.createdBy?.id) && 
                           !assignedFacultyIds.includes(event.createdBy);
      } else if (isFaculty && hasAssignedStudents()) {
        // Faculty: show events not specifically for assigned students
        const assignedStudentYears = [...new Set(assignedStudents.map(a => a.student.academicYear))];
        matchesAssignment = !event.targetAcademicYears?.some(year => assignedStudentYears.includes(year));
      }
    }
    
    return matchesCategory && matchesYear && matchesDept && matchesAssignment;
  });

  // Get events relevant to current user
  const relevantEvents = events.filter(event => {
    // Check department access
    const departmentMatch = event.targetDepartments?.includes('ALL') || 
                           event.targetDepartments?.includes(user?.department);
    
    // Check year access
    let yearMatch = true;
    if (isStudent) {
      yearMatch = event.targetAcademicYears?.includes(user.academicYear);
    } else if (isFaculty) {
      yearMatch = event.targetAcademicYears?.some(year => hasYearAccess(year));
    }
    
    return departmentMatch && yearMatch;
  });

  const categories = ['all', 'academic', 'technical', 'cultural', 'sports', 'other'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Access Indicator */}
      <AccessIndicator 
        variant="default" 
        showDetails={true} 
        showYearBreakdown={true}
      />

      {/* Events Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-purple-900">Events</h1>
              <p className="text-purple-700 mt-1">
                {relevantEvents.length} events available for you
                {isFaculty && ` • ${accessibleYears.length} year${accessibleYears.length !== 1 ? 's' : ''} accessible`}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-purple-600">
                {isStudent && (
                  <span>• Your year: {user.academicYear}${user.academicYear === 1 ? 'st' : user.academicYear === 2 ? 'nd' : user.academicYear === 3 ? 'rd' : 'th'}</span>
                )}
                {isFaculty && (
                  <span>• You can create events for your accessible years</span>
                )}
                <span>• Department: {user?.department}</span>
                {/* Assignment Status */}
                {isStudent && (
                  <span>• {hasAssignedFaculty() ? `${assignedFaculty.length} faculty assigned` : 'No faculty assigned'}</span>
                )}
                {isFaculty && (
                  <span>• {hasAssignedStudents() ? `${assignedStudents.length} students assigned` : 'No students assigned'}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Add Event Button for Faculty and Admin */}
          {(isFaculty || isAdmin) && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Event
            </button>
          )}
        </div>
      </div>



      {/* Filters and View Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* View Mode and Year Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarIcon className="w-4 h-4 mr-2 inline" />
                Calendar
              </button>
            </div>
            
            {/* Year Filter */}
            <div className="w-48">
              <YearFilter 
                label="Target Year"
                size="medium"
                showAllOption={true}
                showAccessIndicator={true}
              />
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category?.charAt(0)?.toUpperCase() + category?.slice(1) || category}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter (Admin only) */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select 
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.code} value={dept.code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assignment Filter (Students and Faculty only) */}
            {(isStudent || isFaculty) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Filter</label>
                <select 
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Events</option>
                  <option value="assigned">
                    {isStudent ? 'From Assigned Faculty' : 'For Assigned Students'}
                  </option>
                  <option value="unassigned">
                    {isStudent ? 'From Other Faculty' : 'For Other Students'}
                  </option>
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  {isStudent && hasAssignedFaculty() && `${assignedFaculty.length} faculty assigned`}
                  {isFaculty && hasAssignedStudents() && `${assignedStudents.length} students assigned`}
                  {((isStudent && !hasAssignedFaculty()) || (isFaculty && !hasAssignedStudents())) && 'No assignments yet'}
                </div>
              </div>
            )}

            <div className="flex items-end">
              <button 
                onClick={() => {
                  setFilter('all');
                  setAssignmentFilter('all');
                  if (isAdmin) {
                    setDeptFilter('all');
                  } else {
                    setDeptFilter(user?.department || 'all');
                  }
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events Display Info */}
      {!loading && filteredEvents.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{filteredEvents.length} events</span> found
            {currentYearFilter !== 'all' && (
              <span className="ml-2 text-purple-600">
                • Filtered by {currentYearFilter}${currentYearFilter == 1 ? 'st' : currentYearFilter == 2 ? 'nd' : currentYearFilter == 3 ? 'rd' : 'th'} year
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            {isFaculty && (
              <span>• Use edit/delete buttons to manage your events</span>
            )}
            {isStudent && (
              <span>• Events targeted to your academic year</span>
            )}
          </div>
        </div>
      )}

      {/* Events Grid */}
      {viewMode === 'grid' && (
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {filteredEvents.map((event) => (
                <div key={event.id || event._id} className="relative">
                  <EventCard 
                    event={event} 
                    onOpen={handleOpenEvent}
                  />
                  {/* Faculty-only action buttons */}
                  {isFaculty && (
                    <div className="absolute top-4 right-4 flex space-x-2">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                        title="Edit Event"
                      >
                        <Edit3 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id || event._id, event.title)}
                        className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar View Placeholder */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View</h3>
          <p className="text-gray-600">Calendar view would be implemented here with a proper calendar component</p>
          <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900">{event.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{event.date} at {event.time}</p>
                <p className="text-sm text-gray-500">{event.location}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.targetAcademicYears?.length > 0 && !event.targetDepartments?.includes('ALL') && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Years: {event.targetAcademicYears.join(', ')}
                    </span>
                  )}
                  {event.targetDepartments?.length > 0 && !event.targetDepartments.includes('ALL') && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {event.targetDepartments.join(', ')}
                    </span>
                  )}
                  {event.targetDepartments?.includes('ALL') && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      Open to All
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && filteredEvents.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 mb-4">
            {(isFaculty || isAdmin)
              ? "No events match your current filters or you haven't created any events yet."
              : "No events are available for your current filter selection."
            }
          </p>
          {currentYearFilter !== 'all' && (
            <p className="text-sm text-blue-600 mb-4">
              Currently filtering by {currentYearFilter}${currentYearFilter == 1 ? 'st' : currentYearFilter == 2 ? 'nd' : currentYearFilter == 3 ? 'rd' : 'th'} year events
            </p>
          )}
          {(isFaculty || isAdmin) && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Create Your First Event
            </button>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateEvent}
        />
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <EditEventModal
          isOpen={showEditModal}
          event={selectedEvent}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
          }}
          onSubmit={(eventData) => handleUpdateEvent(selectedEvent.id || selectedEvent._id, eventData)}
        />
      )}

      {/* Event Details Modal */}
      {showDetailsModal && selectedEvent && (
        <EventDetailsModal
          isOpen={showDetailsModal}
          event={selectedEvent}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default Events;