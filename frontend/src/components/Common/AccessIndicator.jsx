import React from 'react';
import { 
  Shield, 
  GraduationCap, 
  Users, 
  Building, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useYear } from '../../contexts/YearContext';

const AccessIndicator = ({ 
  className = '',
  variant = 'default',
  size = 'medium',
  showDetails = true,
  showYearBreakdown = true,
  compact = false
}) => {
  const { user } = useAuth();
  const { 
    accessibleYears, 
    currentYearFilter, 
    getYearDisplayText,
    getUserYearContext,
    canAccessMultipleYears,
    isAdmin,
    isFaculty,
    isStudent
  } = useYear();

  if (!user) return null;

  const userContext = getUserYearContext();

  // Get role-specific icon and color
  const getRoleInfo = () => {
    switch (user.role) {
      case 'admin':
        return {
          icon: Shield,
          color: 'purple',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-600'
        };
      case 'faculty':
        return {
          icon: GraduationCap,
          color: 'blue',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600'
        };
      case 'student':
        return {
          icon: Users,
          color: 'green',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600'
        };
      default:
        return {
          icon: Users,
          color: 'gray',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600'
        };
    }
  };

  const roleInfo = getRoleInfo();

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'p-3',
          text: 'text-sm',
          icon: 'w-4 h-4',
          badge: 'px-2 py-1 text-xs'
        };
      case 'large':
        return {
          container: 'p-6',
          text: 'text-base',
          icon: 'w-6 h-6',
          badge: 'px-3 py-1.5 text-sm'
        };
      default:
        return {
          container: 'p-4',
          text: 'text-sm',
          icon: 'w-5 h-5',
          badge: 'px-2.5 py-1 text-xs'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Get current filter status
  const getCurrentFilterStatus = () => {
    if (currentYearFilter === 'all') {
      return {
        text: 'All Years',
        icon: Eye,
        color: 'text-blue-600'
      };
    }
    
    const yearText = getYearDisplayText(currentYearFilter);
    return {
      text: yearText,
      icon: Eye,
      color: 'text-blue-600'
    };
  };

  const filterStatus = getCurrentFilterStatus();

  // Compact version
  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`
          inline-flex items-center space-x-2 rounded-full px-3 py-1.5
          ${roleInfo.bgColor} ${roleInfo.borderColor} border
        `}>
          <roleInfo.icon className={`${sizeClasses.icon} ${roleInfo.iconColor}`} />
          <span className={`font-medium ${roleInfo.textColor} ${sizeClasses.text}`}>
            {user.role === 'student' 
              ? getYearDisplayText(user.academicYear)
              : accessibleYears.length === 1 
                ? getYearDisplayText(accessibleYears[0])
                : `${accessibleYears.length} Years`
            }
          </span>
        </div>
      </div>
    );
  }

  // Default variant
  if (variant === 'default') {
    return (
      <div className={`
        rounded-lg border ${roleInfo.borderColor} ${roleInfo.bgColor} ${sizeClasses.container} ${className}
      `}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`
              p-2 rounded-lg bg-white border ${roleInfo.borderColor}
            `}>
              <roleInfo.icon className={`${sizeClasses.icon} ${roleInfo.iconColor}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${roleInfo.textColor} ${sizeClasses.text}`}>
                {user.name}
              </h3>
              <p className={`${roleInfo.textColor} opacity-75 text-xs`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)} • {user.department}
              </p>
            </div>
          </div>
          
          {showDetails && (
            <div className="text-right">
              <div className={`
                inline-flex items-center space-x-1 rounded-full px-2 py-1
                bg-white border ${roleInfo.borderColor}
              `}>
                <filterStatus.icon className={`w-3 h-3 ${filterStatus.color}`} />
                <span className={`text-xs font-medium ${roleInfo.textColor}`}>
                  {filterStatus.text}
                </span>
              </div>
            </div>
          )}
        </div>

        {showDetails && (
          <div className="mt-4 space-y-3">
            {/* Access Summary */}
            <div>
              <h4 className={`text-xs font-medium ${roleInfo.textColor} mb-2`}>
                Access Summary
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Building className={`w-3 h-3 ${roleInfo.iconColor}`} />
                  <span className={`text-xs ${roleInfo.textColor}`}>
                    {user.department} Department
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <GraduationCap className={`w-3 h-3 ${roleInfo.iconColor}`} />
                  <span className={`text-xs ${roleInfo.textColor}`}>
                    {isStudent 
                      ? `${getYearDisplayText(user.academicYear)} Student`
                      : isAdmin 
                        ? 'All Years'
                        : `${accessibleYears.length} Year${accessibleYears.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Year Breakdown for Faculty */}
            {showYearBreakdown && isFaculty && accessibleYears.length > 0 && (
              <div>
                <h4 className={`text-xs font-medium ${roleInfo.textColor} mb-2`}>
                  Accessible Years
                </h4>
                <div className="flex flex-wrap gap-1">
                  {accessibleYears.map(year => (
                    <span
                      key={year}
                      className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${currentYearFilter === year.toString() 
                          ? 'bg-white border-2 border-blue-500 text-blue-700' 
                          : 'bg-white border border-gray-300 text-gray-700'
                        }
                      `}
                    >
                      {getYearDisplayText(year)}
                      {currentYearFilter === year.toString() && (
                        <CheckCircle className="w-3 h-3 ml-1 text-blue-600" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Current Filter Status */}
            {showDetails && currentYearFilter !== 'all' && (
              <div className="pt-2 border-t border-white border-opacity-50">
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${roleInfo.textColor} opacity-75`}>
                    Currently viewing:
                  </span>
                  <span className={`text-xs font-medium ${roleInfo.textColor}`}>
                    {filterStatus.text}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div className={`
        bg-white rounded-xl shadow-sm border border-gray-200 ${sizeClasses.container} ${className}
      `}>
        <div className="flex items-center space-x-4">
          <div className={`
            p-3 rounded-xl ${roleInfo.bgColor}
          `}>
            <roleInfo.icon className={`${sizeClasses.icon} ${roleInfo.iconColor}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-semibold text-gray-900 ${sizeClasses.text}`}>
                  {user.name}
                </h3>
                <p className="text-gray-500 text-xs">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)} • {user.department}
                </p>
              </div>
              
              <div className="text-right">
                <div className={`
                  inline-flex items-center space-x-1 rounded-full px-3 py-1
                  ${roleInfo.bgColor} ${roleInfo.borderColor} border
                `}>
                  <span className={`text-xs font-medium ${roleInfo.textColor}`}>
                    {isStudent 
                      ? getYearDisplayText(user.academicYear)
                      : isAdmin 
                        ? 'All Years'
                        : `${accessibleYears.length} Year${accessibleYears.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </div>
              </div>
            </div>
            
            {showYearBreakdown && isFaculty && (
              <div className="mt-3 flex flex-wrap gap-1">
                {accessibleYears.map(year => (
                  <span
                    key={year}
                    className={`
                      inline-flex items-center px-2 py-1 rounded-md text-xs
                      ${currentYearFilter === year.toString() 
                        ? `${roleInfo.bgColor} ${roleInfo.textColor} border ${roleInfo.borderColor}` 
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}
                  >
                    {getYearDisplayText(year)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Badge variant
  if (variant === 'badge') {
    return (
      <div className={`
        inline-flex items-center space-x-2 rounded-full px-4 py-2
        ${roleInfo.bgColor} ${roleInfo.borderColor} border ${className}
      `}>
        <roleInfo.icon className={`${sizeClasses.icon} ${roleInfo.iconColor}`} />
        <span className={`font-medium ${roleInfo.textColor} ${sizeClasses.text}`}>
          {user.name}
        </span>
        <span className={`text-xs ${roleInfo.textColor} opacity-75`}>•</span>
        <span className={`text-xs ${roleInfo.textColor} opacity-75`}>
          {isStudent 
            ? getYearDisplayText(user.academicYear)
            : isAdmin 
              ? 'All Years'
              : `${accessibleYears.length} Year${accessibleYears.length !== 1 ? 's' : ''}`
          }
        </span>
      </div>
    );
  }

  return null;
};

// Specialized components for different use cases

// Simple year access indicator
export const YearAccessBadge = ({ years, className = '' }) => {
  const { hasYearAccess, getYearDisplayText } = useYear();
  
  if (!Array.isArray(years)) {
    years = [years];
  }

  const accessibleCount = years.filter(year => hasYearAccess(year)).length;
  const hasFullAccess = accessibleCount === years.length;

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {hasFullAccess ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : accessibleCount > 0 ? (
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
      ) : (
        <Lock className="w-4 h-4 text-red-500" />
      )}
      <span className={`text-xs font-medium ${
        hasFullAccess ? 'text-green-700' : 
        accessibleCount > 0 ? 'text-yellow-700' : 'text-red-700'
      }`}>
        {hasFullAccess ? 'Full Access' : 
         accessibleCount > 0 ? 'Partial Access' : 'No Access'}
      </span>
    </div>
  );
};

// Permission status indicator
export const PermissionIndicator = ({ 
  permission, 
  className = '',
  showText = true 
}) => {
  const getPermissionInfo = () => {
    switch (permission) {
      case 'read':
        return { icon: Eye, color: 'text-blue-500', text: 'Can View' };
      case 'write':
        return { icon: Unlock, color: 'text-green-500', text: 'Can Edit' };
      case 'admin':
        return { icon: Shield, color: 'text-purple-500', text: 'Full Access' };
      case 'none':
        return { icon: Lock, color: 'text-red-500', text: 'No Access' };
      default:
        return { icon: Info, color: 'text-gray-500', text: 'Unknown' };
    }
  };

  const permInfo = getPermissionInfo();

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      <permInfo.icon className={`w-4 h-4 ${permInfo.color}`} />
      {showText && (
        <span className={`text-xs font-medium ${permInfo.color}`}>
          {permInfo.text}
        </span>
      )}
    </div>
  );
};

// Current filter indicator
export const CurrentFilterIndicator = ({ className = '' }) => {
  const { currentYearFilter, getCurrentFilterDisplayText } = useYear();
  
  return (
    <div className={`
      inline-flex items-center space-x-2 px-3 py-1.5 rounded-full
      bg-blue-50 border border-blue-200 ${className}
    `}>
      <Eye className="w-4 h-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-800">
        Viewing: {getCurrentFilterDisplayText()}
      </span>
    </div>
  );
};

export default AccessIndicator;