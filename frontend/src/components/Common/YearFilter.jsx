import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, GraduationCap, Lock, Users } from 'lucide-react';
import { useYear } from '../../contexts/YearContext';

const YearFilter = ({ 
  className = '',
  size = 'medium',
  variant = 'default',
  showAllOption = true,
  disabled = false,
  placeholder = 'Select Year',
  onChange,
  label,
  showAccessIndicator = true,
  showStudentCount = false
}) => {
  const {
    accessibleYears,
    currentYearFilter,
    setYearFilter,
    getYearDisplayText,
    hasYearAccess,
    isStudent,
    isFaculty,
    isAdmin
  } = useYear();

  const [isOpen, setIsOpen] = useState(false);
  const [studentCounts, setStudentCounts] = useState({});
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch student counts if needed (placeholder - would integrate with API)
  useEffect(() => {
    if (showStudentCount && isFaculty) {
      setStudentCounts({});
    }
  }, [showStudentCount, isFaculty]);

  // Handle year selection
  const handleYearSelect = (year) => {
    const success = setYearFilter(year);
    if (success) {
      setIsOpen(false);
      if (onChange) {
        onChange(year);
      }
    }
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1.5 text-sm';
      case 'large':
        return 'px-4 py-3 text-base';
      default:
        return 'px-3 py-2 text-sm';
    }
  };

  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return 'border-2 border-gray-300 bg-white hover:border-indigo-500 focus:border-indigo-500';
      case 'filled':
        return 'bg-gray-100 border border-gray-200 hover:bg-gray-50 focus:bg-white focus:border-indigo-500';
      case 'minimal':
        return 'border-0 bg-transparent hover:bg-gray-50 focus:bg-gray-50';
      default:
        return 'border border-gray-300 bg-white hover:border-gray-400 focus:border-indigo-500';
    }
  };

  // Get current display text
  const getCurrentDisplayText = () => {
    if (currentYearFilter === 'all') {
      return showAllOption ? 'All Years' : placeholder;
    }
    return getYearDisplayText(currentYearFilter);
  };

  // Get year options
  const getYearOptions = () => {
    const options = [];
    
    // Add "All Years" option if enabled and user has multiple year access
    if (showAllOption && (accessibleYears.length > 1 || isAdmin)) {
      options.push({
        value: 'all',
        label: 'All Years',
        isAccessible: true,
        icon: Users,
        description: isAdmin ? 'All academic years' : `${accessibleYears.length} accessible years`
      });
    }

    // Add individual year options
    [1, 2, 3, 4].forEach(year => {
      const isAccessible = hasYearAccess(year);
      const studentCount = studentCounts[year];
      
      options.push({
        value: year.toString(),
        label: getYearDisplayText(year),
        isAccessible,
        icon: isAccessible ? GraduationCap : Lock,
        description: isAccessible 
          ? (showStudentCount && studentCount ? `${studentCount} students` : 'Accessible')
          : 'No access',
        studentCount
      });
    });

    return options;
  };

  const yearOptions = getYearOptions();

  // Don't render if user has no year access
  if (accessibleYears.length === 0 && !isAdmin) {
    return null;
  }

  // For students with single year, show read-only display
  if (isStudent) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className={`
          inline-flex items-center space-x-2 rounded-md bg-blue-50 border border-blue-200 
          ${getSizeClasses()} text-blue-800
        `}>
          <GraduationCap className="w-4 h-4" />
          <span className="font-medium">{getCurrentDisplayText()}</span>
          {showAccessIndicator && (
            <span className="text-xs text-blue-600">(Your Year)</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full cursor-pointer rounded-md shadow-sm
          ${getSizeClasses()}
          ${getVariantClasses()}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'}
          transition-colors duration-200
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-gray-500" />
            <span className="block truncate font-medium">
              {getCurrentDisplayText()}
            </span>
            {showAccessIndicator && currentYearFilter !== 'all' && (
              <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                ✓
              </span>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {yearOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => option.isAccessible && handleYearSelect(option.value)}
              disabled={!option.isAccessible}
              className={`
                relative w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                ${!option.isAccessible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${currentYearFilter === option.value ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'}
                transition-colors duration-150
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <option.icon 
                    className={`w-4 h-4 ${
                      option.isAccessible 
                        ? currentYearFilter === option.value 
                          ? 'text-indigo-600' 
                          : 'text-gray-500'
                        : 'text-red-400'
                    }`} 
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className={`text-xs ${
                        option.isAccessible ? 'text-gray-500' : 'text-red-500'
                      }`}>
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {showStudentCount && option.studentCount && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {option.studentCount}
                    </span>
                  )}
                  {currentYearFilter === option.value && (
                    <Check className="w-4 h-4 text-indigo-600" />
                  )}
                  {!option.isAccessible && showAccessIndicator && (
                    <Lock className="w-3 h-3 text-red-400" />
                  )}
                </div>
              </div>
            </button>
          ))}
          
          {/* Access Summary for Faculty */}
          {isFaculty && showAccessIndicator && (
            <div className="border-t border-gray-200 mt-2 pt-2 px-4 py-2">
              <div className="text-xs text-gray-600">
                <div className="font-medium mb-1">Your Access:</div>
                <div className="flex flex-wrap gap-1">
                  {accessibleYears.map(year => (
                    <span 
                      key={year}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                    >
                      {getYearDisplayText(year)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Compact version for use in toolbars
export const CompactYearFilter = ({ className = '', onChange }) => {
  return (
    <YearFilter
      className={className}
      size="small"
      variant="minimal"
      showAllOption={true}
      showAccessIndicator={false}
      onChange={onChange}
    />
  );
};

// Year filter with label for forms
export const LabeledYearFilter = ({ label, required = false, error, ...props }) => {
  return (
    <div className="space-y-1">
      <YearFilter
        label={
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        }
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// Multi-select year filter for creating content
export const MultiYearFilter = ({ 
  selectedYears = [], 
  onChange, 
  className = '',
  label = 'Target Years'
}) => {
  const { accessibleYears, getYearDisplayText, hasYearAccess } = useYear();

  const handleYearToggle = (year) => {
    if (!hasYearAccess(year)) return;
    
    const newSelection = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears, year].sort();
    
    onChange(newSelection);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(year => {
          const isAccessible = hasYearAccess(year);
          const isSelected = selectedYears.includes(year);
          
          return (
            <label
              key={year}
              className={`
                flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${isAccessible 
                  ? isSelected 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900' 
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                }
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleYearToggle(year)}
                disabled={!isAccessible}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="flex items-center space-x-2">
                {isAccessible ? (
                  <GraduationCap className="w-4 h-4 text-gray-500" />
                ) : (
                  <Lock className="w-4 h-4 text-red-400" />
                )}
                <span className="font-medium">{getYearDisplayText(year)}</span>
              </div>
            </label>
          );
        })}
      </div>
      
      {selectedYears.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <span className="font-medium">Selected:</span> {' '}
            {selectedYears.map(year => getYearDisplayText(year)).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default YearFilter;
