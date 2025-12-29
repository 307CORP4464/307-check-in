'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface FormData {
  driverName: string;
  driverPhone: string;
  carrierName: string;
  trailerNumber: string;
  trailerLength: string;
  pickupNumber: string;
  loadType: 'inbound' | 'outbound';
  destinationCity: string;
  destinationState: string;
}

export default function DriverCheckInForm() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [formData, setFormData] = useState<FormData>({
    driverName: '',
    driverPhone: '',
    carrierName: '',
    trailerNumber: '',
    trailerLength: '',
    pickupNumber: '',
    loadType: 'inbound',
    destinationCity: '',
    destinationState: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const validatePickupNumber = (value: string): boolean => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    
    const patterns = [
      /^2\d{6}$/,
      /^4\d{6}$/,
      /^44\d{8}$/,
      /^8\d{7}$/,
      /^TLNA-SO-00\d{4}$/,
      /^\d{6}$/
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'pickupNumber') {
      if (value && !validatePickupNumber(value)) {
        setPickupError('Invalid format. Must match: 2xxxxxx, 4xxxxxx, 44xxxxxxxx, 8xxxxxxx, TLNA-SO-00xxxx, or xxxxxx');
      } else {
        setPickupError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!validatePickupNumber(formData.pickupNumber)) {
      setError('Invalid pickup number format');
      setLoading(false);
      return;
    }

    try {
      // Store as ISO string - let the database handle it
      const checkInTime = new Date().toISOString();

      const { data, error: insertError } = await supabase
        .from('check_ins')
        .insert([
          {
            driver_name: formData.driverName,
            driver_phone: formData.driverPhone,
            carrier_name: formData.carrierName,
            trailer_number: formData.trailerNumber,
            trailer_length: formData.trailerLength,
            pickup_number: formData.pickupNumber,
            load_type: formData.loadType,
            destination_city: formData.destinationCity,
            destination_state: formData.destinationState,
            check_in_time: checkInTime,
            status: 'pending',
          }
        ])
        .select();

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
  driverName: '',
  driverPhone: '',
  carrierName: '',
  trailerNumber: '',  // ← ADD THIS LINE
  trailerLength: '',
  pickupNumber: '',
  loadType: 'inbound',
  destinationCity: '',
  destinationState: '',
});

      setPickupError(null);

      setTimeout(() => {
        setSuccess(false);
      }, 5000);

    } catch (err) {
      console.error('Error checking in:', err);
      setError(err instanceof Error ? err.message : 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">Driver Check-In</h1>
          <p className="text-gray-600 text-center mt-2">Please fill out all required information</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            <p className="font-bold">Success!</p>
            <p>You have been checked in successfully. Please wait for dock assignment.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Load Type */}
          <div>
            <label htmlFor="loadType" className="block text-sm font-medium text-gray-700 mb-2">
              Load Type <span className="text-red-500">*</span>
            </label>
            <select
              id="loadType"
              name="loadType"
              value={formData.loadType}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="inbound">Inbound Delivery</option>
              <option value="outbound">Outbound Pickup</option>
            </select>
          </div>

          {/* Driver Name */}
          <div>
            <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-2">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="driverName"
              name="driverName"
              value={formData.driverName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter driver name"
            />
          </div>

          {/* Driver Phone */}
          <div>
            <label htmlFor="driverPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Driver Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="driverPhone"
              name="driverPhone"
              value={formData.driverPhone}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Carrier Name */}
          <div>
            <label htmlFor="carrierName" className="block text-sm font-medium text-gray-700 mb-2">
              Carrier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="carrierName"
              name="carrierName"
              value={formData.carrierName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter carrier name"
            />
          </div>

          {/* Trailer Number */}
          <div>
            <label htmlFor="trailerNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Trailer Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="trailerNumber"
              name="trailerNumber"
              value={formData.trailerNumber}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter trailer number"
            />
          </div>

          {/* Trailer Length */}
          <div>
            <label htmlFor="trailerLength" className="block text-sm font-medium text-gray-700 mb-2">
              Trailer Length <span className="text-red-500">*</span>
            </label>
            <select
              id="trailerLength"
              name="trailerLength"
              value={formData.trailerLength}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select trailer length</option>
              <option value="Box">Box Truck</option>
              <option value="20">20 ft</option>
              <option value="40">40 ft</option>
              <option value='45">45 ft</option>
              <option value="48">48 ft</option>
              <option value="53">53 ft</option>
            </select>
          </div>

          {/* Pickup Number */}
          <div>
            <label htmlFor="pickupNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="pickupNumber"
              name="pickupNumber"
              value={formData.pickupNumber}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter pickup number"
            />
            {pickupError && (
              <p className="text-red-500 text-sm mt-1">{pickupError}</p>
            )}
          </div>

          {/* Destination City */}
          <div>
            <label htmlFor="destinationCity" className="block text-sm font-medium text-gray-700 mb-2">
              Destination City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="destinationCity"
              name="destinationCity"
              value={formData.destinationCity}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter destination city"
            />
          </div>

          {/* Destination State */}
          <div>
            <label htmlFor="destinationState" className="block text-sm font-medium text-gray-700 mb-2">
              Destination State <span className="text-red-500">*</span>
            </label>
            <select
              id="destinationState"
              name="destinationState"
              value={formData.destinationState}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select state</option>
              {usStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!pickupError}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg transition-colors"
          >
            {loading ? 'Checking In...' : 'Check In'}
          </button>
        </form>
      </div>
    </div>
  );
}
