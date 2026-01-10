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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dockInfo, setDockInfo] = useState<DockInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [checkingDock, setCheckingDock] = useState(false);
  
  // SMS-related state
  const [sendSMS, setSendSMS] = useState(true);
  const [driverPhone, setDriverPhone] = useState(checkIn.driver_phone || '');
  const [smsStatus, setSmsStatus] = useState<string | null>(null);

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

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDockNumber(checkIn.dock_number || '');
      setDriverPhone(checkIn.driver_phone || '');
      setError(null);
      setSmsStatus(null);
      setShowWarning(false);
    }
  }, [isOpen, checkIn]);

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

  const sendSMSNotification = async (dock: string, phone: string) => {
    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phone,
          dockNumber: dock,
          driverName: checkIn.driver_name,
          referenceNumber: checkIn.reference_number,
          appointmentTime: checkIn.appointment_time ? formatAppointmentTime(checkIn.appointment_time) : 'N/A',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSmsStatus('SMS sent successfully ✓');
        return true;
      } else {
        setSmsStatus(`SMS failed: ${result.error}`);
        return false;
      }
    } catch (err) {
      console.error('Error sending SMS:', err);
      setSmsStatus('SMS sending failed');
      return false;
    }
  };

  const handleAssign = async () => {
    if (!dockNumber) {
      setError('Please select a dock number');
      return;
    }

    setLoading(true);
    setError(null);
    setSmsStatus(null);

    try {
      // THIS IS THE FIX - Include appointment_time in the update
      const { error: updateError } = await supabase
        .from('check_ins')
        .update({
          dock_number: dockNumber,
          status: 'checked_in',
          driver_phone: driverPhone,
          appointment_time: checkIn.appointment_time, // <-- ADD THIS LINE
        })
        .eq('id', checkIn.id);

      if (updateError) throw updateError;

      // Send SMS if enabled and phone number provided
      if (sendSMS && driverPhone) {
        await sendSMSNotification(dockNumber, driverPhone);
      }

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
            .reference-box {
              background-color: #ffeb3b;
              padding: 12px;
              margin: 10px 0 6px;
              border: 2px solid #000;
              text-align: center;
            }
            .reference-box .reference-number {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .reference-box .dock-number {
              font-size: 16px;
              font-weight: bold;
            }
            .print-button {
              display: block;
              margin: 20px auto;
              padding: 12px 24px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 16px;
              cursor: pointer;
            }
            .print-button:hover {
              background-color: #45a049;
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <h1>Load Assignment Receipt</h1>
            <p style="margin: 4px 0; font-size: 12px;">${currentDate}</p>
          </div>
          
          <div class="reference-box">
            <div class="reference-number">Ref: ${checkIn.reference_number || 'N/A'}</div>
            <div class="dock-number">${dockDisplay}</div>
          </div>

          <div class="section">
            <div class="row">
              <span class="label">Driver:</span>
              <span class="value">${checkIn.driver_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Carrier:</span>
              <span class="value">${checkIn.carrier_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Trailer:</span>
              <span class="value">${checkIn.trailer_number || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="row">
              <span class="label">Appointment:</span>
              <span class="value">${checkIn.appointment_time ? formatAppointmentTime(checkIn.appointment_time) : 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Check-In:</span>
              <span class="value">${formatCheckInTime(checkIn.check_in_time)}</span>
            </div>
          </div>

          <div class="section">
            <div class="row">
              <span class="label">Destination:</span>
              <span class="value">${checkIn.destination_city || ''} ${checkIn.destination_state || ''}</span>
            </div>
          </div>

          <button class="print-button no-print" onclick="window.print()">Print Receipt</button>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Assign Dock</h2>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm"><strong>Ref #:</strong> {checkIn.reference_number}</p>
          <p className="text-sm"><strong>Driver:</strong> {checkIn.driver_name}</p>
          <p className="text-sm"><strong>Carrier:</strong> {checkIn.carrier_name}</p>
          <p className="text-sm"><strong>Appointment:</strong> {checkIn.appointment_time ? formatAppointmentTime(checkIn.appointment_time) : 'N/A'}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {smsStatus && (
          <div className={`mb-4 p-3 rounded ${smsStatus.includes('success') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {smsStatus}
          </div>
        )}

        {showWarning && dockInfo && (
          <div className={`mb-4 p-3 rounded ${dockInfo.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {dockInfo.status === 'blocked' ? (
              <>⚠️ Dock {dockNumber} is currently blocked</>
            ) : (
              <>⚠️ Dock {dockNumber} is in use by: {dockInfo.orders.map(o => o.reference_number || o.trailer_number).join(', ')}</>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dock Number *
          </label>
          <select
            value={dockNumber}
            onChange={(e) => setDockNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || checkingDock}
          >
            <option value="">Select a dock</option>
            {dockOptions.map((dock) => (
              <option key={dock} value={dock}>
                {dock === 'Ramp' ? 'Ramp' : `Dock ${dock}`}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Driver Phone (for SMS)
          </label>
          <input
            type="tel"
            value={driverPhone}
            onChange={(e) => setDriverPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="(555) 555-5555"
            disabled={loading}
          />
        </div>

        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="sendSMS"
            checked={sendSMS}
            onChange={(e) => setSendSMS(e.target.checked)}
            className="mr-2"
            disabled={loading || !driverPhone}
          />
          <label htmlFor="sendSMS" className="text-sm text-gray-700">
            Send SMS notification to driver
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={loading || !dockNumber || checkingDock}
          >
            {loading ? 'Assigning...' : 'Assign Dock'}
          </button>
        </div>
      </div>
    </div>
  );
}
