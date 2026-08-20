import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StatCard from '../components/StatCard';
import { getStudentSummary } from '../services/attendanceApi';
import { getStoredSession } from '../utils/auth';

const StudentDashboard = () => {
  const session = getStoredSession();
  const [summary, setSummary] = useState({ overall: {}, subjects: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const result = await getStudentSummary(session.user.id);
        setSummary(result);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load attendance summary');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [session.user.id]);

  const percentage = Number(summary.overall?.attendance_percentage || 0);
  const lowAttendance = percentage > 0 && percentage < 75;

  const subjectRows = useMemo(() => summary.subjects || [], [summary.subjects]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Student Dashboard</p>
        <h2 className="mt-3 text-3xl font-semibold">Your attendance overview</h2>
        <p className="mt-2 max-w-2xl text-slate-300">
          Track subject-wise totals, attendance percentage, and class-by-class performance from one place.
        </p>
      </section>

      {lowAttendance ? (
        <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-amber-100">
          Attendance alert: your overall percentage is below 75%. Please improve attendance to stay on track.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Attendance %" value={`${percentage || 0}%`} hint="Overall percentage" />
        <StatCard label="Total Classes" value={summary.overall?.total_classes || 0} hint="All recorded sessions" tone="emerald" />
        <StatCard label="Present" value={summary.overall?.present_classes || 0} hint="Classes attended" tone="cyan" />
        <StatCard label="Absent" value={summary.overall?.absent_classes || 0} hint="Missed classes" tone="rose" />
      </section>

      <section className="panel">
        <h3 className="text-xl font-semibold">Subject-wise attendance</h3>
        <p className="mt-1 text-sm text-slate-300">Breakdown of attendance percentage for each subject.</p>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-300">Loading summary...</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Present</th>
                  <th className="px-4 py-3 font-medium">Absent</th>
                  <th className="px-4 py-3 font-medium">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((row) => (
                  <tr key={row.subject_id} className="border-b border-white/5">
                    <td className="px-4 py-4">{row.subject_name}</td>
                    <td className="px-4 py-4 text-slate-300">{row.subject_code}</td>
                    <td className="px-4 py-4">{row.total_classes}</td>
                    <td className="px-4 py-4">{row.present_classes}</td>
                    <td className="px-4 py-4">{row.absent_classes}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          Number(row.attendance_percentage) < 75
                            ? 'bg-amber-400/20 text-amber-300'
                            : 'bg-emerald-400/20 text-emerald-300'
                        }`}
                      >
                        {row.attendance_percentage || 0}%
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

export default StudentDashboard;
