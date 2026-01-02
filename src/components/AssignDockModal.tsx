'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface AssignDockModalProps {
  checkIn: {
    id: string;
    driver_name?: string;
    company?: string;
    dock_number?: string;
    appointment_time?: string | null;
    carrier_name?: string;
    reference_number?: string;
    driver_phone?: string;
    trailer_number?: string;
    trailer_length?: string;
    destination_city?: string;
    destination_state?: string;
    check_in_time?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
  isOpen: boolean;
}

interface DockInfo {
  dock_number: string;
  status: 'available' | 'in-use' | 'blocked';
  orders: Array<{ reference_number?: string; trailer_number?: string }>;
}

export default function AssignDockModal({ checkIn, onClose, onSuccess, isOpen }: AssignDockModalProps) {
  const [dockNumber, setDockNumber] = useState(checkIn.dock_number || '');
  const [appointmentTime, setAppointmentTime] = useState(checkIn.appointment_time || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dockInfo, setDockInfo] = useState<DockInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [checkingDock, setCheckingDock] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const dockOptions = [
    'Ramp',
    ...Array.from({ length: 70 }, (_, i) => (i + 1).toString())
  ];

  const appointmentOptions = [
    { value: '0800', label: '08:00 AM' },
    { value: '0900', label: '09:00 AM' },
    { value: '0930', label: '09:30 AM' },
    { value: '1000', label: '10:00 AM' },
    { value: '1030', label: '10:30 AM' },
    { value: '1100', label: '11:00 AM' },
    { value: '1230', label: '12:30 PM' },
    { value: '1300', label: '01:00 PM' },
    { value: '1330', label: '01:30 PM' },
    { value: '1400', label: '02:00 PM' },
    { value: '1430', label: '02:30 PM' },
    { value: '1500', label: '03:00 PM' },
    { value: '1550', label: '03:30 PM' },
    { value: 'work_in', label: 'Work In' },
    { value: 'paid_to_load', label: 'Paid to Load' },
    { value: 'paid_charge_customer', label: 'Paid - Charge Customer' },
    { value: 'LTL', label: 'LTL' }
  ];

  const formatAppointmentTime = (time: string) => {
    const option = appointmentOptions.find(opt => opt.value === time);
    return option ? option.label : time;
  };

  const formatCheckInTime = (t?: string | null) => {
    if (!t) return '';
    try {
      const d = new Date(t);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return t;
    }
  };

  const isOnTime = (): boolean | null => {
    const { appointment_time, check_in_time } = checkIn;
    if (!appointment_time || !check_in_time) return null;
    const appt = new Date(appointment_time).getTime();
    const checkInTimestamp = new Date(check_in_time).getTime();
    return checkInTimestamp <= appt;
  };

  useEffect(() => {
    if (dockNumber && dockNumber !== 'Ramp') {
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
            setDockInfo({ dock_number: dock, status: 'blocked', orders: [] });
            setShowWarning(true);
            setCheckingDock(false);
            return;
          }
        }
      }

      // Check if dock is in use
      const { data: existingOrders, error } = await supabase
        .from('check_ins')
        .select('reference_number, trailer_number')
        .eq('dock_number', dock)
        .in('status', ['checked_in', 'pending'])
        .neq('id', checkIn.id);

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
    } catch (err) {
      console.error('Error checking dock status:', err);
      setDockInfo(null);
      setShowWarning(false);
    } finally {
      setCheckingDock(false);
    }
  };

  const handleAssign = async () => {
    if (!dockNumber || !appointmentTime) {
      setError('Please select both dock number and appointment time');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('check_ins')
        .update({
          dock_number: dockNumber,
          appointment_time: appointmentTime,
          status: 'checked_in'
        })
        .eq('id', checkIn.id);

      if (updateError) throw updateError;

      // Trigger custom event for dock status update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dock-assignment-changed', {
          detail: { dockNumber, checkInId: checkIn.id }
        }));
      }

      printReceipt();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign dock');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the receipt');
      return;
    }

    const currentDate = new Date().toLocaleString();
    const dockDisplay = dockNumber === 'Ramp' ? 'Ramp' : `Dock ${dockNumber}`;
    const onTimeFlag = isOnTime();
    const appointmentStatus = onTimeFlag === null ? '' : onTimeFlag ? 'MADE' : 'MISSED';

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Load Assignment Receipt</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: 'Arial', monospace;
              padding: 20px;
              max-width: 420px;
              margin: 0 auto;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 12px;
              margin-bottom: 12px;
            }
            .receipt-header h1 {
              margin: 0;
              font-size: 20px;
            }
            .section {
              margin: 8px 0;
              padding: 6px 0;
              border-bottom: 1px dashed #bbb;
            }
            .section:last-child { border-bottom: none; }
            .row {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              margin: 6px 0;
            }
            .label {
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
              color: #333;
            }
            .value {
              text-align: right;
            }
            .pickup-box {
              background-color: #ffeb3b;
              padding: 12px;
              margin: 10px 0 6px;
              border: 2px solid #000;
              text-align: center;
            }
            .pickup-box .reference-number {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .pickup-box .dock-number {
              font-size: 16px;
              font-weight: bold;
            }
            .appointment-status {
              display: inline-block;
              padding: 4px 8px;
              font-weight: bold;
              border-radius: 4px;
            }
            .appointment-status.made {
              background-color: #4CAF50;
              color: white;
            }
            .appointment-status.missed {
              background-color: #f44336;
              color: white;
            }
            .print-button {
              display: block;
              margin: 12px auto 0;
              padding: 8px 20px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 14px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <h1>Load Assignment Receipt</h1>
            <div>${currentDate}</div>
          </div>
          <div class="pickup-box">
            <div class="reference-number">Pickup #: ${checkIn.reference_number ?? 'N/A'}</div>
            <div class="dock-number">${dockDisplay}</div>
          </div>
          ${appointmentStatus ? `
          <div class="section">
            <div class="row">
              <span class="label">Appointment Status</span>
              <span class="value">
                <span class="appointment-status ${appointmentStatus.toLowerCase()}">${appointmentStatus}</span>
              </span>
            </div>
          </div>
          ` : ''}
          <div class="section">
            ${checkIn.destination_city ? `
            <div class="row">
              <span class="label">Destination City</span>
              <span class="value">${checkIn.destination_city}</span>
            </div>
            ` : ''}
            ${checkIn.destination_state ? `
            <div class="row">
              <span class="label">Destination State</span>
              <span class="value">${checkIn.destination_state}</span>
            </div>
            ` : ''}
          </div>
          <div class="section">
            ${checkIn.carrier_name ? `
            <div class="row">
              <span class="label">Carrier</span>
              <span class="value">${checkIn.carrier_name}</span>
            </div>
            ` : ''}
            ${checkIn.driver_name ? `
            <div class="row">
              <span class="label">Driver</span>
              <span class="value">${checkIn.driver_name}</span>
            </div>
            ` : ''}
            ${checkIn.driver_phone ? `
            <div class="row">
              <span class="label">Driver Phone</span>
              <span class="value">${checkIn.driver_phone}</span>
            </div>
            ` : ''}
            ${checkIn.trailer_number ? `
            <div class="row">
              <span class="label">Trailer Number</span>
              <span class="value">${checkIn.trailer_number}</span>
            </div>
            ` : ''}
            ${checkIn.trailer_length ? `
            <div class="row">
              <span class="label">Trailer Length</span>
              <span class="value">${checkIn.trailer_length}</span>
            </div>
            ` : ''}
          </div>
          <div class="section">
            <div class="row">
              <span class="label">Appointment Time</span>
              <span class="value">${formatAppointmentTime(appointmentTime)}</span>
            </div>
            <div class="row">
              <span class="label">Check-in Time</span>
              <span class="value">${formatCheckInTime(checkIn.check_in_time)}</span>
            </div>
          </div>
          <button class="print-button no-print" onclick="window.print()">Print Receipt</button>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Assign Dock</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Check-in Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Load Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {checkIn.reference_number && (
                <div>
                  <span className="text-gray-600">PO Number:</span>
                  <span className="ml-2 font-medium">{checkIn.reference_number}</span>
                </div>
              )}
              {checkIn.driver_name && (
                <div>
                  <span className="text-gray-600">Driver:</span>
                  <span className="ml-2 font-medium">{checkIn.driver_name}</span>
                </div>
              )}
              {checkIn.carrier_name && (
                <div>
                  <span className="text-gray-600">Carrier:</span>
                  <span className="ml-2 font-medium">{checkIn.carrier_name}</span>
                </div>
              )}
              {checkIn.trailer_number && (
                <div>
                  <span className="text-gray-600">Trailer:</span>
                  <span className="ml-2 font-medium">{checkIn.trailer_number}</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Dock Selection */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dock Number *
              </label>
              <select
                value={dockNumber}
                onChange={(e) => setDockNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select Dock</option>
                {dockOptions.map((dock) => (
                  <option key={dock} value={dock}>
                    {dock === 'Ramp' ? 'Ramp' : `Dock ${dock}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Dock Status Indicator */}
            {checkingDock && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">Checking dock status...</p>
              </div>
            )}

            {dockInfo && !checkingDock && (
              <div className={`p-3 border rounded-lg ${
                dockInfo.status === 'available' ? 'bg-green-50 border-green-200' :
                dockInfo.status === 'blocked' ? 'bg-gray-50 border-gray-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">
                    {dockInfo.status === 'available' ? '✓ Dock Available' :
                     dockInfo.status === 'blocked' ? '🚫 Dock Blocked' :
                     '⚠ Dock In Use'}
                  </span>
                </div>
                {dockInfo.orders.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-gray-700">Current Orders:</p>
                    {dockInfo.orders.map((order, idx) => (
                      <p key={idx} className="text-xs text-gray-600">
                        • PO: {order.reference_number || 'N/A'} | Trailer: {order.trailer_number || 'N/A'}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Appointment Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Time *
              </label>
              <select
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select Time</option>
                {appointmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warning for in-use docks */}
          {showWarning && dockInfo?.status === 'in-use' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm font-medium">
                ⚠ Warning: This dock is currently in use. Assigning this load will create a double-booking.
              </p>
            </div>
          )}

          {/* Warning for blocked docks */}
          {showWarning && dockInfo?.status === 'blocked' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium">
                🚫 Warning: This dock is currently blocked and unavailable.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAssign}
              disabled={loading || !dockNumber || !appointmentTime || checkingDock || (dockInfo?.status === 'blocked')}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Assigning...' : 'Assign & Print Receipt'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
