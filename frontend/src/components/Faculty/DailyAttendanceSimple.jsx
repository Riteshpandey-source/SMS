import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, CheckCircle2, Clock, RefreshCw, Save, Send, Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import dailyAttendanceService from '../../services/dailyAttendanceService';

const today = new Date().toISOString().split('T')[0];

const yearLabel = (year) => `Year ${year}`;
const getSubjectKey = (subject) => subject?.subjectCode || subject?.subjectName || '';

const DailyAttendanceSimple = () => {
  const { user } = useAuth();
  const [accessConfig, setAccessConfig] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    date: today,
    academicYear: '',
    subjectCode: '',
    subjectName: '',
    classStartTime: '09:00',
    classEndTime: '10:00',
    classType: 'lecture'
  });
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [draftAttendance, setDraftAttendance] = useState({});
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAccessConfig = async () => {
    try {
      const response = await dailyAttendanceService.getFacultyAccessConfig();
      const config = response.data;
      setAccessConfig(config);

      const defaultYear = config?.faculty?.accessibleYears?.[0] || '';
      const defaultSubject = (config?.faculty?.accessibleSubjects || []).find((subject) =>
        subject.academicYears.includes(Number(defaultYear))
      );

      setSessionForm((current) => ({
        ...current,
        academicYear: defaultYear,
        subjectCode: getSubjectKey(defaultSubject),
        subjectName: defaultSubject?.subjectName || ''
      }));
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to load faculty access');
    }
  };

  const loadSessions = async () => {
    try {
      const response = await dailyAttendanceService.getFacultySessions({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        // no endDate so upcoming/future sessions also show up
      });
      setSessions(response.data?.sessions || []);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to load attendance sessions');
    }
  };

  const loadSummary = async (filters = {}) => {
    try {
      const response = await dailyAttendanceService.getFacultySubjectSummary(filters);
      setSummary(response.data?.subjects || []);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to load attendance summary');
    }
  };

  useEffect(() => {
    loadAccessConfig();
    loadSessions();
    loadSummary();
  }, []);

  const availableSubjects = useMemo(() => {
    const year = Number(sessionForm.academicYear);
    return (accessConfig?.faculty?.accessibleSubjects || []).filter((subject) =>
      subject.academicYears.includes(year)
    );
  }, [accessConfig, sessionForm.academicYear]);

  const assignedStudents = useMemo(() => {
    const year = Number(sessionForm.academicYear);
    return accessConfig?.studentsByYear?.[year] || [];
  }, [accessConfig, sessionForm.academicYear]);

  const allowedSubjectKeys = useMemo(
    () => new Set((accessConfig?.faculty?.accessibleSubjects || []).map((subject) => getSubjectKey(subject))),
    [accessConfig]
  );

  const openSession = async (sessionId) => {
    setLoading(true);
    try {
      const response = await dailyAttendanceService.getSession(sessionId);
      const session = response.data?.attendanceSession;
      setSelectedSession(session);
      setDraftAttendance(
        (session?.studentAttendance || []).reduce((acc, student) => {
          const key = student.studentId?._id || student.studentId || student._id || student.studentEmail;
          acc[key] = {
            entryId: student._id || '',
            studentId: key,
            studentEmail: student.studentEmail || '',
            isPresent: student.isPresent !== false,
            remarks: student.remarks || ''
          };
          return acc;
        }, {})
      );
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to open attendance sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (value) => {
    const year = Number(value);
    const nextSubject = (accessConfig?.faculty?.accessibleSubjects || []).find((subject) =>
      subject.academicYears.includes(year)
    );

    setSessionForm((current) => ({
      ...current,
      academicYear: value,
      subjectCode: getSubjectKey(nextSubject),
      subjectName: nextSubject?.subjectName || ''
    }));
  };

  const handleSubjectChange = (subjectCode) => {
    const selectedSubject = availableSubjects.find((subject) => getSubjectKey(subject) === subjectCode);
    setSessionForm((current) => ({
      ...current,
      subjectCode,
      subjectName: selectedSubject?.subjectName || ''
    }));
  };

  const handleCreateSession = async (event) => {
    event.preventDefault();
    if (!sessionForm.academicYear || !sessionForm.subjectCode) {
      toast.error('Select admin-assigned year and subject first');
      return;
    }

    setSaving(true);
    try {
      await dailyAttendanceService.createSession({
        ...sessionForm,
        department: user?.department,
        academicYear: Number(sessionForm.academicYear),
        subjectId: `${sessionForm.subjectCode.toUpperCase()}-${sessionForm.academicYear}`
      });
      toast.success('Attendance sheet created with registered assigned students.');
      await loadSessions();
      await loadSummary({ academicYear: sessionForm.academicYear, subjectCode: sessionForm.subjectCode });
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to create attendance sheet');
    } finally {
      setSaving(false);
    }
  };

  const handleAbsentToggle = (studentKey, checked) => {
    setDraftAttendance((current) => ({
      ...current,
      [studentKey]: {
        ...current[studentKey],
        isPresent: !checked
      }
    }));
  };

  const saveAttendance = async () => {
    if (!selectedSession) return;
    setSaving(true);
    try {
      await dailyAttendanceService.bulkUpdateAttendance(
        selectedSession._id,
        Object.values(draftAttendance).map((entry) => ({
          entryId: entry.entryId,
          studentId: entry.studentId,
          studentEmail: entry.studentEmail,
          isPresent: entry.isPresent,
          remarks: entry.remarks || ''
        }))
      );
      toast.success('Attendance updated');
      await openSession(selectedSession._id);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const submitAttendance = async () => {
    if (!selectedSession) return;
    setSaving(true);
    try {
      await dailyAttendanceService.bulkUpdateAttendance(
        selectedSession._id,
        Object.values(draftAttendance).map((entry) => ({
          entryId: entry.entryId,
          studentId: entry.studentId,
          studentEmail: entry.studentEmail,
          isPresent: entry.isPresent,
          remarks: entry.remarks || ''
        }))
      );
      await dailyAttendanceService.submitSession(selectedSession._id);
      toast.success('Attendance submitted successfully');
      await loadSessions();
      await loadSummary({
        academicYear: selectedSession.academicYear,
        subjectCode: selectedSession.subjectCode
      });
      await openSession(selectedSession._id);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to submit attendance');
    } finally {
      setSaving(false);
    }
  };

  const isSessionLocked = selectedSession?.status === 'locked';

  const selectedSummary = useMemo(() => {
    if (!selectedSession) return null;
    return summary.find((item) => item.subjectCode === selectedSession.subjectCode) || null;
  }, [selectedSession, summary]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Regular Attendance Sheet</h2>
            <p className="text-gray-600">Admin-assigned subject access se faculty ko register style attendance sheet milti hai.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadAccessConfig();
              loadSessions();
              loadSummary();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-blue-900">Attendance Access From Admin</p>
              <div className="flex flex-wrap gap-2">
                {(accessConfig?.faculty?.accessibleYears || []).map((year) => (
                  <span key={year} className="px-2 py-1 rounded-full bg-white text-blue-700 text-xs font-semibold">
                    {yearLabel(year)}
                  </span>
                ))}
              </div>
              <p className="text-sm text-blue-700">
                Registered students available for selected year: <span className="font-semibold">{assignedStudents.length}</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input className="px-3 py-2 border rounded-lg" type="date" value={sessionForm.date} onChange={(e) => setSessionForm((c) => ({ ...c, date: e.target.value }))} required />
          <select className="px-3 py-2 border rounded-lg" value={sessionForm.academicYear} onChange={(e) => handleYearChange(e.target.value)} required>
            <option value="">Select Year</option>
            {(accessConfig?.faculty?.accessibleYears || []).map((year) => <option key={year} value={year}>{yearLabel(year)}</option>)}
          </select>
          <select className="px-3 py-2 border rounded-lg" value={sessionForm.subjectCode} onChange={(e) => handleSubjectChange(e.target.value)} required>
            <option value="">Select Subject</option>
            {availableSubjects.map((subject) => (
              <option key={`${getSubjectKey(subject)}-${subject.subjectName}`} value={getSubjectKey(subject)}>
                {subject.subjectName}
              </option>
            ))}
          </select>
          <input className="px-3 py-2 border rounded-lg bg-gray-50" placeholder="Subject Name" value={sessionForm.subjectName} readOnly />
          <input className="px-3 py-2 border rounded-lg" type="time" value={sessionForm.classStartTime} onChange={(e) => setSessionForm((c) => ({ ...c, classStartTime: e.target.value }))} required />
          <input className="px-3 py-2 border rounded-lg" type="time" value={sessionForm.classEndTime} onChange={(e) => setSessionForm((c) => ({ ...c, classEndTime: e.target.value }))} required />
          <button type="submit" disabled={saving || !assignedStudents.length} className="inline-flex items-center justify-center gap-2 bg-[#0B1220] text-white rounded-lg px-4 py-2 hover:bg-[#1a253a] disabled:opacity-50">
            <Calendar className="h-4 w-4" />
            Create Sheet
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Attendance Sessions</h3>
            </div>
            <div className="divide-y max-h-[420px] overflow-y-auto">
              {sessions.map((session) => (
                allowedSubjectKeys.has(session.subjectCode) ? (
                <button
                  key={session._id}
                  type="button"
                  onClick={() => openSession(session._id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 ${selectedSession?._id === session._id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{session.subjectCode} - {session.subjectName}</p>
                      <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(session.date).toLocaleDateString()}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{session.classStartTime}-{session.classEndTime}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${session.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {session.status}
                    </span>
                  </div>
                </button>
                ) : null
              ))}
              {!sessions.length && <div className="p-6 text-sm text-gray-500">No attendance sessions created yet.</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Registered Students</h3>
                <p className="text-sm text-gray-500">Selected year ke assigned student names automatically aayenge.</p>
              </div>
            </div>
            <div className="max-h-[260px] overflow-y-auto divide-y">
              {assignedStudents.map((student) => (
                <div key={student.id} className="px-4 py-3">
                  <p className="font-medium text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-600">Roll No: {student.rollNumber || '—'}</p>
                </div>
              ))}
              {!assignedStudents.length && <div className="p-4 text-sm text-gray-500">No students assigned for the selected year.</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Daily Attendance Sheet</h3>
                <p className="text-sm text-gray-500">Default all present. Tick checkbox only for absent students.</p>
              </div>
              {selectedSession ? (
                <div className="flex gap-2">
                  <button type="button" onClick={saveAttendance} disabled={saving || loading || isSessionLocked} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button type="button" onClick={submitAttendance} disabled={saving || loading || isSessionLocked} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                    <Send className="h-4 w-4" />
                    {selectedSession?.status === 'submitted' ? 'Resubmit' : 'Submit'}
                  </button>
                </div>
              ) : null}
            </div>

            {!selectedSession ? (
              <div className="p-8 text-center text-gray-500">Select a session to open the attendance sheet.</div>
            ) : loading ? (
              <div className="p-8 text-center text-gray-500">Loading sheet...</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="p-4 border-b bg-blue-50">
                  <p className="font-semibold text-blue-900">{selectedSession.subjectCode} - {selectedSession.subjectName}</p>
                  <p className="text-sm text-blue-700">Date: {new Date(selectedSession.date).toLocaleDateString()} | Year {selectedSession.academicYear} | {selectedSession.department}</p>
                </div>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Roll No</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Absent</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selectedSession.studentAttendance || []).map((student, index) => {
                      const key = student.studentId?._id || student.studentId || student._id || student.studentEmail;
                      const isPresent = draftAttendance[key]?.isPresent !== false;
                      const rollNo = student.rollNumber || student.studentId?.rollNumber || '—';
                      return (
                        <tr key={key || index}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{student.studentName}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{rollNo}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={!isPresent}
                              onChange={(e) => handleAbsentToggle(key, e.target.checked)}
                              disabled={isSessionLocked}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <CheckCircle2 className="h-3 w-3" />
                              {isPresent ? 'Present' : 'Absent'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Subject-wise Student Percentage</h3>
                <p className="text-sm text-gray-500">Faculty aur student dono side percentage based attendance summary dekhenge.</p>
              </div>
            </div>
            <div className="p-4 space-y-6">
              {(selectedSummary ? [selectedSummary] : summary)
                .filter((subject) => allowedSubjectKeys.has(subject.subjectCode))
                .map((subject) => (
                <div key={subject.subjectCode} className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-blue-50">
                    <p className="font-semibold text-blue-900">{subject.subjectCode} - {subject.subjectName}</p>
                    <p className="text-sm text-blue-700">Classes conducted: {subject.totalClassesConducted}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Total</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Present</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Absent</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {subject.students.map((student, index) => (
                          <tr key={`${subject.subjectCode}-${student.studentEmail || index}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{student.studentName}</div>
                            </td>
                            <td className="px-4 py-3 text-center">{student.totalClasses}</td>
                            <td className="px-4 py-3 text-center text-green-700 font-medium">{student.presentClasses}</td>
                            <td className="px-4 py-3 text-center text-red-700 font-medium">{student.absentClasses}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${student.attendancePercentage >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {student.attendancePercentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {!summary.length && <div className="text-sm text-gray-500">No submitted attendance summary available yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyAttendanceSimple;
