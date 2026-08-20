import React from 'react';
import Dashboard from '../Dashboard/Dashboard';

/**
 * StudentDashboard Component
 * 
 * A dedicated dashboard component for students that provides:
 * - Faculty list integration
 * - Assignment status indicators and notifications
 * - Quick access to assigned faculty contact information
 * - Assignment-filtered content in dashboard sections
 * - Academic data overview
 * - Campus events and notes access
 */
const StudentDashboard = ({ initialSection = 'overview', onNavigate }) => {
  return (
    <Dashboard 
      initialSection={initialSection}
      onNavigate={onNavigate}
    />
  );
};

export default StudentDashboard;