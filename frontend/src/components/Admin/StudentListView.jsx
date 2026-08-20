import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft,
  ChevronRight,
  Users,
  GraduationCap,
  Mail,
  Calendar,
  Search,
  User
} from 'lucide-react';
import { adminHierarchyService } from '../../services/adminHierarchyService';

const StudentListView = ({ faculty, students, groupedByYear, loading, onStudentSelect, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Filter students by search and year
  const filteredStudents = useMemo(() => {
    let result = students;

    // Apply search
    if (searchQuery) {
      result = adminHierarchyService.searchStudents(searchQuery, result);
    }

    // Apply year filter
    if (selectedYear) {
      result = result.filter(s => s.academicYear === parseInt(selectedYear));
    }

    return result;
  }, [students, searchQuery, selectedYear]);

  // Regroup filtered students by year
  const filteredGroupedByYear = useMemo(() => {
    const grouped = {};
    filteredStudents.forEach(student => {
      if (!grouped[student.academicYear]) {
        grouped[student.academicYear] = [];
      }
      grouped[student.academicYear].push(student);
    });
    return grouped;
  }, [filteredStudents]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedYear('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-20 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const deptColors = adminHierarchyService.getDepartmentColor(faculty.department);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Faculty List
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600">{faculty.name}</span>
      </div>

      {/* Faculty Info Header */}
      <div className={`bg-white rounded-lg border-2 ${deptColors.border} p-6`}>
        <div className="flex items-start gap-4">
          <div className={`${deptColors.bg} rounded-full p-4`}>
            <GraduationCap className={`w-8 h-8 ${deptColors.text}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{faculty.name}</h2>
            <div className="flex items-center gap-1 text-gray-600 mt-1">
              <Mail className="w-4 h-4" />
              <span>{faculty.email}</span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1 ${deptColors.bg} ${deptColors.text} rounded-full text-sm font-medium`}>
                {faculty.department}
              </span>
              {faculty.accessibleYears && faculty.accessibleYears.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">Accessible Years:</span>
                  {faculty.accessibleYears.sort().map(year => (
                    <span
                      key={year}
                      className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {year}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600">{students.length}</div>
            <div className="text-sm text-gray-600">Assigned Students</div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search students by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(searchQuery || selectedYear) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                Search: "{searchQuery}"
              </span>
            )}
            {selectedYear && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                Year {selectedYear}
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {students.length === 0 ? 'No Students Assigned' : 'No Students Found'}
          </h3>
          <p className="text-gray-600">
            {students.length === 0
              ? 'This faculty member has no assigned students yet'
              : 'Try adjusting your filters or search query'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredGroupedByYear)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([year, studentList]) => (
              <div key={year} className="space-y-3">
                {/* Year Header */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {adminHierarchyService.formatAcademicYear(parseInt(year))}
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({studentList.length} student{studentList.length !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Student Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {studentList.map(student => {
                    const studentDeptColors = adminHierarchyService.getDepartmentColor(student.department);
                    
                    return (
                      <button
                        key={student.id}
                        onClick={() => onStudentSelect(student)}
                        className={`bg-white rounded-lg border-2 ${studentDeptColors.border} p-4 hover:shadow-lg transition-all duration-200 text-left group`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Avatar */}
                            <div className={`${studentDeptColors.bg} rounded-full p-3 flex-shrink-0`}>
                              <User className={`w-6 h-6 ${studentDeptColors.text}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                                {student.name}
                              </h4>
                              <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{student.email}</span>
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                        </div>

                        {/* Department and Year */}
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`inline-block px-2 py-1 ${studentDeptColors.bg} ${studentDeptColors.text} rounded text-xs font-medium`}>
                            {student.department}
                          </span>
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {adminHierarchyService.formatAcademicYear(student.academicYear)}
                          </span>
                        </div>

                        {/* Assignment Date */}
                        {student.assignedAt && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-500">
                              Assigned: {new Date(student.assignedAt).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default StudentListView;
