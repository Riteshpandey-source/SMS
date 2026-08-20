import React from 'react';
import { MessageSquare, ChevronUp, ChevronDown, Eye, Clock, CheckCircle, GraduationCap, Building } from 'lucide-react';
import { academicYears } from '../../data/mockData';
import { getDepartmentName } from '../../constants/departments';

const QuestionCard = ({ question, onClick }) => {
  // Department name is now imported from constants

  const getYearLabel = (year) => {
    return academicYears.find(y => y.value === year)?.label || `${year}th Year`;
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        {/* Vote Section */}
        <div className="flex flex-col items-center space-y-1 flex-shrink-0">
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronUp className="w-5 h-5 text-gray-400" />
          </button>
          <span className="text-lg font-semibold text-gray-900">{question.votes}</span>
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Question Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
              {question.title}
            </h3>
            {question.solved && (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
            )}
          </div>

          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{question.content}</p>

          {/* Academic Info */}
          {(question.academicYear || question.department || question.subject) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {question.academicYear && (
                <span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {getYearLabel(question.academicYear)}
                </span>
              )}
              {question.department && (
                <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  <Building className="w-3 h-3 mr-1" />
                  {getDepartmentName(question.department)}
                </span>
              )}
              {question.subject && (
                <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                  {question.subject}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {question.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Meta Information */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <MessageSquare className="w-4 h-4" />
                <span>{question.answers.length} answers</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{question.views} views</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(question.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <img
                  src={question.authorAvatar}
                  alt={question.author}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="font-medium">{question.author}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;