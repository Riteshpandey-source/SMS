import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  Calendar,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';
import toast from 'react-hot-toast';

const AssignmentStatus = ({ 
  variant = 'full', // 'full', 'compact', 'minimal'
  showHistory = false,
  showRefresh = true,
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
    loading,
    error,
    lastUpdated,
    refreshAssignments,
    getAssignmentSummary
  } = useAssignment();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Handle refresh assignments
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAssignments(true);
      toast.success('Assignments refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh assignments:', error);
      toast.error('Failed to refresh assignments');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get status based on user role and assignments
  const getAssignmentStatus = () => {
    if (loading) {
      return {
        status: 'loading',
        message: 'Loading assignments...',
        icon: RefreshCw,
        color: 'blue',
        count: 0
      };
    }

    if (error) {
      return {
        status: 'error',
        message: error,
        icon: XCircle,
        color: 'red',
        count: 0
      };
    }

    if (user?.role === 'student') {
      const hasAssignments = hasAssignedFaculty();
      return {
        status: hasAssignments ? 'assigned' : 'unassigned',
        message: hasAssignments 
          ? `${totalAssignedFaculty} faculty member${totalAssignedFaculty !== 1 ? 's' : ''} assigned`
          : 'No faculty assigned',
        icon: hasAssignments ? UserCheck : AlertTriangle,
        color: hasAssignments ? 'green' : 'yellow',
        count: totalAssignedFaculty
      };
    } else if (user?.role === 'faculty') {
      const hasAssignments = hasAssignedStudents();
      return {
        status: hasAssignments ? 'assigned' : 'unassigned',
        message: hasAssignments 
          ? `${totalAssignedStudents} student${totalAssignedStudents !== 1 ? 's' : ''} assigned`
          : 'No students assigned',
        icon: hasAssignments ? UserCheck : AlertTriangle,
        color: hasAssignments ? 'blue' : 'yellow',
        count: totalAssignedStudents
      };
    } else if (user?.role === 'admin') {
      return {
        status: 'admin',
        message: 'Administrator access',
        icon: Shield,
        color: 'purple',
        count: 0
      };
    }

    return {
      status: 'unknown',
      message: 'Unknown status',
      icon: Info,
      color: 'gray',
      count: 0
    };
  };

  const statusInfo = getAssignmentStatus();
  const { status, message, icon: Icon, color, count } = statusInfo;

  // Color classes
  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
      button: 'bg-green-100 hover:bg-green-200 text-green-800'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600',
      button: 'bg-blue-100 hover:bg-blue-200 text-blue-800'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
      button: 'bg-red-100 hover:bg-red-200 text-red-800'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
      icon: 'text-purple-600',
      button: 'bg-purple-100 hover:bg-purple-200 text-purple-800'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      icon: 'text-gray-600',
      button: 'bg-gray-100 hover:bg-gray-200 text-gray-800'
    }
  };

  const colors = colorClasses[color];

  // Format last updated time
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffMinutes < 1440) return `${Math.ceil(diffMinutes / 60)} hour${Math.ceil(diffMinutes / 60) !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Get assignment summary for details
  const getAssignmentDetails = () => {
    if (user?.role === 'student' && hasAssignedFaculty()) {
      return assignedFaculty.map(assignment => ({
        name: assignment.faculty.name,
        department: assignment.faculty.department,
        assignedAt: assignment.assignedAt,
        source: assignment.assignmentSource
      }));
    } else if (user?.role === 'faculty' && hasAssignedStudents()) {
      return assignedStudents.slice(0, 5).map(assignment => ({
        name: assignment.student.name,
        year: assignment.student.academicYear,
        department: assignment.student.department,
        assignedAt: assignment.assignedAt,
        source: assignment.assignmentSource
      }));
    }
    return [];
  };

  const assignmentDetails = getAssignmentDetails();

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <Icon className={`h-4 w-4 ${colors.icon} ${loading || isRefreshing ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-medium ${colors.text}`}>
          {count > 0 ? count : status === 'loading' ? '...' : '0'}
        </span>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-3 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border} ${className}`}>
        <Icon className={`h-4 w-4 ${colors.icon} ${loading || isRefreshing ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-medium ${colors.text}`}>{message}</span>
        {showRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className={`p-1 rounded ${colors.button} disabled:opacity-50`}
            title="Refresh assignments"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  // Full variant (default)
  return (
    <div className={`rounded-lg border ${colors.bg} ${colors.border} p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${colors.button}`}>
            <Icon className={`h-5 w-5 ${colors.icon} ${loading || isRefreshing ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-medium ${colors.text}`}>
              Assignment Status
            </h3>
            <p className={`text-sm ${colors.text} opacity-90 mt-1`}>
              {message}
            </p>
            {lastUpdated && (
              <p className={`text-xs ${colors.text} opacity-75 mt-1`}>
                Last updated: {formatLastUpdated(lastUpdated)}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {assignmentDetails.length > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`p-1 rounded ${colors.button}`}
              title={showDetails ? 'Hide details' : 'Show details'}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className={`p-1 rounded ${colors.button} disabled:opacity-50`}
              title="Refresh assignments"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Assignment Details */}
      {showDetails && assignmentDetails.length > 0 && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <h4 className={`text-xs font-medium ${colors.text} mb-2`}>
            {user?.role === 'student' ? 'Assigned Faculty:' : 'Recent Students:'}
          </h4>
          <div className="space-y-2">
            {assignmentDetails.map((detail, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className={`${colors.text} opacity-90`}>
                  <span className="font-medium">{detail.name}</span>
                  {detail.department && (
                    <span className="ml-2 opacity-75">• {detail.department}</span>
                  )}
                  {detail.year && (
                    <span className="ml-2 opacity-75">• Year {detail.year}</span>
                  )}
                </div>
                <div className={`${colors.text} opacity-75 text-xs`}>
                  {new Date(detail.assignedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {user?.role === 'faculty' && totalAssignedStudents > 5 && (
              <div className={`text-xs ${colors.text} opacity-75 text-center pt-1`}>
                +{totalAssignedStudents - 5} more students
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment History */}
      {showHistory && lastUpdated && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <div className="flex items-center space-x-2">
            <Clock className={`h-3 w-3 ${colors.icon}`} />
            <span className={`text-xs ${colors.text} opacity-75`}>
              Assignment history and recent changes would appear here
            </span>
          </div>
        </div>
      )}

      {/* Unassigned Message */}
      {(status === 'unassigned') && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <div className="flex items-start space-x-2">
            <Info className={`h-4 w-4 ${colors.icon} mt-0.5`} />
            <div className={`text-xs ${colors.text} opacity-90`}>
              <p className="font-medium mb-1">What this means:</p>
              <p>
                {user?.role === 'student' 
                  ? 'You may have limited access to content and resources. Contact your administrator if this seems incorrect.'
                  : 'You may not see student-specific content. Check your accessible years and department settings.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Details */}
      {status === 'error' && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <div className="flex items-start space-x-2">
            <AlertTriangle className={`h-4 w-4 ${colors.icon} mt-0.5`} />
            <div className={`text-xs ${colors.text} opacity-90`}>
              <p className="font-medium mb-1">Error Details:</p>
              <p>There was a problem loading your assignment data. Try refreshing or contact support if the issue persists.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentStatus;