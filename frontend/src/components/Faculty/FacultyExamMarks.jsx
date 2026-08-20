import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Save, RefreshCw, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import dailyAttendanceService from '../../services/dailyAttendanceService';
import examMarksService from '../../services/examMarksService';

const ASSESSMENTS = ['Mid-1', 'Mid-2', 'Internal', 'Practical', 'Viva'];
const today = new Date().toISOString().split('T')[0];

const FacultyExamMarks = () => {
  const { user } = useAuth();
  const [accessConfig, setAccessConfig] = useState(null);
  const [form, setForm] = useState({
    academicYear: '',
    subjectCode: '',
    subjectName: '',
    assessmentType: 'Mid-1',
    examDate: today,
    maxMarks: 100
  });
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAccess = async () => {
    setLoading(true);
    try {
      const res = await dailyAttendanceService.getFacultyAccessConfig();
      const config = res.data;
      setAccessConfig(config);
      const defaultYear = config.faculty?.accessibleYears?.[0] || '';
      const defaultSubject = (config.faculty?.accessibleSubjects || []).find((s) =>
        s.academicYears.includes(Number(defaultYear))
      );
      setForm((c) => ({
        ...c,
        academicYear: defaultYear,
        subjectCode: defaultSubject?.subjectCode || '',
        subjectName: defaultSubject?.subjectName || ''
      }));
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to load faculty access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccess();
  }, []);

  const students = useMemo(() => {
    const year = Number(form.academicYear);
    return accessConfig?.studentsByYear?.[year] || [];
  }, [accessConfig, form.academicYear]);

  const availableSubjects = useMemo(() => {
    const year = Number(form.academicYear);
    return (accessConfig?.faculty?.accessibleSubjects || []).filter((s) => s.academicYears.includes(year));
  }, [accessConfig, form.academicYear]);

  const handleSave = async () => {
    if (!form.academicYear || !form.subjectCode) {
      toast.error('Select year and subject first');
      return;
    }
    const payload = {
      subjectCode: form.subjectCode,
      subjectName: form.subjectName,
      academicYear: Number(form.academicYear),
      examDate: form.examDate,
      assessmentType: form.assessmentType,
      maxMarks: Number(form.maxMarks),
      department: user?.department,
      marks: students.map((stu) => ({
        studentId: stu.id,
        obtainedMarks: Number(marks[stu.id]?.obtainedMarks ?? form.maxMarks ?? 0)
      }))
    };
    setSaving(true);
    try {
      await examMarksService.saveMarks(payload);
      toast.success('Marks saved');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exam Marks</h2>
          <p className="text-gray-600">Enter marks for your assigned students by subject and assessment type.</p>
        </div>
        <button
          type="button"
          onClick={loadAccess}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <select
          className="px-3 py-2 border rounded-lg"
          value={form.academicYear}
          onChange={(e) => {
            const year = e.target.value;
            const nextSubject = (accessConfig?.faculty?.accessibleSubjects || []).find((s) =>
              s.academicYears.includes(Number(year))
            );
            setForm((c) => ({
              ...c,
              academicYear: year,
              subjectCode: nextSubject?.subjectCode || '',
              subjectName: nextSubject?.subjectName || ''
            }));
          }}
        >
          <option value="">Year</option>
          {(accessConfig?.faculty?.accessibleYears || []).map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </select>

        <select
          className="px-3 py-2 border rounded-lg"
          value={form.subjectCode}
          onChange={(e) => {
            const code = e.target.value;
            const subj = availableSubjects.find((s) => s.subjectCode === code);
            setForm((c) => ({ ...c, subjectCode: code, subjectName: subj?.subjectName || '' }));
          }}
        >
          <option value="">Subject</option>
          {availableSubjects.map((s) => (
            <option key={s.subjectCode} value={s.subjectCode}>
              {s.subjectName}
            </option>
          ))}
        </select>

        <select
          className="px-3 py-2 border rounded-lg"
          value={form.assessmentType}
          onChange={(e) => setForm((c) => ({ ...c, assessmentType: e.target.value }))}
        >
          {ASSESSMENTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="px-3 py-2 border rounded-lg"
          value={form.examDate}
          onChange={(e) => setForm((c) => ({ ...c, examDate: e.target.value }))}
        />

        <input
          type="number"
          min="1"
          className="px-3 py-2 border rounded-lg w-32"
          value={form.maxMarks}
          onChange={(e) => {
            const val = e.target.value;
            setForm((c) => ({ ...c, maxMarks: val }));
            // apply same max and obtained default to everyone if empty
            setMarks((current) => {
              const updated = { ...current };
              students.forEach((stu) => {
                const existing = updated[stu.id] || {};
                updated[stu.id] = {
                  ...existing,
                  maxMarks: val,
                  obtainedMarks:
                    existing.obtainedMarks === undefined ||
                    existing.obtainedMarks === null ||
                    existing.obtainedMarks === ''
                      ? val
                      : existing.obtainedMarks
                };
              });
              return updated;
            });
          }}
          placeholder="Total Marks"
          aria-label="Total Marks"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !students.length}
          className="inline-flex items-center justify-center gap-2 bg-[#0B1220] text-white rounded-lg px-4 py-2 hover:bg-[#1a253a] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save Marks
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-semibold text-gray-900">Students</p>
            <p className="text-sm text-gray-600">Only your assigned students for the selected year are shown.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Roll No</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((stu) => (
                <tr key={stu.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{stu.name}</div>
                    <div className="text-xs text-gray-500">{stu.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{stu.rollNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      max={form.maxMarks}
                      className="w-28 px-3 py-2 border rounded-lg"
                      value={marks[stu.id]?.obtainedMarks ?? ''}
                      onChange={(e) =>
                        setMarks((c) => ({
                          ...c,
                          [stu.id]: { ...(c[stu.id] || {}), obtainedMarks: e.target.value }
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
              {!students.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Select year/subject to load assigned students.
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

export default FacultyExamMarks;
