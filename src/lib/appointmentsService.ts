import { createBrowserClient } from '@supabase/ssr';
import { Appointment, AppointmentInput } from '@/types/appointments';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TIME_ORDER = {
  '08:00': 1, '09:00': 2, '09:30': 3, '10:00': 4, '10:30': 5,
  '11:00': 6, '12:30': 7, '13:00': 8, '13:30': 9, '14:00': 10,
  '14:30': 11, '15:00': 12, '15:30': 13, 'Work In': 14
};

// Check for duplicate appointments
export const checkDuplicateAppointment = async (
  salesOrder: string,
  delivery: string,
  date: string,
  excludeId?: number
): Promise<Appointment | null> => {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', date);

    // Build OR condition for sales_order or delivery
    if (salesOrder && delivery) {
      query = query.or(`sales_order.eq.${salesOrder},delivery.eq.${delivery}`);
    } else if (salesOrder) {
      query = query.eq('sales_order', salesOrder);
    } else if (delivery) {
      query = query.eq('delivery', delivery);
    } else {
      return null;
    }

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    
    if (error) {
      console.error('Error checking duplicates:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in checkDuplicateAppointment:', error);
    return null;
  }
};

// Get load status from daily logs
export const getLoadStatusFromLog = async (
  salesOrder: string,
  delivery: string
): Promise<string | null> => {
  try {
    if (!salesOrder && !delivery) return null;

    let query = supabase
      .from('daily_logs')
      .select('load_status')
      .order('created_at', { ascending: false })
      .limit(1);

    if (salesOrder && delivery) {
      query = query.or(`sales_order.eq.${salesOrder},delivery_number.eq.${delivery}`);
    } else if (salesOrder) {
      query = query.eq('sales_order', salesOrder);
    } else if (delivery) {
      query = query.eq('delivery_number', delivery);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching load status:', error);
      return null;
    }

    return data?.load_status || null;
  } catch (error) {
    console.error('Error in getLoadStatusFromLog:', error);
    return null;
  }
};

// Create appointment
export const createAppointment = async (data: AppointmentInput & { source: string }) => {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return appointment;
};

// Update appointment
export const updateAppointment = async (id: number, data: AppointmentInput) => {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return appointment;
};

// Delete appointment
export const deleteAppointment = async (id: number) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Clean old appointments
export async function cleanOldAppointments() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  await supabase
    .from('appointments')
    .delete()
    .lt('appointment_date', sevenDaysAgo.toISOString().split('T')[0]);
}

// Get appointments by date (single definition)
export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  await cleanOldAppointments();
  
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('appointment_date', date);
  
  if (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
  
  // Sort by time slot order
  return (data || []).sort((a, b) => {
    const orderA = TIME_ORDER[a.scheduled_time as keyof typeof TIME_ORDER] || 99;
    const orderB = TIME_ORDER[b.scheduled_time as keyof typeof TIME_ORDER] || 99;
    return orderA - orderB;
  });
}

// Find appointment by reference
export async function findAppointmentByReference(reference: string): Promise<Appointment | null> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('appointment_date', today)
    .or(`sales_order.eq.${reference},delivery.eq.${reference}`)
    .maybeSingle();
  
  if (error) {
    console.error('Error finding appointment:', error);
    return null;
  }
  
  return data;
}

