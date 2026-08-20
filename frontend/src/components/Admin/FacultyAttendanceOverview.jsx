import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { facultyService } from '../../services/facultyService';
import dailyAttendanceService from '../../services/dailyAttendanceService';

const FacultyAttendanceOverview = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFaculty();
  }, []);

  useEffect(() => {
    if (selectedFacultyId) {
      loadFacultyAttendance(selectedFacultyId);
    } else {
      setSessions([]);
      setSummary([]);
    }
  }, [selectedFacultyId]);

  const loadFaculty = async () => {
    try {
      setLoading(true);
      const response = await facultyService.getAllFaculty();
      const faculty = response.users || [];
      setFacultyList(faculty);
      if (faculty.length) {
        setSelectedFacultyId(faculty[0]._id);
      }
    } catch (error) {
      console.error('Failed to load faculty:', error);
      toast.error('Failed to load faculty list');
    } finally {
      setLoading(false);
    }
  };

  const loadFacultyAttendance = async (facultyId) => {
    try {
      setLoading(true);
      const [sessionsResponse, summaryResponse] = await Promise.all([
        dailyAttendanceService.getFacultySessions({ facultyId }),
        dailyAttendanceService.getFacultySubjectSummary({ facultyId })
      ]);

      setSessions(sessionsResponse.data?.sessions || []);
      setSummary(summaryResponse.data?.subjects || []);
    } catch (error) {
      console.error('Failed to load faculty attendance:', error);
      toast.error('Failed to load faculty attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Faculty Attendance Overview</h2>
        <p className="text-sm text-gray-600 mt-1">Admin sab faculty ke attendance records dekh sakta hai.</p>
        <div className="mt-4">
          <select
            className="w-full md:w-96 px-3 py-2 border rounded-lg"
            value={selectedFacultyId}
            onChange={(e) => setSelectedFacultyId(e.target.value)}
          >
            <option value="">Select Faculty</option>
            {facultyList.map((faculty) => (
              <option key={faculty._id} value={faculty._id}>
                {faculty.name} - {faculty.department}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Attendance Sessions</h3>
              <p className="text-sm text-gray-500">Selected faculty ke sessions</p>
            </div>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {sessions.map((session) => (
              <div key={session._id} className="p-4">
                <p className="font-semibold text-gray-900">{session.subjectName}</p>
                <p className="text-sm text-gray-600">{new Date(session.date).toLocaleDateString()} | {session.classStartTime} - {session.classEndTime}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">{session.totalStudents} students</span>
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">{session.presentCount} present</span>
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">{session.absentCount} absent</span>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{session.status}</span>
                </div>
              </div>
            ))}
            {!loading && !sessions.length && <div className="p-4 text-sm text-gray-500">No attendance sessions found.</div>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Subject Summary</h3>
              <p className="text-sm text-gray-500">Faculty-wise subject attendance percentage</p>
            </div>
          </div>
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {summary.map((subject) => (
              <div key={subject.subjectCode} className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-blue-50">
                  <p className="font-semibold text-blue-900">{subject.subjectName}</p>
                  <p className="text-sm text-blue-700">Classes conducted: {subject.totalClassesConducted}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Present</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Absent</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {subject.students.map((student, index) => (
                        <tr key={`${subject.subjectCode}-${student.studentEmail || index}`}>
                          <td className="px-4 py-3">{student.studentName}</td>
                          <td className="px-4 py-3 text-center text-green-700">{student.presentClasses}</td>
                          <td className="px-4 py-3 text-center text-red-700">{student.absentClasses}</td>
                          <td className="px-4 py-3 text-center">{student.attendancePercentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {!loading && !summary.length && <div className="text-sm text-gray-500">No subject summary available.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyAttendanceOverview;
