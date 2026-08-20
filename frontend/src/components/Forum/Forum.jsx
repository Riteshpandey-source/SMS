import React, { useState } from 'react';
import { Plus, Filter, Search, TrendingUp, Clock, CheckCircle, GraduationCap, Building, Users } from 'lucide-react';
import QuestionCard from './QuestionCard';
import AssignmentIndicator from '../Common/AssignmentIndicator';
import AssignmentStatus from '../Common/AssignmentStatus';
import { mockQuestions } from '../../data/mockData';
import { departments, academicYears } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignment } from '../../contexts/AssignmentContext';

const Forum = () => {
  const { user } = useAuth();
  const {
    assignedFaculty,
    assignedStudents,
    hasAssignedFaculty,
    hasAssignedStudents,
    loading: assignmentLoading
  } = useAssignment();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all', 'assigned', 'unassigned'

  const sortOptions = [
    { value: 'recent', label: 'Most Recent', icon: Clock },
    { value: 'votes', label: 'Most Votes', icon: TrendingUp },
    { value: 'solved', label: 'Solved First', icon: CheckCircle }
  ];

  const filterOptions = ['all', 'solved', 'unsolved'];

  const filteredQuestions = mockQuestions
    .filter(question => {
      const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           question.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterBy === 'all' || 
                           (filterBy === 'solved' && question.solved) ||
                           (filterBy === 'unsolved' && !question.solved);

      const matchesYear = yearFilter === 'all' || 
                         !question.academicYear || 
                         question.academicYear.toString() === yearFilter;

      const matchesDept = deptFilter === 'all' || 
                         !question.department || 
                         question.department === deptFilter;

      // Assignment-based filtering
      let matchesAssignment = true;
      if (assignmentFilter === 'assigned') {
        if (user?.role === 'student' && hasAssignedFaculty()) {
          // Students: show questions from assigned faculty
          const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
          matchesAssignment = assignedFacultyIds.includes(question.author?.id) || 
                             assignedFacultyIds.includes(question.authorId) ||
                             (question.author?.role === 'faculty' && question.department === user.department);
        } else if (user?.role === 'faculty' && hasAssignedStudents()) {
          // Faculty: show questions from assigned students
          const assignedStudentIds = assignedStudents.map(a => a.student.id || a.student._id);
          matchesAssignment = assignedStudentIds.includes(question.author?.id) || 
                             assignedStudentIds.includes(question.authorId) ||
                             (question.author?.role === 'student' && question.academicYear && user.accessibleYears?.includes(question.academicYear));
        }
      } else if (assignmentFilter === 'unassigned') {
        if (user?.role === 'student' && hasAssignedFaculty()) {
          // Students: show questions NOT from assigned faculty
          const assignedFacultyIds = assignedFaculty.map(a => a.faculty.id || a.faculty._id);
          matchesAssignment = !assignedFacultyIds.includes(question.author?.id) && 
                             !assignedFacultyIds.includes(question.authorId);
        } else if (user?.role === 'faculty' && hasAssignedStudents()) {
          // Faculty: show questions NOT from assigned students
          const assignedStudentIds = assignedStudents.map(a => a.student.id || a.student._id);
          matchesAssignment = !assignedStudentIds.includes(question.author?.id) && 
                             !assignedStudentIds.includes(question.authorId);
        }
      }
      
      return matchesSearch && matchesFilter && matchesYear && matchesDept && matchesAssignment;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return b.votes - a.votes;
        case 'solved':
          return (b.solved ? 1 : 0) - (a.solved ? 1 : 0);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Get questions relevant to current user
  const myQuestions = mockQuestions.filter(question => 
    question.academicYear === user?.academicYear && 
    question.department === user?.department
  );

  return (
    <div className="space-y-6">
      {/* Assignment Status */}
      {(user?.role === 'student' || user?.role === 'faculty') && (
        <AssignmentStatus variant="compact" showRefresh={true} />
      )}

      {/* User-specific Questions Alert */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-900">Forum Discussion</h3>
              <p className="text-sm text-purple-700">
                {myQuestions.length} questions from your level • {mockQuestions.length} total questions
              </p>
              <div className="flex items-center space-x-4 mt-1 text-xs text-purple-600">
                {user?.role === 'student' && (
                  <span>• {hasAssignedFaculty() ? `${assignedFaculty.length} faculty assigned` : 'No faculty assigned'}</span>
                )}
                {user?.role === 'faculty' && (
                  <span>• {hasAssignedStudents() ? `${assignedStudents.length} students assigned` : 'No students assigned'}</span>
                )}
              </div>
            </div>
          </div>
          <AssignmentIndicator variant="badge" size="medium" />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select 
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {filterOptions.map(filter => (
                  <option key={filter} value={filter}>
                    {filter?.charAt(0)?.toUpperCase() + filter?.slice(1) || filter}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
              <select 
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Years</option>
                {academicYears.map(year => (
                  <option key={year.value} value={year.value.toString()}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select 
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.code} value={dept.code}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Filter (Students and Faculty only) */}
            {(user?.role === 'student' || user?.role === 'faculty') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Filter
                  <AssignmentIndicator variant="badge" size="small" className="ml-2 inline-block" />
                </label>
                <select 
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Questions</option>
                  <option value="assigned">
                    From Assigned {user?.role === 'student' ? 'Faculty' : 'Students'}
                  </option>
                  <option value="unassigned">
                    From Other {user?.role === 'student' ? 'Faculty' : 'Students'}
                  </option>
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  {user?.role === 'student' && hasAssignedFaculty() && `${assignedFaculty.length} faculty assigned`}
                  {user?.role === 'faculty' && hasAssignedStudents() && `${assignedStudents.length} students assigned`}
                  {((user?.role === 'student' && !hasAssignedFaculty()) || (user?.role === 'faculty' && !hasAssignedStudents())) && 'No assignments yet'}
                </div>
              </div>
            )}

            <div className="flex items-end">
              <button 
                onClick={() => {
                  setFilterBy('all');
                  setYearFilter(user?.academicYear?.toString() || 'all');
                  setDeptFilter(user?.department || 'all');
                  setAssignmentFilter('all');
                  setSearchTerm('');
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                My Level
              </button>
            </div>
            
            <div className="flex items-end">
              <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center">
                <Plus className="w-4 h-4 mr-2" />
                Ask Question
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{mockQuestions.length}</p>
          <p className="text-sm text-gray-600">Total Questions</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">
            {mockQuestions.filter(q => q.solved).length}
          </p>
          <p className="text-sm text-gray-600">Solved</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-orange-600">
            {mockQuestions.filter(q => !q.solved).length}
          </p>
          <p className="text-sm text-gray-600">Open</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">
            {mockQuestions.reduce((sum, q) => sum + q.answers.length, 0)}
          </p>
          <p className="text-sm text-gray-600">Total Answers</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-indigo-600">{myQuestions.length}</p>
          <p className="text-sm text-gray-600">Your Level</p>
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length > 0 ? (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Plus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
          <p className="text-gray-600">No questions match your search criteria. Be the first to ask a question!</p>
          <button className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Ask First Question
          </button>
        </div>
      )}
    </div>
  );
};

export default Forum;
