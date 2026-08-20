import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import dailyAttendanceService from '../../services/dailyAttendanceService';

const DailyAttendanceDebug = () => {
  const { user } = useAuth();
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    if (!user) {
      setError('User not logged in');
      return;
    }

    setLoading(true);
    setError(null);
    setDebugData(null);

    try {
      console.log('Testing Daily Attendance API...');
      console.log('User:', user);
      
      // Test health check first
      const healthResponse = await dailyAttendanceService.healthCheck();
      console.log('Health Check Response:', healthResponse);

      // Test student attendance
      const filters = {
        startDate: new Date(2024, 0, 1).toISOString().split('T')[0], // Jan 1, 2024
        endDate: new Date().toISOString().split('T')[0], // Today
        department: user.department
      };
      
      console.log('Calling getStudentAttendance with:', {
        studentId: user._id,
        filters
      });

      const response = await dailyAttendanceService.getStudentAttendance(user._id, filters);
      console.log('Student Attendance Response:', response);

      setDebugData({
        health: healthResponse,
        attendance: response,
        user: user,
        filters: filters
      });

    } catch (err) {
      console.error('API Test Error:', err);
      setError({
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Daily Attendance API Debug</h3>
      
      <div className="mb-4">
        <button
          onClick={testAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test API'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <h4 className="font-semibold text-red-800">Error:</h4>
          <pre className="text-sm text-red-700 mt-2 overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}

      {debugData && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h4 className="font-semibold text-green-800">Health Check:</h4>
            <pre className="text-sm text-green-700 mt-2 overflow-auto">
              {JSON.stringify(debugData.health, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-blue-800">User Info:</h4>
            <pre className="text-sm text-blue-700 mt-2 overflow-auto">
              {JSON.stringify({
                id: debugData.user._id,
                name: debugData.user.name,
                department: debugData.user.department,
                role: debugData.user.role
              }, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <h4 className="font-semibold text-purple-800">Filters Used:</h4>
            <pre className="text-sm text-purple-700 mt-2 overflow-auto">
              {JSON.stringify(debugData.filters, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-semibold text-yellow-800">Attendance Response:</h4>
            <pre className="text-sm text-yellow-700 mt-2 overflow-auto max-h-96">
              {JSON.stringify(debugData.attendance, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyAttendanceDebug;