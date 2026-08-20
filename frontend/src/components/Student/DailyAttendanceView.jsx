import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Calendar, Clock, MapPin, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import dailyAttendanceService from '../../services/dailyAttendanceService';

const DailyAttendanceView = () => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadAttendance = async () => {
      if (!user?._id) return;
      setLoading(true);
      try {
        const response = await dailyAttendanceService.getStudentAttendance(user._id, {
          startDate: new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0],
          endDate: new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0],
          academicYear: user.academicYear,
          department: user.department
        });

        setAttendanceRecords(response.data?.attendanceRecords || []);
        setAttendanceSummary(response.data?.attendanceSummary || []);
      } catch (error) {
        toast.error(error.response?.data?.error?.message || 'Failed to load your attendance');
        setAttendanceRecords([]);
        setAttendanceSummary([]);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [user, selectedMonth, selectedYear]);

  const overall = useMemo(() => {
    const totalClasses = attendanceSummary.reduce((sum, item) => sum + item.totalClasses, 0);
    const presentClasses = attendanceSummary.reduce((sum, item) => sum + item.attendedClasses, 0);
    const absentClasses = attendanceSummary.reduce((sum, item) => sum + item.absentClasses, 0);
    const percentage = totalClasses ? Math.round((presentClasses / totalClasses) * 10000) / 100 : 0;
    return { totalClasses, presentClasses, absentClasses, percentage };
  }, [attendanceSummary]);

  const getForecastMessage = () => {
    if (overall.totalClasses === 0) {
      return "No classes recorded yet. Maintain at least 75% attendance to remain exam-eligible.";
    }
    const targetPercentage = 75;
    const currentRate = overall.percentage;
    
    if (currentRate >= targetPercentage) {
      const maxMissed = Math.floor((overall.presentClasses - (targetPercentage / 100) * overall.totalClasses) / (targetPercentage / 100));
      if (maxMissed > 0) {
        return `At your current attendance rate (${currentRate.toFixed(1)}%), you can miss ${maxMissed} more class${maxMissed !== 1 ? 'es' : ''} and remain above the 75% eligibility threshold.`;
      } else {
        return `Your attendance is exactly at the 75% threshold. You cannot afford to miss any upcoming classes.`;
      }
    } else {
      const needed = Math.ceil(((targetPercentage / 100) * overall.totalClasses - overall.presentClasses) / (1 - targetPercentage / 100));
      return `Your attendance is currently below 75%. You need to attend the next ${needed} consecutive class${needed !== 1 ? 'es' : ''} to recover and cross the 75% threshold.`;
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">Loading your attendance...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">My Regular Attendance</h2>
        <p className="text-gray-600 mt-1">Only your own daily subject-wise attendance is shown here.</p>
      </div>

      {overall.percentage < 75 && overall.totalClasses > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Attendance below 75%</p>
            <p className="text-sm text-red-700">Please improve your attendance to avoid shortage issues.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))} className="w-full px-3 py-2 border rounded-lg">
              {months.map((month, index) => <option key={month} value={index}>{month}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))} className="w-full px-3 py-2 border rounded-lg">
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Attendance %', value: `${overall.percentage}%`, icon: TrendingUp, bgIcon: 'bg-green-50 text-green-600 border border-green-100' },
          { title: 'Total Classes', value: overall.totalClasses, icon: Calendar, bgIcon: 'bg-blue-50 text-blue-600 border border-blue-100' },
          { title: 'Present', value: overall.presentClasses, icon: BookOpen, bgIcon: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
          { title: 'Absent', value: overall.absentClasses, icon: AlertCircle, bgIcon: 'bg-red-50 text-red-600 border border-red-100' }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`${card.bgIcon} p-2.5 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Forecast Widget */}
      <div className="bg-gradient-to-r from-emerald-50/50 to-blue-50/50 border border-emerald-100/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="bg-[#059669] text-white p-2.5 rounded-xl border border-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">Attendance Forecast</h4>
            <p className="text-sm font-medium text-emerald-800 mt-1.5 leading-relaxed">
              {getForecastMessage()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Subject-wise Percentage</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Subject</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Present</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Absent</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attendanceSummary.map((item) => (
                <tr key={item.subjectCode}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.subjectCode}</div>
                    <div className="text-xs text-gray-500">{item.subjectName}</div>
                  </td>
                  <td className="px-4 py-3 text-center">{item.totalClasses}</td>
                  <td className="px-4 py-3 text-center text-green-700 font-medium">{item.attendedClasses}</td>
                  <td className="px-4 py-3 text-center text-red-700 font-medium">{item.absentClasses}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.attendancePercentage >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.attendancePercentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {!attendanceSummary.length && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No attendance summary available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Daily Attendance History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Subject</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Location</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attendanceRecords.map((session) => {
                const record = session.studentAttendance?.[0];
                return (
                  <tr key={session._id}>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(session.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{session.subjectCode}</div>
                      <div className="text-xs text-gray-500">{session.subjectName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {session.classStartTime} - {session.classEndTime}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {session.location || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${record?.isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {record?.isPresent ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!attendanceRecords.length && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No daily attendance records available for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyAttendanceView;
