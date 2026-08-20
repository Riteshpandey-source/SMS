import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Users, BookOpen, UserCheck, Award, TrendingUp } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StudentExamMarksView from '../Student/StudentExamMarksView';
import AttendanceCard from '../Academic/AttendanceCard';
import MarksCard from '../Academic/MarksCard';

const ParentDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicData, setAcademicData] = useState({
    loading: false,
    error: null,
    data: null,
    lastUpdated: null,
    isRefreshing: false
  });

  // Get user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Fetch child's academic performance data
  const fetchAcademicData = async (isRefresh = false) => {
    if (!user) return;

    setAcademicData(prev => ({
      ...prev,
      loading: !isRefresh,
      isRefreshing: isRefresh,
      error: null
    }));

    try {
      const token = localStorage.getItem('accessToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch child's performance data
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/parent/child/performance`,
        config
      );

      if (response.data.success) {
        setAcademicData({
          loading: false,
          isRefreshing: false,
          error: null,
          data: response.data.data,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to load academic data';
      setAcademicData(prev => ({
        ...prev,
        loading: false,
        isRefreshing: false,
        error: errorMessage
      }));
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAcademicData();
    }
  }, [user]);

  const refreshData = () => {
    fetchAcademicData(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const childData = academicData.data?.child;
  const performance = academicData.data?.performance;
  const attendance = academicData.data?.attendance || [];
  const marks = academicData.data?.marks || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 text-white p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black mb-2 text-white">
                Parent Operations Dashboard
              </h1>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Welcome back, {user?.name}
              </p>
              {childData && (
                <div className="mt-3 space-y-1">
                  <p className="text-white text-sm font-black">
                    Student: {childData.name}
                  </p>
                  <p className="text-[#c5a880] text-xs font-bold uppercase tracking-wider">
                    {childData.department} Department • Academic Year {childData.academicYear}
                  </p>
                </div>
              )}
            </div>
            <div className="text-right">
              {academicData.lastUpdated && (
                <div className="text-slate-400 text-xs mb-2">
                  <p>Last updated:</p>
                  <p>{new Date(academicData.lastUpdated).toLocaleString()}</p>
                </div>
              )}
              {!academicData.loading && (
                <button
                  onClick={refreshData}
                  disabled={academicData.isRefreshing}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    academicData.isRefreshing 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-[#c5a880] hover:bg-[#b89650] text-[#0a0e1a]'
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${academicData.isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{academicData.isRefreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(academicData.loading || academicData.isRefreshing) && (
          <div className="space-y-4">
            {academicData.isRefreshing && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 text-blue-500 animate-spin mr-3" />
                  <div>
                    <h3 className="text-xs font-black text-blue-800 uppercase tracking-wider">Refreshing Academic Data</h3>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5">Getting the latest information from the university registrar...</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {academicData.error && !academicData.loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                <p className="text-sm text-red-700 mt-1">{academicData.error}</p>
                <button
                  onClick={refreshData}
                  className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
                >
                  Try Again →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Academic Overview Cards */}
        {!academicData.loading && !academicData.error && performance && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Attendance Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <UserCheck className="h-5 w-5 text-blue-500 mr-2" />
                      <h3 className="text-sm font-medium text-gray-600">Overall Attendance</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      {performance.overallAttendance.toFixed(1)}%
                    </p>
                    <p className={`text-sm ${
                      performance.overallAttendance >= 75 
                        ? 'text-green-600' 
                        : performance.overallAttendance >= 60 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                    }`}>
                      {performance.overallAttendance >= 75 
                        ? '✓ Good attendance' 
                        : performance.overallAttendance >= 60 
                        ? '⚠ Below recommended' 
                        : '✗ Critical - Below 75%'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    performance.overallAttendance >= 75 
                      ? 'bg-green-100' 
                      : performance.overallAttendance >= 60 
                      ? 'bg-yellow-100' 
                      : 'bg-red-100'
                  }`}>
                    <UserCheck className={`w-6 h-6 ${
                      performance.overallAttendance >= 75 
                        ? 'text-green-600' 
                        : performance.overallAttendance >= 60 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Average Marks Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Award className="h-5 w-5 text-[#c5a880] mr-2" />
                      <h3 className="text-sm font-medium text-gray-600">Average Marks</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-800 mb-1">
                      {performance.averageMarks.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      {performance.totalMarks} subject{performance.totalMarks !== 1 ? 's' : ''} Record
                    </p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <Award className="w-6 h-6 text-[#c5a880]" />
                  </div>
                </div>
              </div>

              {/* Exam Eligibility Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
                      <h3 className="text-sm font-medium text-gray-600">Exam Status</h3>
                    </div>
                    <p className={`text-2xl font-bold mb-1 ${
                      performance.isDebarred ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {performance.isDebarred ? 'Debarred' : 'Eligible'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {performance.isDebarred 
                        ? `${performance.debarredSubjects.length} subject${performance.debarredSubjects.length !== 1 ? 's' : ''}`
                        : 'All subjects cleared'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    performance.isDebarred ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    <AlertCircle className={`w-6 h-6 ${
                      performance.isDebarred ? 'text-red-600' : 'text-green-600'
                    }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Debarment Alert */}
            {performance.isDebarred && performance.debarredSubjects.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">Debarment Alert</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Your child is debarred from {performance.debarredSubjects.length} subject{performance.debarredSubjects.length !== 1 ? 's' : ''} due to low attendance.
                    </p>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {performance.debarredSubjects.map((subject, index) => (
                        <li key={index}>{subject}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Subject-wise Attendance */}
            {attendance.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <Users className="h-5 w-5 text-blue-500 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Subject-wise Attendance</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {attendance.map((subject, index) => (
                    <AttendanceCard 
                      key={index}
                      attendance={{
                        ...subject,
                        // Ensure percentage is calculated even if backend omits it
                        percentage: subject?.percentage ?? (
                          subject?.totalClasses
                            ? (subject.attendedClasses / subject.totalClasses) * 100
                            : 0
                        ),
                        lastUpdated: subject?.lastUpdated || new Date().toISOString()
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Subject-wise Marks */}
            {marks.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Subject-wise Marks</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {marks.map((subject, index) => (
                    <MarksCard 
                      key={index}
                      mark={{
                        ...subject,
                        examDate: new Date().toISOString()
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Grade Distribution */}
            {performance.gradeDistribution && Object.keys(performance.gradeDistribution).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="h-5 w-5 text-indigo-500 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Grade Distribution</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(performance.gradeDistribution).map(([grade, count]) => (
                    <div key={grade} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-sm text-gray-600">Grade {grade}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* No Data State */}
        {!academicData.loading && !academicData.error && !performance && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No Academic Data Available</h3>
            <p className="text-sm text-yellow-700">
              Academic data for your child is not yet available. Please check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
