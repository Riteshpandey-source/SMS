import { useState } from 'react';
import { Calendar, Users, BookOpen, TrendingUp, TrendingDown, Search, User, GraduationCap, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const PublicRegularAttendanceViewer = () => {
  const [step, setStep] = useState(1); // 1: Select Dept/Year, 2: View All Students
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [studentsData, setStudentsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

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

  // Load students regular attendance data
  const loadRegularAttendance = async () => {
    if (!selectedDepartment || !selectedYear) {
      toast.error('Please select department and year');
      return;
    }

    setLoading(true);
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const url = `${baseURL}/academic/public/regular-attendance?department=${selectedDepartment}&academicYear=${selectedYear}`;
      
      console.log('🌐 Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Response:', data);
      
      if (data.success && data.data.students) {
        setStudentsData(data.data.students);
        setStep(2);
      } else {
        toast.error('No attendance data found');
      }
      
    } catch (error) {
      console.error('❌ Failed to load attendance:', error);
      toast.error(`Failed to load attendance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get unique subjects from all students
  const allSubjects = [...new Set(
    studentsData.flatMap(student => 
      student.attendance?.map(att => att.subjectCode) || []
    )
  )];

  // Filter students by search term
  const filteredStudents = studentsData.filter(student =>
    !searchTerm || student.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetViewer = () => {
    setStep(1);
    setSelectedDepartment('');
    setSelectedYear('');
    setStudentsData([]);
    setSelectedSubject('all');
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Public Regular Attendance Viewer</h1>
          </div>
          <p className="text-gray-600 text-lg">View regular attendance records without logging in</p>
        </div>

        {/* Step 1: Select Department and Year */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Department & Year</h2>
              <p className="text-gray-600">Choose department and academic year to view attendance</p>
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
                onClick={loadRegularAttendance}
                disabled={!selectedDepartment || !selectedYear || loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : 'View Attendance'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: View All Students Attendance */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Header with Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedDepartment} Department - Year {selectedYear}
                  </h2>
                  <p className="text-gray-600">Total Students: {filteredStudents.length}</p>
                </div>
                <button
                  onClick={resetViewer}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Change Selection
                </button>
              </div>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Subjects</option>
                  {allSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students List */}
            {filteredStudents.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredStudents.map((student, index) => {
                  const attendanceToShow = selectedSubject === 'all'
                    ? student.attendance
                    : student.attendance?.filter(att => att.subjectCode === selectedSubject);

                  return (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* Student Header */}
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">{student.studentName}</h3>
                              <p className="text-sm opacity-90">{student.studentEmail}</p>
                              {student.rollNumber && (
                                <p className="text-xs opacity-75">Roll: {student.rollNumber}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold">
                              {Math.round(student.overallAttendance || 0)}%
                            </div>
                            <div className="text-sm opacity-90">Overall</div>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Details */}
                      <div className="p-4">
                        {student.isDebarred && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center text-red-700">
                              <TrendingDown className="w-5 h-5 mr-2" />
                              <span className="font-semibold">Debarred in: {student.debarredSubjects?.join(', ')}</span>
                            </div>
                          </div>
                        )}

                        {attendanceToShow && attendanceToShow.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {attendanceToShow.map((att, attIndex) => (
                              <div
                                key={attIndex}
                                className={`p-4 rounded-lg border-2 ${
                                  att.isDebarred
                                    ? 'border-red-300 bg-red-50'
                                    : att.percentage >= 75
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-yellow-300 bg-yellow-50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-semibold text-gray-900">{att.subjectCode}</div>
                                  <div className={`text-2xl font-bold ${
                                    att.isDebarred
                                      ? 'text-red-600'
                                      : att.percentage >= 75
                                      ? 'text-green-600'
                                      : 'text-yellow-600'
                                  }`}>
                                    {Math.round(att.percentage || 0)}%
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">{att.subjectName}</div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>Attended: {att.attendedClasses}</span>
                                  <span>Total: {att.totalClasses}</span>
                                </div>
                                {att.isDebarred && (
                                  <div className="mt-2 text-xs text-red-600 font-semibold">
                                    ⚠️ Below {att.requiredPercentage}%
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No attendance records found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Found</h3>
                <p className="text-gray-500">
                  No attendance data available for {selectedDepartment} Year {selectedYear}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicRegularAttendanceViewer;