import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ClipboardList, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import examMarksService from '../../services/examMarksService';
import toast from 'react-hot-toast';

const summaryFromMarks = (marks = []) => {
  if (!marks.length) return { avg: 0, best: 0, worst: 0 };
  const percentages = marks.map((m) => (m.maxMarks ? Math.round((m.obtainedMarks / m.maxMarks) * 10000) / 100 : 0));
  return {
    avg: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
    best: Math.max(...percentages),
    worst: Math.min(...percentages)
  };
};

const StudentExamMarksView = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await examMarksService.getStudentMarks(user._id);
      setMarks(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to load exam marks', error);
      toast.error(error.response?.data?.error?.message || 'Failed to load marks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) load();
  }, [user?._id]);

  const summary = useMemo(() => summaryFromMarks(marks), [marks]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Exam Marks</h2>
          <p className="text-gray-600">Subject-wise marks entered by your faculty.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Average %', value: `${summary.avg}%`, color: 'bg-blue-50', text: 'text-blue-700' },
          { title: 'Best %', value: `${summary.best}%`, color: 'bg-green-50', text: 'text-green-700' },
          { title: 'Lowest %', value: `${summary.worst}%`, color: 'bg-orange-50', text: 'text-orange-700' }
        ].map((card) => (
          <div key={card.title} className={`${card.color} rounded-xl p-4 border`}>
            <p className="text-sm text-gray-600">{card.title}</p>
            <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-semibold text-gray-900">Marks History</p>
            <p className="text-sm text-gray-600">Sorted by most recent exam date.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Subject</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Assessment</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Marks</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">% </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Faculty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {marks.map((m) => {
                const pct = m.maxMarks ? Math.round((m.obtainedMarks / m.maxMarks) * 10000) / 100 : 0;
                return (
                  <tr key={m._id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{m.subjectName}</div>
                      <div className="text-xs text-gray-500">{m.subjectCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{m.assessmentType}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(m.examDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {m.obtainedMarks}/{m.maxMarks}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{m.facultyId?.name || '—'}</td>
                  </tr>
                );
              })}
              {!marks.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No marks uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentExamMarksView;
