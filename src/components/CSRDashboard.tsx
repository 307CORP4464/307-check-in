'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { utcToZonedTime, format } from 'date-fns-tz';

const TIMEZONE = 'America/Indiana/Indianapolis';

interface CheckIn {
  id: string;
  user_id: string;
  check_in_time: string;
  user_name?: string;
  email?: string;
}

export default function Dashboard() {
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchRecentCheckIns();
  }, []);

  const fetchRecentCheckIns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .order('check_in_time', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching check-ins:', error);
    } else {
      setRecentCheckIns(data || []);
    }
    setLoading(false);
  };

  const formatCheckInTime = (utcTimeString: string) => {
    const utcDate = new Date(utcTimeString);
    const indianaTime = utcToZonedTime(utcDate, TIMEZONE);
    return format(indianaTime, 'HH:mm:ss', { timeZone: TIMEZONE });
  };

  const formatCheckInDateTime = (utcTimeString: string) => {
    const utcDate = new Date(utcTimeString);
    const indianaTime = utcToZonedTime(utcDate, TIMEZONE);
    return format(indianaTime, 'MMM dd, yyyy HH:mm:ss', { timeZone: TIMEZONE });
  };

  const formatCurrentTime = () => {
    const indianaTime = utcToZonedTime(currentTime, TIMEZONE);
    return format(indianaTime, 'HH:mm:ss', { timeZone: TIMEZONE });
  };

  const formatCurrentDate = () => {
    const indianaTime = utcToZonedTime(currentTime, TIMEZONE);
    return format(indianaTime, 'EEEE, MMMM dd, yyyy', { timeZone: TIMEZONE });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-blue-100">Welcome back! Here's today's activity.</p>
          </div>
          <div className="text-right bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm text-blue-100 mb-1">Current Time (Indiana)</p>
            <p className="text-3xl font-bold">{formatCurrentTime()}</p>
            <p className="text-sm text-blue-100 mt-1">{formatCurrentDate()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Check-Ins Today</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{recentCheckIns.length}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Last Check-In</p>
              <p className="text-xl font-bold text-gray-800 mt-2">
                {recentCheckIns.length > 0 ? formatCheckInTime(recentCheckIns<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>.check_in_time) : '--:--:--'}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{recentCheckIns.length}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Recent Check-Ins</h2>
          <button
            onClick={fetchRecentCheckIns}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {recentCheckIns.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-md">
            <p className="text-gray-500 text-lg">No check-ins yet today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In Time (Indiana)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentCheckIns.map((checkIn, index) => (
                  <tr key={checkIn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {checkIn.user_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {checkIn.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-bold text-blue-600 text-lg">
                          {formatCheckInTime(checkIn.check_in_time)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCheckInDateTime(checkIn.check_in_time)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

