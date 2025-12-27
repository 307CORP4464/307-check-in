'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import Link from 'next/link';
import StatusChangeModal from './StatusChangeModal';

const TIMEZONE = 'America/New_York';

const formatTimeInIndianapolis = (isoString: string, includeDate: boolean = false): string => {
  try {
    const date = new Date(isoString);
    
    // Get the UTC timestamp in milliseconds
    const utcMs = date.getTime();
    
    // EST offset is -5 hours = -5 * 60 * 60 * 1000 milliseconds
    const estOffsetMs = -5 * 60 * 60 * 1000;
    
    // Create EST date
    const estDate = new Date(utcMs + estOffsetMs);
    
    // Extract components from EST date
    const hours = String(estDate.getUTCHours()).padStart(2, '0');
    const minutes = String(estDate.getUTCMinutes()).padStart(2, '0');
    
    if (includeDate) {
      const month = String(estDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(estDate.getUTCDate()).padStart(2, '0');
      return `${month}/${day} ${hours}:${minutes}`;
    }
    
    return `${hours}:${minutes}`;
  } catch (e) {
    console.error('Time conversion error:', e, isoString);
    return isoString;
  }
};

interface CheckIn {
  id: string;
  check_in_time: string;
  check_out_time?: string | null;
  status: string;
  driver_name?: string;
  driver_phone?: string;
  carrier_name?: string;
  trailer_number?: string;
  trailer_length?: string;
  load_type?: 'inbound' | 'outbound';
  pickup_number?: string;
  dock_number?: string;
  appointment_time?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string;
  destination_city?: string;
  destination_state?: string;
}

export default function DailyLog() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  
  const getCurrentDateInIndianapolis = () => {
    const now = new Date();
    const estDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - (5 * 3600000));
    const year = estDate.getFullYear();
    const month = String(estDate.getMonth() + 1).padStart(2, '0');
    const day = String(estDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDateInIndianapolis());
  const [selectedForStatusChange, setSelectedForStatusChange] = useState<CheckIn | null>(null);
  const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
      } else {
        router.push('/login');
      }
    };
    getUser();
  }, [supabase, router]);

  useEffect(() => {
    fetchCheckInsForDate();
  }, [selectedDate, supabase]);

  const fetchCheckInsForDate = async () => {
    try {
      setLoading(true);
      
      const startOfDayIndy = zonedTimeToUtc(`${selectedDate} 00:00:00`, TIMEZONE);
      const endOfDayIndy = zonedTimeToUtc(`${selectedDate} 23:59:59`, TIMEZONE);

      const { data, error } = await supabase
