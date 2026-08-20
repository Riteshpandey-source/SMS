import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import academicService from '../../services/academicService';

const RegularAttendanceDebug = () => {
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
      console.log('Testing Regular Attendance API...');
      console.log('User:', user);
      
      // Test department attendance
      console.log('Calling getDepartmentAttendance with:', {
        department: user.department,
        academicYear: user.academicYear || 1,
        semester: 'current'
      });

      const deptResponse = await academicService.getDepartmentAttendance(
        user.department, 
        user.academicYear || 1, 
        'current'
      );
      console.log('Department Attendance Response:', deptResponse);

      // Test all students attendance
      console.log('Calling getAllStudentsAttendance...');
      const allResponse = await academicService.getAllStudentsAttendance(
        user.academicYear || 1, 
        'current'
      );
      console.log('All Students Attendance Response:', allResponse);

      setDebugData({
        user: user,
        departmentAttendance: deptResponse,
        allStudentsAttendance: allResponse
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
      <h3 className="text-lg font-semibold mb-4">Regular Attendance API Debug</h3>
      
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
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-blue-800">User Info:</h4>
            <pre className="text-sm text-blue-700 mt-2 overflow-auto">
              {JSON.stringify({
                id: debugData.user._id,
                name: debugData.user.name,
                department: debugData.user.department,
                academicYear: debugData.user.academicYear,
                role: debugData.user.role
              }, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h4 className="font-semibold text-green-800">Department Attendance:</h4>
            <pre className="text-sm text-green-700 mt-2 overflow-auto max-h-96">
              {JSON.stringify(debugData.departmentAttendance, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <h4 className="font-semibold text-purple-800">All Students Attendance:</h4>
            <pre className="text-sm text-purple-700 mt-2 overflow-auto max-h-96">
              {JSON.stringify(debugData.allStudentsAttendance, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegularAttendanceDebug;