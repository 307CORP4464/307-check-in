'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface OrderInfo {
  id: string;
  po_number: string;
  driver_name: string;
  status: string;
  check_in_time: string;
}

interface DockStatus {
  dock_number: string;
  status: 'available' | 'in-use' | 'double-booked' | 'blocked';
  orders: OrderInfo[];
  is_manually_blocked: boolean;
  blocked_reason?: string;
  current_load_id?: string | null;
}

const TOTAL_DOCKS = 70;

export default function DockStatusPage() {
  const [dockStatuses, setDockStatuses] = useState<DockStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedDock, setSelectedDock] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'in-use' | 'double-booked' | 'blocked'>('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    initializeDocks();
    
    const channel = supabase
      .channel('dock-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins'
        },
        () => {
          initializeDocks();
        }
      )
      .subscribe();

    const handleDockChange = () => initializeDocks();
    if (typeof window !== 'undefined') {
      window.addEventListener('dock-assignment-changed', handleDockChange);
    }

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('dock-assignment-changed', handleDockChange);
      }
    };
  }, []);

  const initializeDocks = async () => {
    setLoading(true);
    
    try {
      const allDocks: DockStatus[] = [];
      for (let i = 1; i <= TOTAL_DOCKS; i++) {
        allDocks.push({
          dock_number: i.toString(),
          status: 'available',
          orders: [],
          is_manually_blocked: false,
          blocked_reason: undefined,
          current_load_id: null
        });
      }

      const { data: checkIns } = await supabase
        .from('check_ins')
        .select('*')
        .in('status', ['checked_in', 'pending'])
        .not('dock_number', 'is', null);

      const dockMap = new Map<string, OrderInfo[]>();
      checkIns?.forEach(checkIn => {
        if (checkIn.dock_number && checkIn.dock_number !== 'Ramp') {
          const existing = dockMap.get(checkIn.dock_number) || [];
          existing.push({
            id: checkIn.id,
            po_number: checkIn.reference_number || 'N/A',
            driver_name: checkIn.driver_name || 'N/A',
            status: checkIn.status,
            check_in_time: checkIn.check_in_time
          });
          dockMap.set(checkIn.dock_number, existing);
        }
      });

      let blockedDocks: Record<string, { reason: string }> = {};
      if (typeof window !== 'undefined') {
        const blockedStr = localStorage.getItem('blocked_docks');
        if (blockedStr) {
          blockedDocks = JSON.parse(blockedStr);
        }
      }

      allDocks.forEach(dock => {
        const orders = dockMap.get(dock.dock_number) || [];
        
        if (blockedDocks[dock.dock_number]) {
          dock.status = 'blocked';
          dock.is_manually_blocked = true;
          dock.blocked_reason = blockedDocks[dock.dock_number].reason;
        } else if (orders.length > 1) {
          dock.status = 'double-booked';
        } else if (orders.length === 1) {
          dock.status = 'in-use';
        }
        
        dock.orders = orders;
        if (orders.length > 0) {
          dock.current_load_id = orders<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>.id;
        }
      });

      setDockStatuses(allDocks);
    } catch (error) {
      console.error('Error initializing docks:', error);
    }

    setLoading(false);
  };

  const handleBlockDock = (dockNumber: string) => {
    setSelectedDock(dockNumber);
    const dock = dockStatuses.find(d => d.dock_number === dockNumber);
    setBlockReason(dock?.blocked_reason || '');
    setShowBlockModal(true);
  };

  const handleUnblockDock = async (dockNumber: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const blockedStr = localStorage.getItem('blocked_docks');
      const blocked = blockedStr ? JSON.parse(blockedStr) : {};
      delete blocked[dockNumber];
      localStorage.setItem('blocked_docks', JSON.stringify(blocked));
      initializeDocks();
    } catch (error) {
      console.error('Error unblocking dock:', error);
    }
  };

  const submitBlockDock = () => {
    if (!selectedDock || !blockReason.trim()) {
      alert('Please enter a reason for blocking this dock');
      return;
    }

    if (typeof window === 'undefined') return;

    try {
      const blockedStr = localStorage.getItem('blocked_docks');
      const blocked = blockedStr ? JSON.parse(blockedStr) : {};
      blocked[selectedDock] = { reason: blockReason.trim() };
      localStorage.setItem('blocked_docks', JSON.stringify(blocked));
      
      setShowBlockModal(false);
      setSelectedDock(null);
      setBlockReason('');
      initializeDocks();
    } catch (error) {
      console.error('Error blocking dock:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in-use':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'double-booked':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'blocked':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return '✓';
      case 'in-use':
        return '●';
      case 'double-booked':
        return '⚠';
      case 'blocked':
        return '🚫';
      default:
        return '';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatCheckInTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return 'N/A';
    }
  };

  const filteredDocks = useMemo(() => {
    if (filter === 'all') return dockStatuses;
    return dockStatuses.filter(d => d.status === filter);
  }, [dockStatuses, filter]);

  const stats = useMemo(() => ({
    available: dockStatuses.filter(d => d.status === 'available').length,
    inUse: dockStatuses.filter(d => d.status === 'in-use').length,
    doubleBooked: dockStatuses.filter(d => d.status === 'double-booked').length,
    blocked: dockStatuses.filter(d => d.status === 'blocked').length,
  }), [dockStatuses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-md border-b-4 border-blue-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold text-blue-600">🚚</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dock Status Monitor</h1>
                  <p className="text-sm text-gray-600">Loading...</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/logs" className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-lg">
                  📋 Daily Logs
                </Link>
                <Link href="/dashboard" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg">
                  ← Dashboard
                </Link>
              </div>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-600">Loading dock statuses...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md border-b-4 border-blue-600 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold text-blue-600">🚚</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dock Status Monitor</h1>
                <p className="text-sm text-gray-600">{formatDate(currentTime)} • {formatTime(currentTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/logs" className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-lg">
                📋 Daily Logs
              </Link>
              <Link href="/dashboard" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg">
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-3xl font-bold text-green-700">{stats.available}</div>
              <div className="text-sm text-green-600 font-medium">Available</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <div className="text-3xl font-bold text-yellow-700">{stats.inUse}</div>
              <div className="text-sm text-yellow-600 font-medium">In Use</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <div className="text-3xl font-bold text-red-700">{stats.doubleBooked}</div>
              <div className="text-sm text-red-600 font-medium">Double Booked</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="text-3xl font-bold text-gray-700">{stats.blocked}</div>
              <div className="text-sm text-gray-600 font-medium">Blocked</div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            All Docks
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'available'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setFilter('in-use')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'in-use'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            In Use
          </button>
          <button
            onClick={() => setFilter('double-booked')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'double-booked'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Double Booked
          </button>
          <button
            onClick={() => setFilter('blocked')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'blocked'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Blocked
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
          {filteredDocks.map((dock) => (
            <div
              key={dock.dock_number}
              className={`relative p-4 rounded-lg border-2 shadow-sm hover:shadow-md transition-shadow ${getStatusColor(
                dock.status
              )}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">#{dock.dock_number}</span>
                <span className="text-2xl">{getStatusIcon(dock.status)}</span>
              </div>
              
              <div className="text-xs font-semibold uppercase mb-2">
                {dock.status.replace('-', ' ')}
              </div>

              {dock.is_manually_blocked && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Reason:</div>
                  <div className="text-xs text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                    {dock.blocked_reason}
                  </div>
                </div>
              )}

              {dock.orders.length > 0 && (
                <div className="space-y-2 mb-3">
                  {dock.orders.map((order, idx) => (
                    <div key={idx} className="text-xs bg-white bg-opacity-50 p-2 rounded">
                      <div className="font-semibold truncate">PO: {order.po_number}</div>
                      <div className="truncate">Driver: {order.driver_name}</div>
                      <div className="text-gray-600">{formatCheckInTime(order.check_in_time)}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {dock.is_manually_blocked ? (
                  <button
                    onClick={() => handleUnblockDock(dock.dock_number)}
                    className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => handleBlockDock(dock.dock_number)}
                    className="flex-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors"
                  >
                    Block
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Block Dock #{selectedDock}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for blocking:
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter reason..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setSelectedDock(null);
                  setBlockReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitBlockDock}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Block Dock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
