'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkInFormSchema, CheckInFormValues } from '@/lib/validations';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function DriverCheckInForm() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInFormSchema),
  });

  const onSubmit = async (data: CheckInFormValues) => {
    setSubmitStatus('loading');
    setErrorMessage('');

    try {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('System not configured. Please contact support.');
      }

      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit check-in');
      }

      setSubmitStatus('success');
      reset();
      
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Driver Check-In
            </h1>
            <p className="text-gray-600">
              307 Warehouse - Please complete all fields
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <p className="text-green-800 font-semibold">Check-in successful!</p>
                <p className="text-green-700 text-sm">Please wait for dock assignment.</p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-600" size={24} />
              <div>
                <p className="text-red-800 font-semibold">Error</p>
                <p className="text-red-700 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Pickup Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Number *
              </label>
              <input
                {...register('pickup_number')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., PU123456"
              />
              {errors.pickup_number && (
                <p className="mt-1 text-sm text-red-600">{errors.pickup_number.message}</p>
              )}
            </div>

            {/* Carrier Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carrier Name *
              </label>
              <input
                {...register('carrier_name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ABC Trucking"
              />
              {errors.carrier_name && (
                <p className="mt-1 text-sm text-red-600">{errors.carrier_name.message}</p>
              )}
            </div>

            {/* Trailer Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trailer Number *
              </label>
              <input
                {...register('trailer_number')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., TRL-12345"
              />
              {errors.trailer_number && (
                <p className="mt-1 text-sm text-red-600">{errors.trailer_number.message}</p>
              )}
            </div>

            {/* Destination */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination City *
                </label>
                <input
                  {...register('destination_city')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Denver"
                />
                {errors.destination_city && (
                  <p className="mt-1 text-sm text-red-600">{errors.destination_city.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  {...register('destination_state')}
                  type="text"
                  maxLength={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="CO"
                />
                {errors.destination_state && (
                  <p className="mt-1 text-sm text-red-600">{errors.destination_state.message}</p>
                )}
              </div>
            </div>

            {/* Driver Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver Name *
              </label>
              <input
                {...register('driver_name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John Smith"
              />
              {errors.driver_name && (
                <p className="mt-1 text-sm text-red-600">{errors.driver_name.message}</p>
              )}
            </div>

            {/* Driver Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                {...register('driver_phone')}
                type="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
              {errors.driver_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.driver_phone.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitStatus === 'loading'}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitStatus === 'loading' ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Checking In...
                </>
              ) : (
                'Complete Check-In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
