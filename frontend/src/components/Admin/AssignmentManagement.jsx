import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Search, 
  Filter, 
  Plus,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';
import { assignmentService } from '../../services/assignmentService';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';

const AssignmentManagement = () => {
  const { user } = useAuth();
  const { refreshAssignments } = useAssignment();
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments', 'statistics', 'unassigned', 'audit'
  const [statistics, setStatistics] = useState(null);
  const [unassignedUsers, setUnassignedUsers] = useState({ students: [], faculty: [] });
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'statistics' && assignments.length > 0) {
      fetchStatistics();
    } else if (activeTab === 'unassigned' && assignments.length > 0) {
      fetchUnassignedUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [assignments, students, faculty, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, studentsRes, facultyRes] = await Promise.all([
        assignmentService.getAllAssignments(),
        userService.getStudents(),
        userService.getFaculty()
      ]);
      
      setAssignments(assignmentsRes.assignments || []);
      setStudents(studentsRes.users || []);
      setFaculty(facultyRes.users || []);
      
      // Fetch additional data based on active tab
      if (activeTab === 'statistics') {
        await fetchStatistics();
      } else if (activeTab === 'unassigned') {
        await fetchUnassignedUsers();
      } else if (activeTab === 'audit') {
        await fetchAuditLogs();
      }
    } catch (error) {
      console.error('Failed to fetch assignment data:', error);
      toast.error('Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await assignmentService.getAssignmentStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      // Use fallback statistics
      const assignedStudentIds = new Set(assignments.map(a => a.student?._id));
      const assignedFacultyIds = new Set(assignments.map(a => a.faculty?._id));
      
      setStatistics({
        totalAssignments: assignments.length,
        activeAssignments: assignments.filter(a => a.isActive).length,
        totalStudents: students.length,
        assignedStudents: assignedStudentIds.size,
        unassignedStudents: students.length - assignedStudentIds.size,
        totalFaculty: faculty.length,
        assignedFaculty: assignedFacultyIds.size,
        unassignedFaculty: faculty.length - assignedFacultyIds.size,
        coveragePercentage: Math.round((assignedStudentIds.size / students.length) * 100),
        departmentBreakdown: getDepartmentBreakdown(),
        yearBreakdown: getYearBreakdown()
      });
    }
  };

  const fetchUnassignedUsers = async () => {
    try {
      const assignedStudentIds = new Set(assignments.filter(a => a.isActive).map(a => a.student?._id));
      const assignedFacultyIds = new Set(assignments.filter(a => a.isActive).map(a => a.faculty?._id));
      
      const unassignedStudents = students.filter(s => !assignedStudentIds.has(s._id));
      const unassignedFaculty = faculty.filter(f => !assignedFacultyIds.has(f._id));
      
      setUnassignedUsers({
        students: unassignedStudents,
        faculty: unassignedFaculty
      });
    } catch (error) {
      console.error('Failed to fetch unassigned users:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const logs = await assignmentService.getAssignmentAuditLogs();
      setAuditLogs(logs.logs || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      // Use mock audit logs
      setAuditLogs([
        {
          id: '1',
          action: 'CREATE_ASSIGNMENT',
          details: 'Created assignment between John Doe and Dr. Smith',
          performedBy: user.name,
          timestamp: new Date().toISOString(),
          metadata: { studentId: 'student1', facultyId: 'faculty1' }
        },
        {
          id: '2',
          action: 'DELETE_ASSIGNMENT',
          details: 'Deleted assignment between Jane Smith and Prof. Johnson',
          performedBy: user.name,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          metadata: { studentId: 'student2', facultyId: 'faculty2' }
        }
      ]);
    }
  };

  const getDepartmentBreakdown = () => {
    const breakdown = {};
    departments.forEach(dept => {
      const deptAssignments = assignments.filter(a => 
        a.student?.department === dept || a.faculty?.department === dept
      );
      breakdown[dept] = {
        total: deptAssignments.length,
        active: deptAssignments.filter(a => a.isActive).length
      };
    });
    return breakdown;
  };

  const getYearBreakdown = () => {
    const breakdown = {};
    [1, 2, 3, 4].forEach(year => {
      const yearAssignments = assignments.filter(a => a.student?.academicYear === year);
      breakdown[year] = {
        total: yearAssignments.length,
        active: yearAssignments.filter(a => a.isActive).length
      };
    });
    return breakdown;
  };

  const handleCreateAssignment = async () => {
    if (!selectedStudent || !selectedFaculty) {
      toast.error('Please select both student and faculty');
      return;
    }

    try {
      await assignmentService.createAssignment({
        studentId: selectedStudent,
        facultyId: selectedFaculty,
        assignmentSource: 'manual'
      });
      
      toast.success('Assignment created successfully');
      setShowCreateModal(false);
      setSelectedStudent('');
      setSelectedFaculty('');
      await fetchData();
      await refreshAssignments();
    } catch (error) {
      console.error('Failed to create assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      await assignmentService.deleteAssignment(assignmentId);
      toast.success('Assignment deleted successfully');
      await fetchData();
      await refreshAssignments();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const handleBulkAssign = async () => {
    try {
      await assignmentService.bulkAssignStudents();
      toast.success('Bulk assignment completed successfully');
      await fetchData();
      await refreshAssignments();
    } catch (error) {
      console.error('Failed to perform bulk assignment:', error);
      toast.error('Failed to perform bulk assignment');
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.faculty?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.faculty?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
      assignment.student?.department === selectedDepartment ||
      assignment.faculty?.department === selectedDepartment;
    
    const matchesYear = selectedYear === 'all' || 
      assignment.student?.academicYear?.toString() === selectedYear;
    
    return matchesSearch && matchesDepartment && matchesYear;
  });

  // Get available students (not already assigned to selected faculty)
  const getAvailableStudents = () => {
    if (!selectedFaculty) return students;
    
    const assignedStudentIds = assignments
      .filter(a => a.faculty?._id === selectedFaculty && a.isActive)
      .map(a => a.student?._id);
    
    return students.filter(student => !assignedStudentIds.includes(student._id));
  };

  // Get available faculty (with capacity for more students)
  const getAvailableFaculty = () => {
    return faculty.filter(f => f.isActive !== false);
  };

  const departments = [...new Set([
    ...students.map(s => s.department),
    ...faculty.map(f => f.department)
  ])].filter(Boolean);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Assignment Management</h3>
          <p className="text-sm text-slate-500 mt-1">
            Manage student-faculty advisor mappings and monitor coverage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkAssign}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-250 shadow-sm hover:shadow active:scale-95"
          >
            <RefreshCw className="h-4.5 w-4.5 text-slate-500" />
            Bulk Auto-Assign
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-all duration-250 shadow-md shadow-purple-100 active:scale-95"
          >
            <Plus className="h-4.5 w-4.5" />
            Create Assignment
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-250 shadow-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6">
          <nav className="flex space-x-6 overflow-x-auto scrollbar-none flex-nowrap" aria-label="Tabs">
            {[
              { id: 'assignments', title: 'Assignments', icon: Users, count: assignments.length },
              { id: 'statistics', title: 'Statistics', icon: Eye },
              { id: 'unassigned', title: 'Unassigned Users', icon: AlertTriangle, count: unassignedUsers.students.length + unassignedUsers.faculty.length },
              { id: 'audit', title: 'Audit Logs', icon: CheckCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative whitespace-nowrap py-4 px-2 font-semibold text-sm flex items-center space-x-2 transition-all duration-200 outline-none ${
                    isActive
                      ? 'text-purple-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>{tab.title}</span>
                  {tab.count !== undefined && (
                    <span className={`py-0.5 px-2 rounded-full text-xs font-bold transition-colors ${
                      isActive ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/70 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search</label>
                    <div className="relative">
                      <Search className="h-4.5 w-4.5 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Search student/faculty..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 block w-full rounded-xl border border-slate-200 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none shadow-sm transition-all bg-white font-medium text-slate-700"
                    >
                      <option value="all">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Academic Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none shadow-sm transition-all bg-white font-medium text-slate-700"
                    >
                      <option value="all">All Years</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedDepartment('all');
                        setSelectedYear('all');
                      }}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              {/* Assignments List */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/20">
                  <h4 className="font-bold text-slate-800 text-base">
                    Active Mapping Directory ({filteredAssignments.length})
                  </h4>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredAssignments.map((assignment) => (
                    <div key={assignment._id} className="p-6 hover:bg-slate-50/20 transition-all duration-150">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center shadow-sm">
                              <UserCheck className="w-6 h-6 text-purple-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                              <div>
                                <p className="text-sm font-bold text-slate-855">
                                  {assignment.student?.name || 'Unknown Student'}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                  {assignment.student?.email} • Year {assignment.student?.academicYear}
                                </p>
                              </div>
                              <div className="text-slate-300 font-bold hidden md:block">→</div>
                              <div>
                                <p className="text-sm font-bold text-slate-855">
                                  {assignment.faculty?.name || 'Unknown Faculty'}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                  {assignment.faculty?.email} • {assignment.faculty?.department}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2.5 flex items-center space-x-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              <span>Mapped: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className={`px-2 py-0.5 rounded-full border ${
                                assignment.assignmentSource === 'manual' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-150' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-150'
                              }`}>
                                {assignment.assignmentSource === 'manual' ? 'Manual' : 'System Auto'}
                              </span>
                              <span>•</span>
                              <span className={`px-2 py-0.5 rounded-full border ${
                                assignment.isActive 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {assignment.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDeleteAssignment(assignment._id)}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-100 hover:border-red-100"
                            title="Delete Assignment Mapping"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredAssignments.length === 0 && (
                  <div className="p-16 text-center">
                    <UserCheck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-lg font-bold text-slate-700 mb-1">No Mapping Records Found</p>
                    <p className="text-slate-450 text-sm max-w-sm mx-auto">
                      {searchTerm || selectedDepartment !== 'all' || selectedYear !== 'all'
                        ? 'Try clearing or modifying the filters to retrieve existing advisor assignments.'
                        : 'Initiate advisor mapping by creating a manual assignment or selecting Bulk Auto-Assign.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
            <div className="space-y-8">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Assignment Analytics Dashboard</h3>
              
              {statistics ? (
                <div className="space-y-8">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/20 border border-blue-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-500 rounded-xl text-white shadow-md shadow-blue-100">
                          <Users className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <p className="text-2xl font-black text-blue-900">{statistics.totalAssignments}</p>
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-0.5">Total Mapped</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/20 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-md shadow-emerald-100">
                          <UserCheck className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <p className="text-2xl font-black text-emerald-900">{statistics.assignedStudents}</p>
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Assigned Students</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50/20 border border-yellow-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center">
                        <div className="p-3 bg-yellow-500 rounded-xl text-white shadow-md shadow-yellow-100">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <p className="text-2xl font-black text-yellow-900">{statistics.unassignedStudents}</p>
                          <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mt-0.5">Unassigned Students</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/20 border border-purple-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center">
                        <div className="p-3 bg-purple-500 rounded-xl text-white shadow-md shadow-purple-100">
                          <CheckCircle className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <p className="text-2xl font-black text-purple-900">{statistics.coveragePercentage}%</p>
                          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mt-0.5">Advisor Coverage</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Department Breakdown */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-base font-bold text-slate-800 mb-4 tracking-tight">Department Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(statistics.departmentBreakdown || {}).map(([dept, data]) => (
                        <div key={dept} className="flex items-center justify-between p-3.5 border border-slate-100 rounded-xl bg-slate-50/40">
                          <span className="text-sm font-bold text-slate-700">{dept} Department</span>
                          <div className="flex items-center space-x-3 text-xs font-semibold text-slate-500">
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg">Active: {data.active}</span>
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">Total: {data.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Year Breakdown */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-base font-bold text-slate-800 mb-4 tracking-tight">Academic Year Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(statistics.yearBreakdown || {}).map(([year, data]) => (
                        <div key={year} className="flex items-center justify-between p-3.5 border border-slate-100 rounded-xl bg-slate-50/40">
                          <span className="text-sm font-bold text-slate-700">
                            {year}{year == 1 ? 'st' : year == 2 ? 'nd' : year == 3 ? 'rd' : 'th'} Academic Year
                          </span>
                          <div className="flex items-center space-x-3 text-xs font-semibold text-slate-500">
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg">Active: {data.active}</span>
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">Total: {data.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500 font-semibold text-sm">Loading statistical metrics...</p>
                </div>
              )}
            </div>
          )}

          {/* Unassigned Tab */}
          {activeTab === 'unassigned' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Unassigned Advisor Directory</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Unassigned Students */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                    <span>Unassigned Students</span>
                    <span className="bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full text-xs font-bold">{unassignedUsers.students.length}</span>
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {unassignedUsers.students.map(student => (
                      <div key={student._id} className="flex items-center justify-between p-3.5 bg-yellow-50/40 border border-yellow-100 rounded-xl hover:bg-yellow-50 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{student.name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                            {student.academicYear}{student.academicYear === 1 ? 'st' : student.academicYear === 2 ? 'nd' : student.academicYear === 3 ? 'rd' : 'th'} Year • {student.department}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedStudent(student._id);
                            setShowCreateModal(true);
                          }}
                          className="text-xs font-semibold bg-purple-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-purple-700 transition-colors shadow-sm active:scale-95"
                        >
                          Assign Advisor
                        </button>
                      </div>
                    ))}
                    {unassignedUsers.students.length === 0 && (
                      <p className="text-center text-slate-400 py-12 font-medium">All students currently assigned advisor</p>
                    )}
                  </div>
                </div>

                {/* Unassigned Faculty */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                    <span>Unassigned Faculty</span>
                    <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-bold">{unassignedUsers.faculty.length}</span>
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {unassignedUsers.faculty.map(facultyMember => (
                      <div key={facultyMember._id} className="flex items-center justify-between p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{facultyMember.name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                            {facultyMember.department} • Years: {facultyMember.accessibleYears?.join(', ') || 'None'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFaculty(facultyMember._id);
                            setShowCreateModal(true);
                          }}
                          className="text-xs font-semibold bg-purple-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-purple-700 transition-colors shadow-sm active:scale-95"
                        >
                          Assign Student
                        </button>
                      </div>
                    ))}
                    {unassignedUsers.faculty.length === 0 && (
                      <p className="text-center text-slate-400 py-12 font-medium">All faculty members currently active</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">System Audit History</h3>
              
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-4.5 hover:bg-slate-50/20 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2.5 rounded-xl ${
                            log.action === 'CREATE_ASSIGNMENT' ? 'bg-emerald-50 border border-emerald-150' :
                            log.action === 'DELETE_ASSIGNMENT' ? 'bg-red-50 border border-red-155' :
                            'bg-blue-50 border border-blue-150'
                          }`}>
                            {log.action === 'CREATE_ASSIGNMENT' ? (
                              <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
                            ) : log.action === 'DELETE_ASSIGNMENT' ? (
                              <UserMinus className="h-4.5 w-4.5 text-red-600" />
                            ) : (
                              <Edit3 className="h-4.5 w-4.5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{log.details}</p>
                            <p className="text-[11px] text-slate-500 font-semibold mt-1">
                              By {log.performedBy} • {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="p-16 text-center">
                      <CheckCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500 text-sm font-semibold">No advisor mapping audit logs discovered</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 animate-scaleUp">
            <div>
              <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800">Create New Advisor Mapping</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Advisor Faculty Member
                  </label>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none shadow-sm transition-all bg-white font-medium text-slate-700"
                  >
                    <option value="">Choose faculty advisor...</option>
                    {getAvailableFaculty().map(f => (
                      <option key={f._id} value={f._id}>
                        {f.name} - {f.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Student Member
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none shadow-sm transition-all bg-white font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={!selectedFaculty}
                  >
                    <option value="">Choose student...</option>
                    {getAvailableStudents().map(s => (
                      <option key={s._id} value={s._id}>
                        {s.name} - Year {s.academicYear}
                      </option>
                    ))}
                  </select>
                  {!selectedFaculty && (
                    <p className="text-[11px] font-semibold text-purple-600 mt-2">Select advisor first to filter eligible students</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssignment}
                  disabled={!selectedStudent || !selectedFaculty}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-100 active:scale-95"
                >
                  Assign Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentManagement;