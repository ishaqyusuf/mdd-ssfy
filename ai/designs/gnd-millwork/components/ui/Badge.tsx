import React from 'react';
import { JobStatus } from '../../types';

interface BadgeProps {
  status: JobStatus | 'High' | 'Submitted' | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  let styles = 'bg-secondary text-secondary-foreground';

  switch (status) {
    case JobStatus.Approved:
    case JobStatus.Paid:
      styles = 'bg-green-100 text-green-700 border-green-200';
      break;
    case JobStatus.Pending:
    case JobStatus.Processing:
      styles = 'bg-blue-100 text-blue-700 border-blue-200';
      break;
    case JobStatus.Draft:
      styles = 'bg-slate-100 text-slate-600 border-slate-200';
      break;
    case 'High':
      styles = 'bg-red-100 text-red-700 border-red-200';
      break;
    case 'Processing':
       styles = 'bg-blue-50 text-blue-600 border-blue-100';
      break;
    case 'Submitted':
       styles = 'bg-amber-100 text-amber-700 border-amber-200';
      break;
    default:
       styles = 'bg-secondary text-secondary-foreground';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles} ${className}`}>
        {(status === JobStatus.Approved || status === JobStatus.Paid) && (
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
        )}
      {status}
    </span>
  );
};