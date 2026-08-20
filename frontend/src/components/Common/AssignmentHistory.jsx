import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  UserPlus, 
  UserMinus, 
  RefreshCw, 
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';

const AssignmentHistory = ({ 
  variant = 'full', // 'full', 'compact', 'timeline'
  maxItems = 10,
  showFilters = true,
  className = ''
}) => {
  const { user } = useAuth();
  const { 
    assignedFaculty,
    assignedStudents,
    lastUpdated,
    loading
  } = useAssignment();

  const [historyItems, setHistoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Generate mock history data (in real app, this would come from API)
  useEffect(() => {
    const generateHistoryItems = () => {
      const items = [];
      const now = new Date();

      // Add current assignments as history items
      if (user?.role === 'student' && assignedFaculty) {
        assignedFaculty.forEach((assignment, index) => {
          items.push({
            id: `faculty-${assignment.faculty._id}`,
            type: 'faculty_assigned',
            title: 'Faculty Assigned',
            description: `${assignment.faculty.name} from ${assignment.faculty.department} was assigned to you`,
            timestamp: assignment.assignedAt ? new Date(assignment.assignedAt) : new Date(now - (index * 24 * 60 * 60 * 1000)),
            user: assignment.faculty,
            source: assignment.assignmentSource || 'automatic',
            metadata: {
              department: assignment.faculty.department,
              accessibleYears: assignment.faculty.accessibleYears
            }
          });
        });
      }

      if (user?.role === 'faculty' && assignedStudents) {
        assignedStudents.slice(0, 5).forEach((assignment, index) => {
          items.push({
            id: `student-${assignment.student._id}`,
            type: 'student_assigned',
            title: 'Student Assigned',
            description: `${assignment.student.name} (Year ${assignment.student.academicYear}) was assigned to you`,
            timestamp: assignment.assignedAt ? new Date(assignment.assignedAt) : new Date(now - (index * 12 * 60 * 60 * 1000)),
            user: assignment.student,
            source: assignment.assignmentSource || 'automatic',
            metadata: {
              academicYear: assignment.student.academicYear,
              department: assignment.student.department
            }
          });
        });
      }

      // Add some mock historical events
      const mockEvents = [
        {
          id: 'refresh-1',
          type: 'assignment_refresh',
          title: 'Assignments Refreshed',
          description: 'Assignment data was refreshed and updated',
          timestamp: new Date(now - 2 * 60 * 60 * 1000), // 2 hours ago
          source: 'manual',
          metadata: { trigger: 'user_action' }
        },
        {
          id: 'system-update-1',
          type: 'system_update',
          title: 'System Update',
          description: 'Assignment system was updated with new features',
          timestamp: new Date(now - 24 * 60 * 60 * 1000), // 1 day ago
          source: 'system',
          metadata: { version: '2.1.0' }
        }
      ];

      items.push(...mockEvents);

      // Sort by timestamp (newest first)
      return items.sort((a, b) => b.timestamp - a.timestamp);
    };

    if (user) {
      const items = generateHistoryItems();
      setHistoryItems(items);
    }
  }, [user, assignedFaculty, assignedStudents]);

  // Filter history items
  useEffect(() => {
    let filtered = historyItems;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Filter by date range
    if (selectedDateRange !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (selectedDateRange) {
        case '1day':
          cutoffDate = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case '7days':
          cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        filtered = filtered.filter(item => item.timestamp >= cutoffDate);
      }
    }

    // Limit items
    filtered = filtered.slice(0, maxItems);

    setFilteredItems(filtered);
  }, [historyItems, searchTerm, selectedType, selectedDateRange, maxItems]);

  // Toggle expanded item
  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Get item icon
  const getItemIcon = (type) => {
    switch (type) {
      case 'faculty_assigned':
      case 'student_assigned':
        return UserPlus;
      case 'faculty_unassigned':
      case 'student_unassigned':
        return UserMinus;
      case 'assignment_refresh':
        return RefreshCw;
      case 'system_update':
        return Info;
      default:
        return Clock;
    }
  };

  // Get item color
  const getItemColor = (type) => {
    switch (type) {
      case 'faculty_assigned':
      case 'student_assigned':
        return 'text-green-600 bg-green-100';
      case 'faculty_unassigned':
      case 'student_unassigned':
        return 'text-red-600 bg-red-100';
      case 'assignment_refresh':
        return 'text-blue-600 bg-blue-100';
      case 'system_update':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return timestamp.toLocaleDateString();
  };

  // Export history
  const exportHistory = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Title', 'Description', 'User', 'Source'],
      ...filteredItems.map(item => [
        item.timestamp.toISOString(),
        item.type,
        item.title,
        item.description,
        item.user?.name || 'System',
        item.source
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Recent Changes</h3>
          <span className="text-xs text-gray-500">{filteredItems.length} items</span>
        </div>
        <div className="space-y-1">
          {filteredItems.slice(0, 3).map((item) => {
            const Icon = getItemIcon(item.type);
            const colorClass = getItemColor(item.type);
            
            return (
              <div key={item.id} className="flex items-center space-x-2 text-sm">
                <Icon className={`h-3 w-3 ${colorClass.split(' ')[0]}`} />
                <span className="flex-1 truncate text-gray-700">{item.description}</span>
                <span className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Timeline variant
  if (variant === 'timeline') {
    return (
      <div className={`${className}`}>
        <div className="flow-root">
          <ul className="-mb-8">
            {filteredItems.map((item, index) => {
              const Icon = getItemIcon(item.type);
              const colorClass = getItemColor(item.type);
              const isLast = index === filteredItems.length - 1;
              
              return (
                <li key={item.id}>
                  <div className="relative pb-8">
                    {!isLast && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.title}</p>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                          <time>{formatTimestamp(item.timestamp)}</time>
                          {item.source && (
                            <span className="ml-2">• {item.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  // Full variant (default)
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Assignment History</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{filteredItems.length} items</span>
          <button
            onClick={exportHistory}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Export history"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="faculty_assigned">Faculty Assigned</option>
              <option value="student_assigned">Student Assigned</option>
              <option value="assignment_refresh">Refresh</option>
              <option value="system_update">System Update</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Time</option>
              <option value="1day">Last 24 Hours</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      )}

      {/* History Items */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No History Found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedType !== 'all' || selectedDateRange !== 'all'
                ? 'Try adjusting your filters to see more history.'
                : 'Assignment history will appear here as changes occur.'
              }
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = getItemIcon(item.type);
            const colorClass = getItemColor(item.type);
            const isExpanded = expandedItems.has(item.id);
            
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{formatTimestamp(item.timestamp)}</span>
                          <span>• {item.source}</span>
                          {item.user && <span>• {item.user.name}</span>}
                        </div>
                      </div>
                      {item.metadata && (
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && item.metadata && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Details:</h5>
                        <div className="space-y-1">
                          {Object.entries(item.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="text-gray-700">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AssignmentHistory;