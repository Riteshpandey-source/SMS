import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getFacultySubjects, getStudentsByClass, submitAttendance } from '../services/attendanceApi';

const formatToday = () => new Date().toISOString().split('T')[0];

const MarkAttendancePage = () => {
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(searchParams.get('subjectId') || '');
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get('classId') || '');
  const [selectedDate, setSelectedDate] = useState(formatToday());
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const result = await getFacultySubjects();
        setSubjects(result);

        if (!selectedSubjectId && result[0]) {
          setSelectedSubjectId(String(result[0].id));
          setSelectedClassId(String(result[0].class_id));
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load subjects');
      }
    };

    loadSubjects();
  }, []);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => String(subject.id) === String(selectedSubjectId)),
    [selectedSubjectId, subjects]
  );

  useEffect(() => {
    if (!selectedSubject) {
      return;
    }

    setSelectedClassId(String(selectedSubject.class_id));

    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const result = await getStudentsByClass({
          classId: selectedSubject.class_id,
          subjectId: selectedSubject.id
        });
        setStudents(result);
        setAttendanceMap(
          result.reduce((accumulator, student) => {
            accumulator[student.id] = 'present';
            return accumulator;
          }, {})
        );
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load students');
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [selectedSubject]);

  const handleSubmit = async () => {
    if (!selectedSubject || !students.length) {
      toast.error('Select a valid subject with students first');
      return;
    }

    setSubmitting(true);

    try {
      await submitAttendance({
        classId: Number(selectedClassId),
        subjectId: Number(selectedSubjectId),
        date: selectedDate,
        records: students.map((student) => ({
          studentId: student.id,
          status: attendanceMap[student.id] || 'present'
        }))
      });

      toast.success('Attendance submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Attendance submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Mark Attendance</p>
        <h2 className="mt-3 text-3xl font-semibold">Subject-wise daily attendance</h2>
        <p className="mt-2 max-w-2xl text-slate-300">
          Students are marked present by default. Use the absent checkbox for exceptions and submit once for the selected date.
        </p>
      </section>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 lg:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm text-slate-300">Subject</label>
          <select
            className="input"
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
          >
            {!subjects.length ? <option value="">No subjects assigned</option> : null}
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code}) - {subject.class_name} {subject.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Class</label>
          <input
            className="input"
            value={
              selectedSubject ? `${selectedSubject.class_name} Section ${selectedSubject.section}` : ''
            }
            readOnly
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Attendance Date</label>
          <input
            className="input"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold">Student List</h3>
            <p className="mt-1 text-sm text-slate-300">Tick the checkbox only for students who are absent.</p>
          </div>
          <button type="button" onClick={handleSubmit} disabled={submitting || loadingStudents} className="btn-primary">
            {submitting ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </div>

        {loadingStudents ? (
          <p className="py-8 text-sm text-slate-300">Loading students...</p>
        ) : !students.length ? (
          <p className="py-8 text-sm text-slate-300">No students found for the selected subject.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-300">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 font-medium">Roll No</th>
                  <th className="px-4 py-3 font-medium">Student Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Absent</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const status = attendanceMap[student.id] || 'present';
                  return (
                    <tr key={student.id} className="border-b border-white/5">
                      <td className="px-4 py-4">{student.roll_number}</td>
                      <td className="px-4 py-4">{student.name}</td>
                      <td className="px-4 py-4 text-slate-300">{student.email}</td>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={status === 'absent'}
                          onChange={(event) =>
                            setAttendanceMap((current) => ({
                              ...current,
                              [student.id]: event.target.checked ? 'absent' : 'present'
                            }))
                          }
                          className="h-4 w-4 rounded border-white/20 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                            status === 'present' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-400/20 text-rose-300'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default MarkAttendancePage;
