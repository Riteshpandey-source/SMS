import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Edit3, Plus, Save, Shield, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { facultyService } from '../../services/facultyService';

const emptySubject = { subjectName: '', academicYears: [1] };

const yearLabel = (year) => `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`;

const FacultyYearAccess = () => {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [editingYears, setEditingYears] = useState([]);
  const [editingSubjects, setEditingSubjects] = useState([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchFaculty();
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied</h3>
        <p className="text-red-700">Only administrators can manage faculty year and subject access.</p>
      </div>
    );
  }

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await facultyService.getAllFaculty();
      setFaculty(response.users || []);
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
      setLoadError(true);
      toast.error('Failed to load faculty data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (facultyMember) => {
    setEditingFacultyId(facultyMember._id);
    setEditingYears([...(facultyMember.accessibleYears || [1, 2, 3, 4])].sort());
    setEditingSubjects(
      (facultyMember.accessibleSubjects || []).length
        ? facultyMember.accessibleSubjects.map((subject) => ({
            subjectName: subject.subjectName || '',
            academicYears: [...(subject.academicYears || [])].sort()
          }))
        : [{ ...emptySubject }]
    );
  };

  const handleCancel = () => {
    setEditingFacultyId(null);
    setEditingYears([]);
    setEditingSubjects([]);
  };

  const toggleYear = (year) => {
    setEditingYears((current) =>
      current.includes(year) ? current.filter((item) => item !== year) : [...current, year].sort()
    );
  };

  const updateSubject = (index, field, value) => {
    setEditingSubjects((current) =>
      current.map((subject, subjectIndex) =>
        subjectIndex === index ? { ...subject, [field]: value } : subject
      )
    );
  };

  const toggleSubjectYear = (index, year) => {
    setEditingSubjects((current) =>
      current.map((subject, subjectIndex) => {
        if (subjectIndex !== index) return subject;
        const academicYears = subject.academicYears.includes(year)
          ? subject.academicYears.filter((item) => item !== year)
          : [...subject.academicYears, year].sort();
        return { ...subject, academicYears };
      })
    );
  };

  const addSubjectRow = () => {
    setEditingSubjects((current) => [...current, { ...emptySubject }]);
  };

  const removeSubjectRow = (index) => {
    setEditingSubjects((current) => current.filter((_, subjectIndex) => subjectIndex !== index));
  };

  const handleSave = async (facultyMember) => {
    if (!editingYears.length) {
      toast.error('Faculty must have access to at least one year');
      return;
    }

    const cleanedSubjects = editingSubjects
      .map((subject) => ({
        subjectName: subject.subjectName.trim(),
        academicYears: [...new Set(subject.academicYears)].sort()
      }))
      .filter((subject) => subject.subjectName && subject.academicYears.length);

    if (!cleanedSubjects.length) {
      toast.error('Add at least one subject for attendance access');
      return;
    }

    try {
      await facultyService.updateFacultyAccessibleYears(facultyMember._id, editingYears, cleanedSubjects);
      setFaculty((current) =>
        current.map((item) =>
          item._id === facultyMember._id
            ? { ...item, accessibleYears: editingYears, accessibleSubjects: cleanedSubjects }
            : item
        )
      );
      toast.success(`Updated access for ${facultyMember.name}`);
      handleCancel();
    } catch (error) {
      console.error('Failed to update faculty access:', error);
      toast.error('Failed to update faculty access');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Faculty Attendance Access</h2>
            <p className="text-sm text-gray-600">Admin can grant year-wise and subject-wise attendance access to faculty.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Faculty Members</h3>
        </div>

        {!loading && !faculty.length && (
          <div className="p-6 bg-gray-50">
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center space-y-3">
              <p className="text-base font-medium text-gray-900">No faculty found in your department.</p>
              <p className="text-sm text-gray-600">Create faculty in `Users & Departments` then click refresh.</p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={fetchFaculty}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {loadError && <p className="text-xs text-red-600">Last load failed. Check network or backend.</p>}
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {faculty.map((facultyMember) => {
            const isEditing = editingFacultyId === facultyMember._id;
            const subjectsToShow = isEditing ? editingSubjects : (facultyMember.accessibleSubjects || []);

            return (
              <div key={facultyMember._id} className="p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{facultyMember.name}</h4>
                      <p className="text-sm text-gray-600">{facultyMember.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {facultyMember.department}
                      </span>
                      {(isEditing ? editingYears : (facultyMember.accessibleYears || [])).map((year) => (
                        <span key={year} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          {yearLabel(year)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSave(facultyMember)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          title="Save Changes"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEdit(facultyMember)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        title="Edit Access"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="space-y-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Accessible Years</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((year) => (
                          <label key={year} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingYears.includes(year)}
                              onChange={() => toggleYear(year)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{yearLabel(year)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900">Attendance Subjects</h5>
                        <button
                          type="button"
                          onClick={addSubjectRow}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          <Plus className="w-4 h-4" />
                          Add Subject
                        </button>
                      </div>

                      {editingSubjects.map((subject, index) => (
                        <div key={`${facultyMember._id}-subject-${index}`} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                          <input
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Subject Name"
                            value={subject.subjectName}
                            onChange={(e) => updateSubject(index, 'subjectName', e.target.value)}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Allowed Years For This Subject</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[1, 2, 3, 4].map((year) => (
                                <label key={year} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={subject.academicYears.includes(year)}
                                    onChange={() => toggleSubjectYear(index, year)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-700">{yearLabel(year)}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeSubjectRow(index)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-900 mb-3">Assigned Subjects</p>
                    {subjectsToShow.length ? (
                      <div className="space-y-2">
                        {subjectsToShow.map((subject, index) => (
                          <div key={`${facultyMember._id}-${subject.subjectCode || subject.subjectName}-${index}`} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                            <div>
                              <p className="font-medium text-gray-900">{subject.subjectName}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(subject.academicYears || []).map((year) => (
                                <span key={`${subject.subjectCode}-${year}`} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                  {yearLabel(year)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No subject access assigned yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900">How It Works</h4>
            <p className="text-sm text-blue-700">
              Jab admin faculty ko year aur subject assign karta hai, tab faculty attendance sheet me wahi subjects dikhenge aur assigned registered students ke naam khud aa jayenge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyYearAccess;
