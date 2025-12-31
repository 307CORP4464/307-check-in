'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AssignDockModalProps {
  isOpen: boolean;
  onClose: () => void;
  logEntry: {
    id: string;
    po_number: string;
    driver_name: string;
  };
  onSuccess: () => void;
}

interface DockInfo {
  dock_number: string;
  status: 'available' | 'in-use' | 'blocked';
  orders: Array<{
    po_number: string;
    driver_name: string;
  }>;
}

export default function AssignDockModal({ isOpen, onClose, logEntry, onSuccess }: AssignDockModalProps) {
  const [dockNumber, setDockNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [dockInfo, setDockInfo] = useState<DockInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [checkingDock, setCheckingDock] = useState(false);

  useEffect(() => {
    if (dockNumber && dockNumber.length > 0) {
      checkDockStatus(dockNumber);
    } else {
      setDockInfo(null);
      setShowWarning(false);
    }
  }, [dockNumber]);

  const checkDockStatus = async (dock: string) => {
    setCheckingDock(true);
    try {
      // Check if dock is blocked
      if (typeof window !== 'undefined') {
        const blockedStr = localStorage.getItem('blocked_docks');
        if (blockedStr) {
          const blocked = JSON.parse(blockedStr);
          if (blocked[dock]) {
            setDockInfo({
              dock_number: dock,
              status: 'blocked',
              orders: []
            });
            setShowWarning(true);
            setCheckingDock(false);
            return;
          }
        }
      }

      // Check for existing orders on this dock
      const { data: existingOrders, error } = await supabase
        .from('daily_log')
        .select('po_number, driver_name, dock_number')
        .eq('dock_number', dock)
        .neq('status', 'complete');

      if (error) throw error;

      if (existingOrders && existingOrders.length > 0) {
        setDockInfo({
          dock_number: dock,
          status: 'in-use',
          orders: existingOrders
        });
        setShowWarning(true);
      } else {
        setDockInfo({
          dock_number: dock,
          status: 'available',
          orders: []
        });
        setShowWarning(false);
      }
    } catch (error) {
      console.error('Error checking dock status:', error);
    }
    setCheckingDock(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dockNumber.trim()) {
      alert('Please enter a dock number');
      return;
    }

    // If dock is blocked, don't allow assignment
    if (dockInfo?.status === 'blocked') {
      alert('This dock is currently blocked and cannot accept new assignments. Please choose a different dock or unblock it from the Dock Status page.');
      return;
    }

    // If dock is in use, require confirmation
    if (showWarning && dockInfo?.status === 'in-use') {
      const confirmDouble = window.confirm(
        `⚠️ WARNING: Dock ${dockNumber} is already in use!\n\n` +
        `Current orders on this dock:\n` +
        dockInfo.orders.map(o => `• PO: ${o.po_number} - ${o.driver_name}`).join('\n') +
        `\n\nAssigning another order will create a DOUBLE BOOKING.\n\n` +
        `Do you want to proceed with double booking this dock?`
      );

      if (!confirmDouble) {
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('daily_log')
        .update({ 
          dock_number: dockNumber.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', logEntry.id);

      if (error) throw error;

      onSuccess();
      onClose();
      setDockNumber('');
      setDockInfo(null);
      setShowWarning(false);
    } catch (error) {
      console.error('Error assigning dock:', error);
      alert('Failed to assign dock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Assign Dock
        </h3>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-700">
            <p className="font-medium">PO Number: {logEntry.po_number}</p>
            <p>Driver: {logEntry.driver_name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dock Number *
            </label>
            <input
              type="text"
              value={dockNumber}
              onChange={(e) => setDockNumber(e.target.value)}
              placeholder="Enter dock number (1-70)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
