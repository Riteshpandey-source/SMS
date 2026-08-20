import React from 'react';

const gradientMap = {
  brand:   'from-brand-500 to-violet-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber:   'from-amber-500 to-orange-600',
  rose:    'from-rose-500 to-pink-600',
  blue:    'from-blue-500 to-cyan-600',
  indigo:  'from-indigo-500 to-purple-600',
};

const StatCard = ({ title, value, icon: Icon, color = 'brand', subtitle, trend }) => {
  const gradient = gradientMap[color] || gradientMap.brand;

  return (
    <div className="card-elevated p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
            trend >= 0 
              ? 'bg-emerald-50 text-emerald-600' 
              : 'bg-rose-50 text-rose-600'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
