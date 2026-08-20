import React from 'react';
import { 
  BookOpen, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useAcademic } from '../../contexts/AcademicContext.jsx';

const AcademicTabs = () => {
  const {
    activeTab,
    setActiveTab,
    midTermMarks,
    attendance,
    debarments,
    loading,
    errors
  } = useAcademic();

  // Calculate tab indicators
  const getTabIndicators = () => {
    const indicators = {
      marks: { count: 0, hasIssues: false, hasData: false },
      attendance: { count: 0, hasIssues: false, hasData: false },
      debarments: { count: 0, hasIssues: false, hasData: false }
    };

    // Mid-term marks indicators
    if (midTermMarks && midTermMarks.length > 0) {
      indicators.marks.count = midTermMarks.length;
      indicators.marks.hasData = true;
      indicators.marks.hasIssues = midTermMarks.some(mark => 
        (mark.obtainedMarks || 0) < (mark.maxMarks || 100) * 0.4 // Less than 40%
      );
    }

    // Attendance indicators
    if (attendance && attendance.length > 0) {
      indicators.attendance.count = attendance.length;
      indicators.attendance.hasData = true;
      indicators.attendance.hasIssues = attendance.some(att => 
        att.percentage < 75 || att.isDebarred
      );
    }

    // Debarment indicators
    if (debarments) {
      const debarredSubjects = debarments.debarments || [];
      const manualDebarments = debarments.manualDebarments || {};
      
      indicators.debarments.count = debarredSubjects.length + Object.keys(manualDebarments).length;
      indicators.debarments.hasData = indicators.debarments.count > 0;
      indicators.debarments.hasIssues = indicators.debarments.count > 0;
    }

    return indicators;
  };

  const indicators = getTabIndicators();

  const tabs = [
    {
      id: 'marks',
      title: '📊 Academic Marks',
      icon: BookOpen,
      description: 'Manage student examination marks and grades',
      count: indicators.marks.count,
      hasIssues: indicators.marks.hasIssues,
      hasData: indicators.marks.hasData,
      loading: loading.midTermMarks,
      error: errors.midTermMarks
    },
    {
      id: 'attendance',
      title: 'Attendance',
      icon: Users,
      description: 'Track and update attendance records',
      count: indicators.attendance.count,
      hasIssues: indicators.attendance.hasIssues,
      hasData: indicators.attendance.hasData,
      loading: loading.attendance,
      error: errors.attendance
    },
    {
      id: 'debarments',
      title: 'Debarment',
      icon: AlertTriangle,
      description: 'Manage student debarment status',
      count: indicators.debarments.count,
      hasIssues: indicators.debarments.hasIssues,
      hasData: indicators.debarments.hasData,
      loading: loading.debarments,
      error: errors.debarments
    }
  ];

  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex space-x-0" aria-label="Academic Data Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex-1 group px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200
                ${isActive
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
              title={tab.description}
            >
              <div className="flex items-center justify-center space-x-2">
                {/* Icon with loading state */}
                <div className="relative">
                  <Icon className={`h-5 w-5 ${tab.loading ? 'opacity-50' : ''}`} />
                  {tab.loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Tab title */}
                <span className="hidden sm:inline">{tab.title}</span>
                
                {/* Mobile title (shorter) */}
                <span className="sm:hidden">
                  {tab.id === 'marks' ? 'Academic' : 
                   tab.id === 'attendance' ? 'Attend.' : 'Debar.'}
                </span>

                {/* Count badge */}
                {tab.hasData && tab.count > 0 && (
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}

                {/* Issue indicator */}
                {tab.hasIssues && (
                  <div className={`
                    w-2 h-2 rounded-full
                    ${tab.id === 'debarments' 
                      ? 'bg-red-400' 
                      : 'bg-yellow-400'
                    }
                  `} 
                  title={
                    tab.id === 'marks' ? 'Some marks below 40%' :
                    tab.id === 'attendance' ? 'Low attendance detected' :
                    'Debarment issues present'
                  } />
                )}

                {/* Success indicator */}
                {tab.hasData && !tab.hasIssues && tab.id !== 'debarments' && (
                  <CheckCircle className="h-4 w-4 text-green-500" title="All good" />
                )}
              </div>

              {/* Error indicator */}
              {tab.error && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" 
                     title={`Error: ${tab.error}`} />
              )}

              {/* Active tab indicator line */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab descriptions for mobile */}
      <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 sm:hidden">
        <p className="text-xs text-gray-600">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </p>
      </div>

      {/* Quick stats bar */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            {/* Total subjects */}
            <div className="flex items-center text-gray-600">
              <BookOpen className="h-4 w-4 mr-1" />
              <span>
                {Math.max(indicators.marks.count, indicators.attendance.count)} subjects
              </span>
            </div>

            {/* Issues summary */}
            {(indicators.marks.hasIssues || indicators.attendance.hasIssues || indicators.debarments.hasIssues) && (
              <div className="flex items-center space-x-3">
                {indicators.marks.hasIssues && (
                  <div className="flex items-center text-yellow-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>Low marks</span>
                  </div>
                )}
                {indicators.attendance.hasIssues && (
                  <div className="flex items-center text-yellow-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Low attendance</span>
                  </div>
                )}
                {indicators.debarments.hasIssues && (
                  <div className="flex items-center text-red-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span>{indicators.debarments.count} debarred</span>
                  </div>
                )}
              </div>
            )}

            {/* All good indicator */}
            {!indicators.marks.hasIssues && !indicators.attendance.hasIssues && !indicators.debarments.hasIssues && 
             (indicators.marks.hasData || indicators.attendance.hasData) && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>All subjects in good standing</span>
              </div>
            )}
          </div>

          {/* Loading indicator */}
          {(loading.midTermMarks || loading.attendance || loading.debarments) && (
            <div className="flex items-center text-blue-600">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
              <span>Loading data...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademicTabs;