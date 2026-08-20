import React from 'react';
import { Calendar, Clock, MapPin, Users, GraduationCap, Building } from 'lucide-react';
import { academicYears } from '../../data/mockData';
import { getDepartmentName } from '../../constants/departments';

const EventCard = ({ event, onViewDetails, onOpen }) => {
  const categoryColors = {
    academic: 'bg-blue-50 text-blue-700 border border-blue-100',
    cultural: 'bg-amber-50 text-amber-700 border border-amber-150',
    sports: 'bg-emerald-50 text-[#059669] border border-emerald-100',
    technical: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    other: 'bg-slate-50 text-slate-700 border border-slate-100'
  };

  const isUpcoming = new Date(event.date) >= new Date();

  const getDepartmentNames = (codes) => {
    return codes.map(code => getDepartmentName(code)).join(', ');
  };

  const getYearLabels = (years) => {
    return years.map(year => academicYears.find(y => y.value === year)?.label || `${year}th Year`).join(', ');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 hover:shadow-md hover:border-[#C6A15B]/30 transition-all duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${categoryColors[event.category] || categoryColors.other}`}>
            {event.category || 'Event'}
          </span>
          {!isUpcoming && (
            <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded">
              Past Event
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">{event.title}</h3>
        <p className="text-gray-500 text-xs mb-4 line-clamp-2 leading-relaxed">{event.description}</p>

        <div className="space-y-2.5 mb-5">
          <div className="flex items-center text-xs font-semibold text-gray-600">
            <span className="mr-2.5 text-base">📅</span>
            <span>
              {new Date(event.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          <div className="flex items-center text-xs font-semibold text-gray-600">
            <span className="mr-2.5 text-base">⏰</span>
            <span>{event.time}</span>
          </div>
          <div className="flex items-center text-xs font-semibold text-gray-600">
            <span className="mr-2.5 text-base">📍</span>
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        {/* Target Audience */}
        <div className="mb-5 pt-3 border-t border-slate-100 space-y-2">
          {event.targetDepartments?.includes('ALL') ? (
            <div className="flex items-center">
              <span className="bg-amber-50 text-[#C6A15B] border border-amber-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Open to All Students
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {event.targetAcademicYears?.length > 0 && (
                <div className="flex items-center text-xs text-gray-500 font-medium">
                  <span className="text-[10px] font-bold uppercase text-gray-400 mr-2">Target:</span>
                  <span className="bg-slate-50 text-slate-700 border border-slate-150 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">
                    {getYearLabels(event.targetAcademicYears)}
                  </span>
                </div>
              )}
              {event.targetDepartments?.length > 0 && !event.targetDepartments.includes('ALL') && (
                <div className="flex items-center text-xs text-gray-500 font-medium">
                  <span className="text-[10px] font-bold uppercase text-gray-400 mr-2">Depts:</span>
                  <span className="bg-slate-50 text-slate-700 border border-slate-150 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1 truncate max-w-[150px]">
                    {event.targetDepartments.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Organized by</p>
          <p className="text-xs font-bold text-gray-900 truncate mt-0.5">
            {event.organizer?.name || event.organizer || 'Faculty'}
          </p>
        </div>
        <button 
          onClick={() => onOpen ? onOpen(event) : onViewDetails?.(event)}
          className="text-xs font-bold text-[#C6A15B] hover:text-amber-700 flex items-center transition-colors group"
        >
          <span>View Details</span>
          <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>
    </div>
  );
};

export default EventCard;