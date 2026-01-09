// src/types/appointments.ts

export interface AppointmentInput {
  appointment_date: string;
  scheduled_time: string;
  sales_order: string;
  delivery: string;
  carrier: string;
  notes: string;
  source?: 'excel' | 'manual' | 'upload'; // Add this if you need it
}

export interface Appointment extends AppointmentInput {
  id: number;
  created_at: string;
  updated_at?: string;
  // any other fields that come from the database
}

export const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00'
] as const;


export type TimeSlot = typeof TIME_SLOTS[number];

