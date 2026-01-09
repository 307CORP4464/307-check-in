import { supabase } from './supabase';
import { Appointment, AppointmentInput } from '@/types/appointments';

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', date)
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      date: input.date,
      time: input.time,
      salesOrder: input.salesOrder,
      delivery: input.delivery,
      carrier: input.carrier || null,
      notes: input.notes || null,
      source: input.source || 'manual'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAppointment(
  id: number,
  input: Partial<AppointmentInput>
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update({
      date: input.date,
      time: input.time,
      salesOrder: input.salesOrder,
      delivery: input.delivery,
      carrier: input.carrier,
      notes: input.notes
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAppointment(id: number): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function checkDuplicateAppointment(
  date: string,
  time: string,
  salesOrder?: string,
  delivery?: string
): Promise<boolean> {
  const query = supabase
    .from('appointments')
    .select('id')
    .eq('date', date)
    .eq('time', time);

  if (salesOrder) {
    query.eq('salesOrder', salesOrder);
  }
  if (delivery) {
    query.eq('delivery', delivery);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data?.length || 0) > 0;
}
