import React, { useEffect, useState } from 'react';
import { Calendar, Upload, FileText, Download, Building2, Clock, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { routineService } from '../../services/routineService';

const departments = ['CS', 'IT', 'ECE', 'EE', 'ME', 'CSAI', 'AIDS', 'CIVIL', 'ADMINISTRATION'];
const years = [1, 2, 3, 4];

const RoutinePortal = () => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    department: user?.department || 'CS',
    academicYear: '',
    section: '',
    file: null
  });

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const { data } = await routineService.getRoutines();
      setRoutines(data || []);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to load routines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title || !form.file) {
      toast.error('Title and file are required');
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('department', form.department);
    if (form.academicYear) formData.append('academicYear', form.academicYear);
    if (form.section) formData.append('section', form.section);
    formData.append('file', form.file);

    try {
      setUploading(true);
      await routineService.uploadRoutine(formData);
      toast.success('Routine uploaded');
      setForm({
        title: '',
        department: user?.department || 'CS',
        academicYear: '',
        section: '',
        file: null
      });
      fetchRoutines();
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const renderUploadCard = () => {
    if (user?.role !== 'admin') return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-50">
            <Upload className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Class Routine</h2>
            <p className="text-sm text-gray-500">PDF, DOCX, XLSX, PNG, JPG up to 20MB</p>
          </div>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleUpload}>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-200"
              placeholder="e.g., 2nd Year CS Routine (Spring 2026)"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-200"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Academic Year (optional)</label>
            <select
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-200"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Section (optional)</label>
            <input
              type="text"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-200"
              placeholder="A, B, C..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Routine File</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              className="mt-1 w-full"
              required
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className={`px-4 py-2 rounded-lg text-white font-medium flex items-center space-x-2 ${
                uploading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Upload className={`w-4 h-4 ${uploading ? 'animate-pulse' : ''}`} />
              <span>{uploading ? 'Uploading...' : 'Upload Routine'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderRoutineList = () => {
    if (loading) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-gray-500">
          Loading routines...
        </div>
      );
    }

    if (!routines.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-gray-500">
          No routines available yet.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {routines.map((routine) => (
          <div key={routine._id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-gray-500 flex items-center space-x-1">
                  <Building2 className="w-4 h-4" />
                  <span>{routine.department}</span>
                  {routine.academicYear ? <span>• Year {routine.academicYear}</span> : <span>• All Years</span>}
                  {routine.section ? <span>• {routine.section}</span> : null}
                </p>
                <h3 className="text-lg font-semibold text-gray-900">{routine.title}</h3>
              </div>
              <FileText className="w-6 h-6 text-indigo-500" />
            </div>

            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Uploaded: {new Date(routine.createdAt).toLocaleDateString()}</span>
              </div>
              {routine.uploadedBy?.name && (
                <p className="text-xs text-gray-500 mt-1">
                  By {routine.uploadedBy.name} ({routine.uploadedBy.role})
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={routine.file?.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium"
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </a>
              <a
                href={routine.file?.url || '#'}
                download
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderUploadCard()}
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-50">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Class Routines</h2>
            <p className="text-sm text-gray-500">Students can view routines shared for their department/year.</p>
          </div>
        </div>
        {renderRoutineList()}
      </div>
    </div>
  );
};

export default RoutinePortal;
