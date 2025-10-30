
import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-slate-800 rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-200 mb-4 border-b border-slate-700 pb-2">{title}</h2>
      {children}
    </div>
  );
};

export default DashboardCard;
