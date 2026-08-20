import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Users, 
  UserPlus, 
  UserMinus,
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Clock,
  Mail,
  Eye,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';

const AssignmentNotification = ({ 
  type = 'info', // 'info', 'success', 'warning', 'error'
  title,
  message,
  actions = [],
  dismissible = true,
  autoHide = false,
  hideDelay = 5000,
  onDismiss,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide && hideDelay > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const getNotificationStyle = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-400',
          icon: CheckCircle
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-400',
          icon: AlertCircle
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-400',
          icon: AlertCircle
        };
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-400',
          icon: Info
        };
    }
  };

  if (!isVisible) return null;

  const style = getNotificationStyle();
  const Icon = style.icon;

  return (
    <div className={`rounded-lg border ${style.borderColor} ${style.bgColor} p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${style.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${style.textColor}`}>
              {title}
            </h3>
          )}
          {message && (
            <div className={`${title ? 'mt-1' : ''} text-sm ${style.textColor}`}>
              {message}
            </div>
          )}
          {actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`text-sm font-medium ${style.textColor} hover:underline`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={handleDismiss}
                className={`inline-flex rounded-md p-1.5 ${style.textColor} hover:bg-white hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600`}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Assignment-specific notification components
export const AssignmentNotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const {
    assignedFaculty,
    assignedStudents,
    hasAssignedFaculty,
    hasAssignedStudents,
    loading,
    error,
    refreshAssignments
  } = useAssignment();

  const [notifications, setNotifications] = useState([]);

  // Add notification
  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Check for assignment status and create notifications
  useEffect(() => {
    if (!user || loading) return;

    // Clear existing notifications when user changes
    setNotifications([]);

    // Student notifications
    if (user.role === 'student') {
      if (!hasAssignedFaculty() && !loading && !error) {
        addNotification({
          type: 'warning',
          title: 'No Faculty Assigned',
          message: `You don't have any faculty members assigned to your ${user.academicYear}${user.academicYear === 1 ? 'st' : user.academicYear === 2 ? 'nd' : user.academicYear === 3 ? 'rd' : 'th'} year ${user.department} program. This may limit the content you can access.`,
          actions: [
            {
              label: 'Refresh Assignments',
              onClick: () => refreshAssignments(true)
            }
          ],
          dismissible: true,
          autoHide: false
        });
      }
    }

    // Faculty notifications
    if (user.role === 'faculty') {
      if (!hasAssignedStudents() && !loading && !error) {
        addNotification({
          type: 'warning',
          title: 'No Students Assigned',
          message: `You don't have any students assigned to your accessible years (${user.accessibleYears?.join(', ') || 'None'}) in the ${user.department} department.`,
          actions: [
            {
              label: 'Refresh Assignments',
              onClick: () => refreshAssignments(true)
            }
          ],
          dismissible: true,
          autoHide: false
        });
      }
    }

    // Error notifications
    if (error) {
      addNotification({
        type: 'error',
        title: 'Assignment Error',
        message: error,
        actions: [
          {
            label: 'Try Again',
            onClick: () => refreshAssignments(true)
          }
        ],
        dismissible: true,
        autoHide: false
      });
    }
  }, [user, hasAssignedFaculty, hasAssignedStudents, loading, error]);

  return (
    <>
      {children}
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <AssignmentNotification
            key={notification.id}
            {...notification}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </>
  );
};

// Specific notification components for different assignment events
export const NewAssignmentNotification = ({ assignment, userRole, onDismiss }) => {
  const isStudent = userRole === 'student';
  const person = isStudent ? assignment.faculty : assignment.student;
  
  return (
    <AssignmentNotification
      type="success"
      title={`New ${isStudent ? 'Faculty' : 'Student'} Assigned`}
      message={`${person.name} has been assigned to you. You can now access their content and communicate with them.`}
      actions={[
        {
          label: `Contact ${person.name}`,
          onClick: () => window.location.href = `mailto:${person.email}`
        },
        {
          label: `View ${isStudent ? 'Faculty' : 'Students'}`,
          onClick: () => {
            // This would typically navigate to the appropriate section
            console.log(`Navigate to ${isStudent ? 'faculty' : 'students'} section`);
          }
        }
      ]}
      onDismiss={onDismiss}
      autoHide={true}
      hideDelay={10000}
    />
  );
};

export const AssignmentRemovedNotification = ({ assignment, userRole, onDismiss }) => {
  const isStudent = userRole === 'student';
  const person = isStudent ? assignment.faculty : assignment.student;
  
  return (
    <AssignmentNotification
      type="warning"
      title={`${isStudent ? 'Faculty' : 'Student'} Assignment Removed`}
      message={`${person.name} is no longer assigned to you. You may lose access to some content.`}
      actions={[
        {
          label: 'Refresh Assignments',
          onClick: () => {
            // This would typically refresh assignments
            console.log('Refresh assignments');
          }
        }
      ]}
      onDismiss={onDismiss}
      autoHide={true}
      hideDelay={8000}
    />
  );
};

export const AssignmentUpdateNotification = ({ changes, onDismiss }) => {
  return (
    <AssignmentNotification
      type="info"
      title="Assignments Updated"
      message={`Your assignments have been updated. ${changes.added || 0} added, ${changes.removed || 0} removed.`}
      actions={[
        {
          label: 'View Changes',
          onClick: () => {
            // This would typically show assignment details
            console.log('View assignment changes');
          }
        }
      ]}
      onDismiss={onDismiss}
      autoHide={true}
      hideDelay={6000}
    />
  );
};

export const AssignmentErrorNotification = ({ error, onRetry, onDismiss }) => {
  return (
    <AssignmentNotification
      type="error"
      title="Assignment Error"
      message={error}
      actions={[
        {
          label: 'Try Again',
          onClick: onRetry
        }
      ]}
      onDismiss={onDismiss}
      dismissible={true}
    />
  );
};

export default AssignmentNotification;