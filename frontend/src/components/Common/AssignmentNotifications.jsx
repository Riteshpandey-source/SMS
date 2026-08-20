import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  UserPlus, 
  UserMinus, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Users,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';

const AssignmentNotifications = ({ 
  position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  maxNotifications = 5,
  autoHide = true,
  hideDelay = 5000,
  className = ''
}) => {
  const { user } = useAuth();
  const { 
    assignedFaculty,
    assignedStudents,
    hasAssignedFaculty,
    hasAssignedStudents,
    totalAssignedFaculty,
    totalAssignedStudents,
    lastUpdated,
    error
  } = useAssignment();

  const [notifications, setNotifications] = useState([]);
  const [previousAssignments, setPreviousAssignments] = useState({
    faculty: [],
    students: []
  });

  // Generate notification ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Create notification object
  const createNotification = (type, title, message, data = {}) => ({
    id: generateId(),
    type,
    title,
    message,
    data,
    timestamp: new Date(),
    read: false
  });

  // Add notification to the list
  const addNotification = (notification) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev].slice(0, maxNotifications);
      
      // Auto-hide notification if enabled
      if (autoHide) {
        setTimeout(() => {
          removeNotification(notification.id);
        }, hideDelay);
      }
      
      return newNotifications;
    });
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Check for assignment changes and generate notifications
  useEffect(() => {
    if (!user || !lastUpdated) return;

    const currentFaculty = assignedFaculty || [];
    const currentStudents = assignedStudents || [];

    // Check for new faculty assignments (for students)
    if (user.role === 'student') {
      const newFaculty = currentFaculty.filter(current => 
        !previousAssignments.faculty.some(prev => 
          prev.faculty._id === current.faculty._id
        )
      );

      newFaculty.forEach(assignment => {
        addNotification(createNotification(
          'faculty_assigned',
          'New Faculty Assigned',
          `${assignment.faculty.name} from ${assignment.faculty.department} has been assigned to you.`,
          { faculty: assignment.faculty }
        ));
      });

      // Check for removed faculty assignments
      const removedFaculty = previousAssignments.faculty.filter(prev => 
        !currentFaculty.some(current => 
          current.faculty._id === prev.faculty._id
        )
      );

      removedFaculty.forEach(assignment => {
        addNotification(createNotification(
          'faculty_unassigned',
          'Faculty Assignment Removed',
          `${assignment.faculty.name} is no longer assigned to you.`,
          { faculty: assignment.faculty }
        ));
      });
    }

    // Check for new student assignments (for faculty)
    if (user.role === 'faculty') {
      const newStudents = currentStudents.filter(current => 
        !previousAssignments.students.some(prev => 
          prev.student._id === current.student._id
        )
      );

      if (newStudents.length > 0) {
        if (newStudents.length === 1) {
          addNotification(createNotification(
            'student_assigned',
            'New Student Assigned',
            `${newStudents[0].student.name} (Year ${newStudents[0].student.academicYear}) has been assigned to you.`,
            { student: newStudents[0].student }
          ));
        } else {
          addNotification(createNotification(
            'students_assigned',
            'New Students Assigned',
            `${newStudents.length} new students have been assigned to you.`,
            { count: newStudents.length, students: newStudents.map(a => a.student) }
          ));
        }
      }

      // Check for removed student assignments
      const removedStudents = previousAssignments.students.filter(prev => 
        !currentStudents.some(current => 
          current.student._id === prev.student._id
        )
      );

      if (removedStudents.length > 0) {
        if (removedStudents.length === 1) {
          addNotification(createNotification(
            'student_unassigned',
            'Student Assignment Removed',
            `${removedStudents[0].student.name} is no longer assigned to you.`,
            { student: removedStudents[0].student }
          ));
        } else {
          addNotification(createNotification(
            'students_unassigned',
            'Student Assignments Removed',
            `${removedStudents.length} students are no longer assigned to you.`,
            { count: removedStudents.length }
          ));
        }
      }
    }

    // Update previous assignments for next comparison
    setPreviousAssignments({
      faculty: currentFaculty,
      students: currentStudents
    });
  }, [assignedFaculty, assignedStudents, lastUpdated, user]);

  // Show assignment status notifications
  useEffect(() => {
    if (!user || !lastUpdated) return;

    // Show welcome notification for first-time assignments
    if (user.role === 'student' && hasAssignedFaculty() && previousAssignments.faculty.length === 0) {
      addNotification(createNotification(
        'welcome_student',
        'Welcome to CampusBuddy!',
        `You have ${totalAssignedFaculty} faculty member${totalAssignedFaculty !== 1 ? 's' : ''} assigned to guide you.`,
        { count: totalAssignedFaculty }
      ));
    }

    if (user.role === 'faculty' && hasAssignedStudents() && previousAssignments.students.length === 0) {
      addNotification(createNotification(
        'welcome_faculty',
        'Welcome to CampusBuddy!',
        `You have ${totalAssignedStudents} student${totalAssignedStudents !== 1 ? 's' : ''} assigned to your guidance.`,
        { count: totalAssignedStudents }
      ));
    }
  }, [hasAssignedFaculty, hasAssignedStudents, totalAssignedFaculty, totalAssignedStudents, user]);

  // Show error notifications
  useEffect(() => {
    if (error) {
      addNotification(createNotification(
        'error',
        'Assignment Error',
        'There was a problem loading your assignments. Please try refreshing.',
        { error }
      ));
    }
  }, [error]);

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'faculty_assigned':
      case 'student_assigned':
      case 'students_assigned':
        return UserPlus;
      case 'faculty_unassigned':
      case 'student_unassigned':
      case 'students_unassigned':
        return UserMinus;
      case 'welcome_student':
      case 'welcome_faculty':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      case 'info':
        return Info;
      default:
        return Bell;
    }
  };

  // Get notification color
  const getNotificationColor = (type) => {
    switch (type) {
      case 'faculty_assigned':
      case 'student_assigned':
      case 'students_assigned':
      case 'welcome_student':
      case 'welcome_faculty':
        return 'green';
      case 'faculty_unassigned':
      case 'student_unassigned':
      case 'students_unassigned':
        return 'yellow';
      case 'error':
        return 'red';
      case 'info':
      default:
        return 'blue';
    }
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  // Color classes
  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600'
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 space-y-2 max-w-sm ${className}`}>
      {notifications.map((notification) => {
        const Icon = getNotificationIcon(notification.type);
        const color = getNotificationColor(notification.type);
        const colors = colorClasses[color];

        return (
          <div
            key={notification.id}
            className={`${colors.bg} ${colors.border} border rounded-lg shadow-lg p-4 animate-slide-in-right`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-1 rounded-full ${colors.bg}`}>
                <Icon className={`h-4 w-4 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${colors.text}`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm ${colors.text} opacity-90 mt-1`}>
                      {notification.message}
                    </p>
                    <p className={`text-xs ${colors.text} opacity-75 mt-2`}>
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className={`ml-2 p-1 rounded-full hover:bg-black hover:bg-opacity-10 ${colors.text} opacity-50 hover:opacity-75`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Clear all button */}
      {notifications.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={clearAllNotifications}
            className="text-xs text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-50 px-2 py-1 rounded border border-gray-200 shadow-sm"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignmentNotifications;