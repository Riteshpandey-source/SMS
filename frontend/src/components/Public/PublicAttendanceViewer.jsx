import { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, Clock, MapPin, Search, User, GraduationCap } from 'lucide-react';
import dailyAttendanceService from '../../services/dailyAttendanceService';
import toast from 'react-hot-toast';

const PublicAttendanceViewer = () => {
  const [step, setStep] = useState(1); // 1: Select Dept/Year, 2: Select Student, 3: View Attendance
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYearFilter, setSelectedYearFilter] = useState(new Date().getFullYear());
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const departments = [
    { code: 'CS', name: 'Computer Science' },
    { code: 'ECE', name: 'Electronics & Communication' },
    { code: 'ME', name: 'Mechanical Engineering' },
    { code: 'EE', name: 'Electrical Engineering' },
    { code: 'IT', name: 'Information Technology' },
    { code: 'CSAI', name: 'Computer Science & AI' },
    { code: 'AIDS', name: 'AI & Data Science' },
    { code: 'CIVIL', name: 'Civil Engineering' }
  ];

  const academicYears = [1, 2, 3, 4];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = [2023, 2024, 2025, 2026];

  // Step 1: Load students based on department and year
  const loadStudents = async () => {
    console.log('🔍 loadStudents called');
    console.log('🔍 selectedDepartment:', selectedDepartment);
    console.log('🔍 selectedYear:', selectedYear);
    
    if (!selectedDepartment || !selectedYear) {
      console.log('❌ Missing department or year');
      toast.error('Please select department and year');
      return;
    }

    console.log('✅ Starting API call...');
    setLoading(true);
    try {
      const filters = {
        department: selectedDepartment,
        academicYear: parseInt(selectedYear),
        startDate: '2026-03-01',
        endDate: '2026-03-31'
      };

      console.log('📊 Filters:', filters);

      const response = await dailyAttendanceService.getPublicDepartmentAttendance(filters);
      console.log('📊 Response:', response);
      
      const sessions = response.data?.attendanceRecords || [];
      console.log('📊 Sessions found:', sessions.length);

      // Extract unique students from all sessions
      const studentsMap = new Map();
      sessions.forEach(session => {
        session.studentAttendance?.forEach(att => {
          if (!studentsMap.has(att.studentName)) {
            studentsMap.set(att.studentName, {
              name: att.studentName,
              email: att.studentEmail,
              rollNumber: att.rollNumber,
              isGuest: att.isGuest || false
            });
          }
        });
      });

      const students = Array.from(studentsMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );

      console.log('👥 Students extracted:', students.length);
      console.log('👥 Student names:', students.map(s => s.name));

      setAvailableStudents(students);
      
      if (students.length > 0) {
        console.log('✅ Moving to step 2');
        setStep(2);
      } else {
        console.log('⚠️ No students found');
        toast.error('No students found for this department and year');
      }
    } catch (error) {
      console.error('❌ Failed to load students:', error);
      toast.error(`Failed to load students: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Load attendance for selected student
  const loadStudentAttendance = async (student) => {
    setSelectedStudent(student);
    setLoading(true);
    
    try {
      const filters = {
        startDate: new Date(selectedYearFilter, selectedMonth, 1).toISOString().split('T')[0],
        endDate: new Date(selectedYearFilter, selectedMonth + 1, 0).toISOString().split('T')[0],
        department: selectedDepartment,
        academicYear: selectedYear
      };

      const response = await dailyAttendanceService.getPublicDepartmentAttendance(filters);
      const sessions = response.data?.attendanceRecords || [];

      // Filter sessions that include this student
      const studentSessions = sessions.filter(session =>
        session.studentAttendance?.some(att => att.studentName === student.name)
      ).map(session => ({
        ...session,
        myAttendance: session.studentAttendance?.find(att => att.studentName === student.name)
      }));

      setAttendanceData(studentSessions);
      setStep(3);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Filter sessions by subject
  const filteredSessions = selectedSubject === 'all' 
    ? attendanceData 
    : attendanceData.filter(session => session.subjectCode === selectedSubject);

  // Get unique subjects
  const subjects = [...new Set(attendanceData.map(s => s.subjectCode))].map(code => {
    const session = attendanceData.find(s => s.subjectCode === code);
    return {
      code,
      name: session?.subjectName || code
    };
  });

  // Calculate statistics
  const totalClasses = filteredSessions.length;
  const attendedClasses = filteredSessions.filter(s => s.myAttendance?.isPresent).length;
  const absentClasses = totalClasses - attendedClasses;
  const attendancePercentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;

  const resetViewer = () => {
    setStep(1);
    setSelectedDepartment('');
    setSelectedYear('');
    setAvailableStudents([]);
    setSelectedStudent(null);
    setAttendanceData([]);
    setSelectedSubject('all');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Public Attendance Viewer</h1>
          </div>
          <p className="text-gray-600 text-lg">View your attendance without logging in</p>
        </div>

        {/* Step 1: Select Department and Year */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Details</h2>
              <p className="text-gray-600">Choose your department and academic year</p>
            </div>

            <div className="space-y-6">
              {/* Department Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Department
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {departments.map(dept => (
                    <button
                      key={dept.code}
                      onClick={() => setSelectedDepartment(dept.code)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedDepartment === dept.code
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold">{dept.code}</div>
                      <div className="text-xs mt-1">{dept.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Year Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Academic Year
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {academicYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedYear === year
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                      }`}
                    >
                      <div className="font-bold text-2xl">{year}</div>
                      <div className="text-xs mt-1">Year</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={loadStudents}
                disabled={!selectedDepartment || !selectedYear || loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Student */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Name</h2>
              <p className="text-gray-600">
                {selectedDepartment} Department - Year {selectedYear}
              </p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {availableStudents
                .filter(student => 
                  !searchTerm || student.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((student, index) => (
                <button
                  key={index}
                  onClick={() => loadStudentAttendance(student)}
                  disabled={loading}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left disabled:opacity-50"
                >
                  <div className="flex items-center">
                    <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                      <span className="text-indigo-600 font-bold text-lg">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900">{student.name}</div>
                        {student.isGuest && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            🎫 Guest
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                      {student.rollNumber && (
                        <div className="text-xs text-gray-400">{student.rollNumber}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Back Button */}
            <button
              onClick={resetViewer}
              className="mt-6 w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: View Attendance */}
        {step === 3 && selectedStudent && (
          <div className="space-y-6">
            {/* Student Info Header */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mr-4">
                    <span className="text-indigo-600 font-bold text-2xl">
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h2>
                    <p className="text-gray-600">
                      {selectedDepartment} Department - Year {selectedYear}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetViewer}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Change Student
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(parseInt(e.target.value));
                      loadStudentAttendance(selectedStudent);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => {
                      setSelectedYearFilter(parseInt(e.target.value));
                      loadStudentAttendance(selectedStudent);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Subjects</option>
                    {subjects.map(subject => (
                      <option key={subject.code} value={subject.code}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Classes</p>
                    <p className="text-2xl font-bold text-gray-900">{totalClasses}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Attended</p>
                    <p className="text-2xl font-bold text-green-600">{attendedClasses}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{absentClasses}</p>
                  </div>
                  <Users className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Percentage</p>
                    <p className={`text-2xl font-bold ${attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                      {attendancePercentage}%
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Attendance Sessions */}
            {filteredSessions.length > 0 ? (
              <div className="space-y-4">
                {filteredSessions.map((session, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className={`p-4 ${session.myAttendance?.isPresent ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {session.subjectCode} - {session.subjectName}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(session.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {session.classStartTime} - {session.classEndTime}
                            </span>
                            {session.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {session.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`px-6 py-3 rounded-lg font-bold text-lg ${
                          session.myAttendance?.isPresent 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {session.myAttendance?.isPresent ? 'PRESENT' : 'ABSENT'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Attendance Records</h3>
                <p className="text-gray-500">
                  No attendance found for {months[selectedMonth]} {selectedYearFilter}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicAttendanceViewer;
