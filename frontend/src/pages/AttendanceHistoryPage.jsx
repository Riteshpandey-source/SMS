import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getStudentAttendance } from '../services/attendanceApi';
import { getStoredSession } from '../utils/auth';

const AttendanceHistoryPage = () => {
  const session = getStoredSession();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setRows(await getStudentAttendance(session.user.id));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load attendance history');
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendance();
  }, [session.user.id]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Attendance History</p>
        <h2 className="mt-3 text-3xl font-semibold">Class-by-class record</h2>
        <p className="mt-2 max-w-2xl text-slate-300">
          Review your attendance history by date, subject, and marking faculty.
        </p>
      </section>

      <section className="panel">
        {isLoading ? (
          <p className="text-sm text-slate-300">Loading attendance history...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Faculty</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="px-4 py-4">{row.date?.slice(0, 10)}</td>
                    <td className="px-4 py-4">{row.subject_name}</td>
                    <td className="px-4 py-4 text-slate-300">{row.subject_code}</td>
                    <td className="px-4 py-4 text-slate-300">{row.faculty_name}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                          row.status === 'present' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-400/20 text-rose-300'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AttendanceHistoryPage;
