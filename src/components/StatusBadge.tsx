import React from 'react';

type CheckInStatus = 'pending' | 'assigned' | 'loading' | 'completed' | 'departed' | 'checked in';

interface StatusBadgeProps {
  status: CheckInStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: Record<CheckInStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    assigned: 'bg-blue-100 text-blue-800 border-blue-300',
    loading: 'bg-purple-100 text-purple-800 border-purple-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    departed: 'bg-gray-100 text-gray-800 border-gray-300',
    'checked in': 'bg-teal-100 text-teal-800 border-teal-300', // Add this line
  };

  const statusText: Record<CheckInStatus, string> = {
    pending: 'Pending',
    assigned: 'Assigned',
    loading: 'Loading',
    completed: 'Completed',
    departed: 'Departed',
    'checked in': 'Checked In', // Add this line
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${statusStyles[status]}`}>
      {statusText[status]}
    </span>
  );
};

export default StatusBadge;
