import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, TrendingUp, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import dailyAttendanceService from '../../services/dailyAttendanceService';

const RegularAttendanceView = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      if (!user?._id) return;
      setLoading(true);
      try {
        const response = await dailyAttendanceService.getStudentAttendance(user._id, {
          academicYear: user.academicYear,
          department: user.department
        });
        setSummary(response.data?.attendanceSummary || []);
      } catch (error) {
        toast.error(error.response?.data?.error?.message || 'Failed to load subject attendance');
        setSummary([]);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [user]);

  const overall = useMemo(() => {
    const totalClasses = summary.reduce((sum, item) => sum + item.totalClasses, 0);
    const attendedClasses = summary.reduce((sum, item) => sum + item.attendedClasses, 0);
    const absentClasses = summary.reduce((sum, item) => sum + item.absentClasses, 0);
    const percentage = totalClasses ? Math.round((attendedClasses / totalClasses) * 10000) / 100 : 0;
    return { totalClasses, attendedClasses, absentClasses, percentage };
  }, [summary]);

  if (loading) {
    return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">Loading subject attendance...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">My Subject Attendance</h2>
        <p className="text-gray-600 mt-1">Subject-wise total classes, present, absent, and attendance percentage.</p>
      </div>

      {overall.percentage < 75 && overall.totalClasses > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Attendance warning</p>
            <p className="text-sm text-yellow-700">Your overall subject attendance is below 75%.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Overall %', value: `${overall.percentage}%`, icon: TrendingUp, color: 'bg-blue-500' },
          { title: 'Total Classes', value: overall.totalClasses, icon: BookOpen, color: 'bg-purple-500' },
          { title: 'Present', value: overall.attendedClasses, icon: UserCheck, color: 'bg-green-500' },
          { title: 'Absent', value: overall.absentClasses, icon: AlertCircle, color: 'bg-red-500' }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Subject-wise Summary</h3>
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
              {summary.map((item) => (
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
              {!summary.length && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No subject attendance available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RegularAttendanceView;
