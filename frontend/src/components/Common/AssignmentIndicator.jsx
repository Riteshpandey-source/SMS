import React from 'react';
import { Users, UserCheck, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';

const AssignmentIndicator = ({ 
  variant = 'badge', // 'badge', 'pill', 'full'
  size = 'medium', // 'small', 'medium', 'large'
  showCount = false,
  className = ''
}) => {
  const { user } = useAuth();
  const { 
    assignedFaculty, 
    assignedStudents, 
    hasAssignedFaculty, 
    hasAssignedStudents,
    loading 
  } = useAssignment();

  if (loading || user?.role === 'admin') {
    return null;
  }

  const getIndicatorData = () => {
    if (user?.role === 'student') {
      const count = assignedFaculty?.length || 0;
      const hasAssignments = hasAssignedFaculty();
      
      return {
        count,
        hasAssignments,
        label: count === 1 ? 'Faculty' : 'Faculty',
        icon: hasAssignments ? UserCheck : AlertTriangle,
        color: hasAssignments ? 'green' : 'yellow',
        message: hasAssignments 
          ? `${count} assigned faculty member${count !== 1 ? 's' : ''}`
          : 'No assigned faculty'
      };
    } else if (user?.role === 'faculty') {
      const count = assignedStudents?.length || 0;
      const hasAssignments = hasAssignedStudents();
      
      return {
        count,
        hasAssignments,
        label: count === 1 ? 'Student' : 'Students',
        icon: hasAssignments ? UserCheck : AlertTriangle,
        color: hasAssignments ? 'blue' : 'yellow',
        message: hasAssignments 
          ? `${count} assigned student${count !== 1 ? 's' : ''}`
          : 'No assigned students'
      };
    }
    
    return null;
  };

  const data = getIndicatorData();
  if (!data) return null;

  const { count, hasAssignments, label, icon: Icon, color, message } = data;

  // Size classes
  const sizeClasses = {
    small: {
      icon: 'w-3 h-3',
      text: 'text-xs',
      padding: 'px-2 py-1',
      badge: 'w-5 h-5'
    },
    medium: {
      icon: 'w-4 h-4',
      text: 'text-sm',
      padding: 'px-3 py-1',
      badge: 'w-6 h-6'
    },
    large: {
      icon: 'w-5 h-5',
      text: 'text-base',
      padding: 'px-4 py-2',
      badge: 'w-8 h-8'
    }
  };

  // Color classes
  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: 'text-green-600'
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: 'text-blue-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      icon: 'text-yellow-600'
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: 'text-red-600'
    }
  };

  const sizeClass = sizeClasses[size];
  const colorClass = colorClasses[color];

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center justify-center ${sizeClass.badge} ${colorClass.bg} ${colorClass.border} border rounded-full ${className}`}>
        <Icon className={`${sizeClass.icon} ${colorClass.icon}`} />
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center space-x-1 ${sizeClass.padding} ${colorClass.bg} ${colorClass.text} ${colorClass.border} border rounded-full ${sizeClass.text} font-medium ${className}`}>
        <Icon className={`${sizeClass.icon} ${colorClass.icon}`} />
        {showCount && <span>{count}</span>}
        <span>{label}</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center space-x-2 ${sizeClass.padding} ${colorClass.bg} ${colorClass.border} border rounded-lg ${className}`}>
        <div className={`${colorClass.bg} p-1 rounded`}>
          <Icon className={`${sizeClass.icon} ${colorClass.icon}`} />
        </div>
        <div>
          <p className={`${sizeClass.text} font-medium ${colorClass.text}`}>
            {message}
          </p>
          {!hasAssignments && (
            <p className={`text-xs ${colorClass.text} opacity-75`}>
              Contact your administrator
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default AssignmentIndicator;