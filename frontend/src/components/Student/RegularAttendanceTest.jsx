import { useAuth } from '../../contexts/AuthContext';

const RegularAttendanceTest = () => {
  const { user } = useAuth();

  console.log('🧪 RegularAttendanceTest component rendered!');
  console.log('🧪 User data:', user);

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-green-600 mb-4">✅ Regular Attendance Test Component</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-semibold text-green-800">Component Status</h3>
          <p className="text-green-700">✅ Component is rendering successfully!</p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800">User Information</h3>
          {user ? (
            <div className="text-blue-700">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Department:</strong> {user.department}</p>
              <p><strong>Academic Year:</strong> {user.academicYear}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Email:</strong> {user.email}</p>
            </div>
          ) : (
            <p className="text-red-700">❌ No user data found</p>
          )}
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800">Next Steps</h3>
          <p className="text-yellow-700">
            If you can see this component, then the navigation is working. 
            The issue might be with the RegularAttendanceView component itself.
          </p>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded">
          <h3 className="font-semibold text-purple-800">Debug Info</h3>
          <pre className="text-purple-700 text-sm overflow-auto">
            {JSON.stringify({ user }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default RegularAttendanceTest;