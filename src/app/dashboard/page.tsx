'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CSRDashboard from '@/components/CSRDashboard';

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = sessionStorage.getItem('csr_auth');
    
    if (!token) {
      router.push('/dashboard/login');
    } else {
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <CSRDashboard />;
}
