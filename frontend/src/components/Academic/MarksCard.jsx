import React from 'react';
import { BookOpen, TrendingUp, Calendar, Award } from 'lucide-react';

const MarksCard = ({ mark }) => {
  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'A-':
      case 'B+':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'B':
      case 'B-':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'C+':
      case 'C':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 85) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 65) return 'text-yellow-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const gradeColor = getGradeColor(mark.grade);
  const performanceColor = getPerformanceColor(mark.percentage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{mark.subjectName}</h3>
          <p className="text-sm text-gray-600">{mark.subjectCode}</p>
        </div>
        <div className={`px-3 py-1 rounded-lg border font-bold text-lg ${gradeColor}`}>
          {mark.grade}
        </div>
      </div>

      <div className="space-y-4">
        {/* Marks Display */}
        <div className="text-center">
          <div className={`text-3xl font-bold mb-1 ${performanceColor}`}>
            {mark.obtainedMarks}/{mark.maxMarks}
          </div>
          <p className="text-sm text-gray-600">Marks Obtained</p>
        </div>

        {/* Percentage */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${performanceColor}`}>
            {mark.percentage.toFixed(1)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              mark.percentage >= 85 ? 'bg-green-500' :
              mark.percentage >= 75 ? 'bg-blue-500' :
              mark.percentage >= 65 ? 'bg-yellow-500' :
              mark.percentage >= 50 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(mark.percentage, 100)}%` }}
          ></div>
        </div>

        {/* Performance Badge */}
        <div className="flex items-center justify-center">
          {mark.percentage >= 85 ? (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Award className="w-4 h-4 mr-1" />
              EXCELLENT
            </span>
          ) : mark.percentage >= 75 ? (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              GOOD
            </span>
          ) : mark.percentage >= 65 ? (
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <BookOpen className="w-4 h-4 mr-1" />
              AVERAGE
            </span>
          ) : mark.percentage >= 50 ? (
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              NEEDS IMPROVEMENT
            </span>
          ) : (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              POOR
            </span>
          )}
        </div>

        {/* Remarks */}
        {mark.remarks && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700 italic">"{mark.remarks}"</p>
          </div>
        )}

        {/* Exam Date */}
        <div className="flex items-center justify-center text-xs text-gray-500">
          <Calendar className="w-3 h-3 mr-1" />
          Exam Date: {new Date(mark.examDate).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default MarksCard;