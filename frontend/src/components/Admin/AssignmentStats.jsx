import React from 'react';
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  BookOpen,
  GraduationCap
} from 'lucide-react';

const AssignmentStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // BULLETPROOF validation - catch ALL invalid data types
  if (!stats || 
      Array.isArray(stats) || 
      stats._id || 
      stats.email || 
      stats.name || 
      stats.department || 
      stats.academicYear ||
      typeof stats !== 'object' ||
      stats === null) {
    console.warn('⚠️ Invalid stats object received:', {
      type: Array.isArray(stats) ? 'Array' : typeof stats,
      isArray: Array.isArray(stats),
      hasId: !!stats?._id,
      hasEmail: !!stats?.email,
      hasName: !!stats?.name,
      stats: stats
    });
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">No Statistics Available</p>
        <p className="text-gray-600">Assignment statistics will appear here once data is loaded.</p>
        <p className="text-xs text-gray-500 mt-2">Received invalid data format</p>
      </div>
    );
  }

  const departmentStats = stats.departmentBreakdown || {};
  const yearStats = stats.yearBreakdown || {};
  
  console.log('📊 AssignmentStats data:', { 
    statsType: typeof stats,
    hasId: !!stats._id,
    hasDepartmentStats: Object.keys(departmentStats).length > 0,
    hasYearStats: Object.keys(yearStats).length > 0,
    departmentKeys: Object.keys(departmentStats),
    sampleDeptData: departmentStats[Object.keys(departmentStats)[0]]
  });

  return (
    <div className="space-y-6">
      {/* Assignment Overview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Assignments</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalAssignments || 0}</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-lg">
                <UserCheck className="w-6 h-6 text-blue-700" />
              </div>
            </div>
            <div className="mt-3 text-sm text-blue-700">
              Active student-faculty relationships
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Coverage Rate</p>
                <p className="text-2xl font-bold text-green-900">{stats.coveragePercentage || 0}%</p>
              </div>
              <div className="bg-green-200 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-700" />
              </div>
            </div>
            <div className="mt-3 text-sm text-green-700">
              Students with assigned faculty
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Avg Students/Faculty</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.averageStudentsPerFaculty || 0}</p>
              </div>
              <div className="bg-yellow-200 p-3 rounded-lg">
                <Users className="w-6 h-6 text-yellow-700" />
              </div>
            </div>
            <div className="mt-3 text-sm text-yellow-700">
              Faculty workload distribution
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Breakdown</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">Assignment Distribution by Department</span>
            </div>
          </div>
          <div className="p-6">
            {Object.keys(departmentStats).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(departmentStats).map(([dept, data]) => {
                  // Safety check: ensure data is an object with expected properties
                  // Skip if data is a user object (has _id, email, etc.) or invalid
                  if (typeof data !== 'object' || data === null || data._id || data.email || data.name) {
                    console.warn('Skipping invalid department data:', dept, data);
                    return null;
                  }
                  
                  // Ensure we have valid numeric data
                  const students = typeof data.students === 'number' ? data.students : 0;
                  const faculty = typeof data.faculty === 'number' ? data.faculty : 0;
                  const assignments = typeof data.assignments === 'number' ? data.assignments : 0;
                  
                  return (
                    <div key={dept} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{dept}</p>
                          <p className="text-sm text-gray-600">
                            {students} students, {faculty} faculty
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {assignments}
                        </p>
                        <p className="text-sm text-gray-600">assignments</p>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            ) : (
              <div className="text-center py-8">
                <PieChart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No department data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Year Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Year Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(year => {
            const rawYearData = yearStats[year] || {};
            
            // Ensure all values are numbers, not objects
            const students = typeof rawYearData.students === 'number' ? rawYearData.students : 0;
            const assigned = typeof rawYearData.assigned === 'number' ? rawYearData.assigned : 0;
            const coverage = typeof rawYearData.coverage === 'number' ? rawYearData.coverage : 0;
            
            const coverageColor = coverage >= 80 
              ? 'text-green-600 bg-green-50 border-green-200' 
              : coverage >= 60 
                ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                : 'text-red-600 bg-red-50 border-red-200';
            
            return (
              <div key={year} className={`rounded-lg p-4 border ${coverageColor}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</h4>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Students:</span>
                    <span className="font-medium">{students}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned:</span>
                    <span className="font-medium">{assigned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coverage:</span>
                    <span className="font-medium">{coverage}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Assignment Activity</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">Latest Changes</span>
            </div>
          </div>
          <div className="p-6">
            {stats.recentActivity && Array.isArray(stats.recentActivity) && stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 5).map((activity, index) => {
                  // Skip if activity is a user object
                  if (!activity || activity._id || activity.email || activity.name) {
                    return null;
                  }
                  
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {typeof activity === 'string' ? activity : (activity.description || 'Activity')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {typeof activity.timestamp === 'string' ? activity.timestamp : new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-100 p-2 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Assignment Health</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Assignments:</span>
                <span className="font-medium text-green-600">{stats.activeAssignments || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inactive Assignments:</span>
                <span className="font-medium text-red-600">{stats.inactiveAssignments || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">User Distribution</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Students:</span>
                <span className="font-medium text-blue-600">{stats.totalStudents || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Faculty:</span>
                <span className="font-medium text-blue-600">{stats.totalFaculty || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Attention Needed</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Unassigned Students:</span>
                <span className="font-medium text-red-600">{stats.unassignedStudents || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inactive Faculty:</span>
                <span className="font-medium text-yellow-600">{stats.inactiveFaculty || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentStats;