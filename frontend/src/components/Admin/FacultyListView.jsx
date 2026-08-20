import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter,
  ChevronRight,
  GraduationCap,
  Mail,
  Building2
} from 'lucide-react';
import { adminHierarchyService } from '../../services/adminHierarchyService';

const FacultyListView = ({ faculty, loading, onFacultySelect, filters, onFilterChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(filters?.department || '');
  const [selectedYear, setSelectedYear] = useState(filters?.year || '');

  // Get unique departments from faculty list
  const departments = useMemo(() => {
    const depts = [...new Set(faculty.map(f => f.department))];
    return depts.sort();
  }, [faculty]);

  // Filter and search faculty
  const filteredFaculty = useMemo(() => {
    let result = faculty;

    // Apply search
    if (searchQuery) {
      result = adminHierarchyService.searchFaculty(searchQuery, result);
    }

    // Apply department filter
    if (selectedDepartment) {
      result = result.filter(f => f.department === selectedDepartment);
    }

    // Apply year filter
    if (selectedYear) {
      result = result.filter(f => 
        f.accessibleYears && f.accessibleYears.includes(parseInt(selectedYear))
      );
    }

    return result;
  }, [faculty, searchQuery, selectedDepartment, selectedYear]);

  // Group faculty by department
  const groupedFaculty = useMemo(() => {
    const grouped = {};
    filteredFaculty.forEach(fac => {
      if (!grouped[fac.department]) {
        grouped[fac.department] = [];
      }
      grouped[fac.department].push(fac);
    });
    return grouped;
  }, [filteredFaculty]);

  const handleDepartmentChange = (dept) => {
    setSelectedDepartment(dept);
    onFilterChange?.({ department: dept, year: selectedYear });
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    onFilterChange?.({ department: selectedDepartment, year });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('');
    setSelectedYear('');
    onFilterChange?.({ department: '', year: '' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-40"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Faculty Directory</h2>
          <p className="text-gray-600 mt-1">
            {filteredFaculty.length} faculty member{filteredFaculty.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
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
        {(searchQuery || selectedDepartment || selectedYear) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                Search: "{searchQuery}"
              </span>
            )}
            {selectedDepartment && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                {selectedDepartment}
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

      {/* Faculty List */}
      {filteredFaculty.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Faculty Found</h3>
          <p className="text-gray-600">
            {searchQuery || selectedDepartment || selectedYear
              ? 'Try adjusting your filters or search query'
              : 'No faculty members available'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFaculty).map(([department, facultyList]) => {
            const deptColors = adminHierarchyService.getDepartmentColor(department);
            
            return (
              <div key={department} className="space-y-3">
                {/* Department Header */}
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">{department}</h3>
                  <span className="text-sm text-gray-500">
                    ({facultyList.length} member{facultyList.length !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Faculty Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {facultyList.map(fac => (
                    <button
                      key={fac.id}
                      onClick={() => onFacultySelect(fac)}
                      className={`bg-white rounded-lg border-2 ${deptColors.border} p-4 hover:shadow-lg transition-all duration-200 text-left group`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Avatar */}
                          <div className={`${deptColors.bg} rounded-full p-3 flex-shrink-0`}>
                            <GraduationCap className={`w-6 h-6 ${deptColors.text}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                              {fac.name}
                            </h4>
                            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{fac.email}</span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                      </div>

                      {/* Department Badge */}
                      <div className="mt-3">
                        <span className={`inline-block px-2 py-1 ${deptColors.bg} ${deptColors.text} rounded text-xs font-medium`}>
                          {fac.department}
                        </span>
                      </div>

                      {/* Accessible Years */}
                      {fac.accessibleYears && fac.accessibleYears.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {fac.accessibleYears.sort().map(year => (
                            <span
                              key={year}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              Year {year}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Student Count */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Assigned Students</span>
                          <span className={`font-semibold ${
                            fac.studentCount > 0 ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {fac.studentCount || 0}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FacultyListView;
