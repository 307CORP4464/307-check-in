// src/components/StatusBadge.tsx

import { CheckInStatus } from '@/types';

interface StatusBadgeProps {
  status: CheckInStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    assigned: 'bg-blue-100 text-blue-800 border-blue-200',
    loading: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    departed: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const statusText = {
    pending: 'Pending',
    assigned: 'Assigned',
    loading: 'Loading',
    completed: 'Completed',
    departed: 'Departed',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${statusStyles[status]}`}>
      {statusText[status]}
    </span>
  );
}
