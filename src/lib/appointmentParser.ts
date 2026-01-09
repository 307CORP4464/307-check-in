import { AppointmentInput } from '@/types/appointments';

/**
 * Parse appointments from uploaded text file
 * Expected format: Each line contains appointment data
 */
export function parseAppointments(text: string): AppointmentInput[] {
  const appointments: AppointmentInput[] = [];
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      // Skip header lines or empty lines
      if (!line.trim() || line.toLowerCase().includes('appointment') || line.toLowerCase().includes('date')) {
        continue;
      }

      // Parse line - adjust this format based on your actual file format
      // Common formats:
      // 1. Tab-separated: DATE\tTIME\tSALES_ORDER\tDELIVERY\tCARRIER\tNOTES
      // 2. Comma-separated: DATE,TIME,SALES_ORDER,DELIVERY,CARRIER,NOTES
      // 3. Pipe-separated: DATE|TIME|SALES_ORDER|DELIVERY|CARRIER|NOTES
      
      const parts = line.split(/[\t,|]/).map(p => p.trim());
      
      if (parts.length < 2) continue; // Need at least date and time

      const [date, time, salesOrder, delivery, carrier, ...notesParts] = parts;
      
      // Validate date format (YYYY-MM-DD)
      const dateMatch = date.match(/^\d{4}-\d{2}-\d{2}$/);
      if (!dateMatch) {
        console.warn(`Invalid date format: ${date}`);
        continue;
      }

      // Normalize time format to HH:MM
      let normalizedTime = normalizeTime(time);
      if (!normalizedTime) {
        console.warn(`Invalid time format: ${time}`);
        continue;
      }

      const appointment: AppointmentInput = {
        appointment_date: date,
        scheduled_time: normalizedTime,
        sales_order: salesOrder || '',
        delivery: delivery || '',
        carrier: carrier || '',
        notes: notesParts.join(' ').trim() || ''
      };

      appointments.push(appointment);
    } catch (error) {
      console.error('Error parsing line:', line, error);
    }
  }

  return appointments;
}

/**
 * Normalize time to HH:MM format or valid time slot
 */
function normalizeTime(time: string): string | null {
  if (!time) return null;

  // Remove spaces and convert to uppercase
  const cleaned = time.trim().toUpperCase();

  // Handle "Work In" special case
  if (cleaned === 'WORK IN' || cleaned === 'WORKIN') {
    return 'Work In';
  }

  // Try to parse common time formats
  // Format: HH:MM, HHMM, HH:MM AM/PM, H:MM AM/PM
  let match;

  // Format: HHMM (e.g., "0800", "1430")
  match = cleaned.match(/^(\d{2})(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${match[1]}:${match[2]}`;
    }
  }

  // Format: HH:MM (e.g., "08:00", "14:30")
  match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${match[2]}`;
    }
  }

  // Format: HH:MM AM/PM (e.g., "8:00 AM", "2:30 PM")
  match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const meridiem = match[3];

    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    if (hours >= 0 && hours < 24) {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  }

  // Map common time slots
  const timeSlotMap: Record<string, string> = {
    '6AM': '06:00',
    '7AM': '07:00',
    '8AM': '08:00',
    '9AM': '09:00',
    '930AM': '09:30',
    '10AM': '10:00',
    '1030AM': '10:30',
    '11AM': '11:00',
    '1230PM': '12:30',
    '1PM': '13:00',
    '130PM': '13:30',
    '2PM': '14:00',
    '230PM': '14:30',
    '3PM': '15:00',
    '330PM': '15:30'
  };

  if (timeSlotMap[cleaned]) {
    return timeSlotMap[cleaned];
  }

  console.warn(`Could not normalize time: ${time}`);
  return null;
}

/**
 * Parse appointments from JSON format
 */
export function parseAppointmentsJSON(jsonString: string): AppointmentInput[] {
  try {
    const data = JSON.parse(jsonString);
    
    if (Array.isArray(data)) {
      return data.map(item => ({
        appointment_date: item.appointment_date || item.date,
        scheduled_time: normalizeTime(item.scheduled_time || item.time) || '08:00',
        sales_order: item.sales_order || item.salesOrder || '',
        delivery: item.delivery || item.deliveryNumber || '',
        carrier: item.carrier || '',
        notes: item.notes || ''
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return [];
  }
}

/**
 * Validate appointment data
 */
export function validateAppointment(appointment: AppointmentInput): string[] {
  const errors: string[] = [];

  if (!appointment.appointment_date) {
    errors.push('Appointment date is required');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment.appointment_date)) {
    errors.push('Invalid date format (expected YYYY-MM-DD)');
  }

  if (!appointment.scheduled_time) {
    errors.push('Scheduled time is required');
  }

  if (!appointment.sales_order && !appointment.delivery) {
    errors.push('Either sales order or delivery number is required');
  }

  return errors;
}
