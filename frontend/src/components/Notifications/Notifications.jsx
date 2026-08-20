import React, { useState } from 'react';
import { Bell, Check, Filter, Calendar, BookOpen, MessageSquare, Settings, GraduationCap } from 'lucide-react';
import { mockNotifications } from '../../data/mockData';
import { academicYears } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';

const Notifications = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(mockNotifications);

  const getIcon = (type) => {
    switch (type) {
      case 'event':
        return Calendar;
      case 'note':
        return BookOpen;
      case 'forum':
        return MessageSquare;
      case 'system':
        return Settings;
      default:
        return Bell;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'event':
        return 'text-blue-600 bg-blue-50';
      case 'note':
        return 'text-green-600 bg-green-50';
      case 'forum':
        return 'text-purple-600 bg-purple-50';
      case 'system':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  // Filter notifications based on user's year and department
  const relevantNotifications = notifications.filter(notification => {
    if (notification.isGlobal) return true;
    
    const matchesYear = !notification.targetYears || 
                       notification.targetYears.includes(user?.academicYear);
    
    const matchesDept = !notification.targetDepartments || 
                       notification.targetDepartments.includes(user?.department);
    
    return matchesYear && matchesDept;
  });

  const filteredNotifications = relevantNotifications.filter(notification => 
    filter === 'all' || 
    (filter === 'unread' && !notification.read) ||
    notification.type === filter
  );

  const unreadCount = relevantNotifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* User-specific Notifications Alert */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-900">Personalized Notifications</h3>
            <p className="text-sm text-orange-700">
              Showing notifications for {user?.department || 'your department'} students • {unreadCount} unread
            </p>
          </div>
        </div>
      </div>

      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Notifications ({relevantNotifications.length})</option>
            <option value="unread">Unread ({unreadCount})</option>
            <option value="event">Events</option>
            <option value="note">Notes</option>
            <option value="forum">Forum</option>
            <option value="system">System</option>
          </select>

          <button
            onClick={() => setFilter('unread')}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            My Notifications
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const Icon = getIcon(notification.type);
            const colorClasses = getTypeColor(notification.type);
            
            return (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all duration-200 ${
                  !notification.read ? 'ring-2 ring-blue-100 bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${colorClasses}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        
                        {/* Target Audience Info */}
                        {!notification.isGlobal && (notification.targetYears || notification.targetDepartments) && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {notification.targetYears && (
                              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                Years: {notification.targetYears.map(y => academicYears.find(ay => ay.value === y)?.label || y).join(', ')}
                              </span>
                            )}
                            {notification.targetDepartments && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                {notification.targetDepartments.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                        {notification.actionUrl && (
                          <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                            View →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "You're all caught up! No notifications to show."
                : `No ${filter} notifications found for your year and department.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
