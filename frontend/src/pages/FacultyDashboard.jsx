import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatCard from '../components/StatCard';
import { getFacultySubjects } from '../services/attendanceApi';

const FacultyDashboard = () => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setSubjects(await getFacultySubjects());
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load subjects');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubjects();
  }, []);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Faculty Dashboard</p>
          <h2 className="mt-3 text-3xl font-semibold">Manage daily class attendance</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Select a class and subject, fetch the student list, and submit attendance for the selected date without duplicates.
          </p>
        </div>
        <Link to="/faculty/mark-attendance" className="btn-primary inline-flex items-center justify-center">
          Open Mark Attendance
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Assigned Subjects" value={subjects.length} hint="Mapped to your faculty account" />
        <StatCard
          label="Unique Classes"
          value={new Set(subjects.map((subject) => subject.class_id)).size}
          hint="Active classroom groups"
          tone="emerald"
        />
        <StatCard label="Submission Rule" value="1/day" hint="Duplicate attendance is blocked" tone="amber" />
      </section>

      <section className="panel">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Subject Allocation</h3>
            <p className="mt-1 text-sm text-slate-300">These are the subjects available for attendance entry.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-300">Loading faculty subjects...</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {subjects.map((subject) => (
              <div key={subject.id} className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{subject.code}</p>
                <h4 className="mt-3 text-xl font-semibold">{subject.name}</h4>
                <p className="mt-2 text-sm text-slate-300">
                  {subject.class_name} Section {subject.section} • Semester {subject.semester}
                </p>
                <Link
                  to={`/faculty/mark-attendance?classId=${subject.class_id}&subjectId=${subject.id}`}
                  className="mt-5 inline-flex rounded-2xl border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
                >
                  Mark attendance
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FacultyDashboard;
