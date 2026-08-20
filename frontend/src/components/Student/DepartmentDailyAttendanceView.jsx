import { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, Clock, MapPin, Search, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import dailyAttendanceService from '../../services/dailyAttendanceService';
import toast from 'react-hot-toast';

const DepartmentDailyAttendanceView = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalStudents: 0,
    subjects: []
  });

  // Load department daily attendance data
  const loadAttendanceData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const filters = {
        startDate: new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0],
        endDate: new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0],
        department: user.department,
        academicYear: user.academicYear // Filter by same year as logged-in student
      };

      console.log('🔍 Loading department daily attendance (same year) with filters:', filters);
      
      const response = await dailyAttendanceService.getDepartmentAttendance(filters);
      console.log('📊 Department daily attendance response:', response);
      
      const sessions = response.data?.attendanceRecords || [];
      setAttendanceData(sessions);
      
      // Calculate stats
      const uniqueSubjects = [...new Set(sessions.map(s => s.subjectCode))];
      const uniqueStudents = new Set();
      sessions.forEach(session => {
        session.studentAttendance?.forEach(att => {
          uniqueStudents.add(att.studentName);
        });
      });

      setStats({
        totalSessions: sessions.length,
        totalStudents: uniqueStudents.size,
        subjects: uniqueSubjects.map(code => {
          const subjectSessions = sessions.filter(s => s.subjectCode === code);
          return {
            code,
            name: subjectSessions[0]?.subjectName || code,
            sessions: subjectSessions.length
          };
        })
      });

    } catch (error) {
      console.error('❌ Failed to load department daily attendance:', error);
      toast.error(`Failed to load attendance data: ${error.message}`);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [user, selectedMonth, selectedYear]);

  // Filter sessions by subject
  const filteredSessions = selectedSubject === 'all' 
    ? attendanceData 
    : attendanceData.filter(session => session.subjectCode === selectedSubject);

  // Filter by search term
  const searchFilteredSessions = searchTerm
    ? filteredSessions.filter(session =>
        session.studentAttendance?.some(att =>
          att.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : filteredSessions;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2023, 2024, 2025, 2026];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Department Daily Attendance</h1>
        <p className="text-gray-600">
          View daily attendance sessions for all students in {user?.department} department, Year {user?.academicYear}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Month Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              {stats.subjects.map(subject => (
                <option key={subject.code} value={subject.code}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Student name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.subjects.length}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {searchFilteredSessions.length > 0 ? (
        <div className="space-y-4">
          {searchFilteredSessions.map((session, index) => (
            <div key={session._id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Session Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{session.subjectCode} - {session.subjectName}</h3>
                    <div className="flex items-center gap-4 text-sm text-blue-100 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      {session.classStartTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {session.classStartTime} - {session.classEndTime}
                        </span>
                      )}
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {session.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-100">Students</p>
                    <p className="text-2xl font-bold">{session.studentAttendance?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Students Attendance */}
              <div className="p-4">
                {session.studentAttendance && session.studentAttendance.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {session.studentAttendance
                      .filter(att => !searchTerm || att.studentName?.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((attendance, attIndex) => (
                      <div 
                        key={attIndex} 
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          attendance.isPresent 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                            attendance.isPresent 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {attendance.studentName?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{attendance.studentName}</p>
                            <p className="text-xs text-gray-500">
                              {attendance.isPresent ? 'Present' : 'Absent'}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          attendance.isPresent 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {attendance.isPresent ? 'P' : 'A'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No students recorded for this session</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sessions Found</h3>
          <p className="text-gray-500">
            {searchTerm 
              ? `No sessions found matching "${searchTerm}"` 
              : `No daily attendance sessions for ${months[selectedMonth]} ${selectedYear}`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default DepartmentDailyAttendanceView;
