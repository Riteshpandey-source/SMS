import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import academicService from '../../services/academicService';

/**
 * AcademicDataDebugger Component
 * 
 * Debug tool to check if academic data is being fetched correctly
 * Shows raw API responses and helps identify data issues
 */
const AcademicDataDebugger = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showRawData, setShowRawData] = useState(false);

  const fetchData = async () => {
    if (!user?._id) {
      setError('No user logged in');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching academic data for student:', user._id);

      const [marksRes, attendanceRes, debarmentRes] = await Promise.allSettled([
        academicService.getMidTermMarks(user._id, user.academicYear),
        academicService.getAttendance(user._id, user.academicYear),
        academicService.getStudentDebarments(user._id)
      ]);

      const results = {
        marks: {
          status: marksRes.status,
          data: marksRes.status === 'fulfilled' ? marksRes.value : null,
          error: marksRes.status === 'rejected' ? marksRes.reason?.message : null
        },
        attendance: {
          status: attendanceRes.status,
          data: attendanceRes.status === 'fulfilled' ? attendanceRes.value : null,
          error: attendanceRes.status === 'rejected' ? attendanceRes.reason?.message : null
        },
        debarment: {
          status: debarmentRes.status,
          data: debarmentRes.status === 'fulfilled' ? debarmentRes.value : null,
          error: debarmentRes.status === 'rejected' ? debarmentRes.reason?.message : null
        }
      };

      console.log('🔍 Debug Results:', results);
      setData(results);

    } catch (err) {
      console.error('🔍 Debug Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchData();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <AlertCircle className="h-5 w-5 text-yellow-600 inline mr-2" />
        <span className="text-yellow-800">No user logged in</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          🔍 Academic Data Debugger
        </h3>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* User Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>Student ID:</strong> {user._id}
        </p>
        <p className="text-sm text-blue-900">
          <strong>Name:</strong> {user.name}
        </p>
        <p className="text-sm text-blue-900">
          <strong>Academic Year:</strong> {user.academicYear}
        </p>
        <p className="text-sm text-blue-900">
          <strong>Department:</strong> {user.department}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 text-red-600 inline mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Marks Status */}
          <div className={`border rounded-lg p-4 ${
            data.marks.status === 'fulfilled' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">📊 Marks API</h4>
              {data.marks.status === 'fulfilled' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <p className="text-sm text-gray-700">
              <strong>Status:</strong> {data.marks.status}
            </p>
            {data.marks.error && (
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {data.marks.error}
              </p>
            )}
            {data.marks.data && (
              <>
                <p className="text-sm text-gray-700">
                  <strong>Marks Count:</strong> {data.marks.data.data?.midTermMarks?.length || 0}
                </p>
                {showRawData && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(data.marks.data, null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>

          {/* Attendance Status */}
          <div className={`border rounded-lg p-4 ${
            data.attendance.status === 'fulfilled' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">📅 Attendance API</h4>
              {data.attendance.status === 'fulfilled' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <p className="text-sm text-gray-700">
              <strong>Status:</strong> {data.attendance.status}
            </p>
            {data.attendance.error && (
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {data.attendance.error}
              </p>
            )}
            {data.attendance.data && (
              <>
                <p className="text-sm text-gray-700">
                  <strong>Attendance Count:</strong> {data.attendance.data.data?.attendance?.length || 0}
                </p>
                {showRawData && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(data.attendance.data, null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>

          {/* Debarment Status */}
          <div className={`border rounded-lg p-4 ${
            data.debarment.status === 'fulfilled' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">⚠️ Debarment API</h4>
              {data.debarment.status === 'fulfilled' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <p className="text-sm text-gray-700">
              <strong>Status:</strong> {data.debarment.status}
            </p>
            {data.debarment.error && (
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {data.debarment.error}
              </p>
            )}
            {data.debarment.data && (
              <>
                <p className="text-sm text-gray-700">
                  <strong>Is Debarred:</strong> {data.debarment.data.data?.isDebarred ? 'Yes' : 'No'}
                </p>
                {showRawData && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(data.debarment.data, null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>

          {/* Toggle Raw Data */}
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {showRawData ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Raw Data
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Raw Data
              </>
            )}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-medium mb-2">📝 How to use:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Check if all 3 APIs show green checkmarks</li>
          <li>Verify the counts (Marks Count, Attendance Count)</li>
          <li>Click "Show Raw Data" to see exact API responses</li>
          <li>If any API shows red, check the error message</li>
          <li>Click "Refresh" to fetch data again</li>
        </ol>
      </div>
    </div>
  );
};

export default AcademicDataDebugger;
