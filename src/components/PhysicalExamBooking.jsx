import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const PhysicalExamBooking = ({ isOpen, onClose, applicationId, currentBooking }) => {
  const { language } = useApp();
  const [step, setStep] = useState(currentBooking ? 'schedule' : 'centers'); // centers, schedule, confirm, success
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime] = useState('09:00'); // Fixed time at 9 AM
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [timeSlots] = useState([
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ]);

  useEffect(() => {
    if (isOpen) {
      loadCenters();
      generateAvailableDates();
    }
  }, [isOpen]);

  const loadCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('test_centers_with_rush')
        .select('*')
        .order('division', { ascending: true });

      if (error) throw error;
      setCenters(data || []);
    } catch (err) {
      console.error('Error loading centers:', err);
      setError('Failed to load test centers');
    }
  };

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) { // Next 30 days
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      // Skip Fridays and Saturdays
      if (date.getDay() !== 5 && date.getDay() !== 6) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    setAvailableDates(dates);
  };

  const getUserLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userPos);
          setMapCenter([userPos.lat, userPos.lng]);
          setSortByDistance(true);
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location. Please enable location services.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getSortedCenters = () => {
    if (!sortByDistance || !userLocation) return centers;
    
    return [...centers].sort((a, b) => {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      return distA - distB;
    });
  };

  const getRushBadge = (rushLevel) => {
    const badges = {
      low: { bg: 'bg-green-100', text: 'text-green-700', icon: '🟢', label: 'Low Rush' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡', label: 'Medium Rush' },
      high: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴', label: 'High Rush' },
    };
    const badge = badges[rushLevel] || badges.low;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const handleSelectCenter = (center) => {
    setSelectedCenter(center);
    setMapCenter([center.latitude, center.longitude]);
    setStep('schedule');
  };

  const handleBooking = async () => {
    if (!selectedCenter || !selectedDate || !selectedTime) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('physical_exam_bookings')
        .insert([{
          application_id: applicationId,
          user_id: userData.user.id,
          test_center_id: selectedCenter.id,
          exam_date: selectedDate,
          status: 'scheduled'
        }]);

      if (error) throw error;

      // Update license_applications
      await supabase
        .from('license_applications')
        .update({ 
          physical_exam: 1,
          status: 'physical_exam_scheduled'
        })
        .eq('id', applicationId);

      // Send notifications
      await supabase.rpc('create_dual_notification', {
        p_user_id: userData.user.id,
        p_title: 'Physical Exam Scheduled ✅',
        p_message: `Your physical driving exam is scheduled for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${selectedCenter.center_name_en}. Please arrive at 9:00 AM sharp. Bring your NID and application documents.`,
        p_admin_title: 'New Physical Exam Booking 🚗',
        p_admin_message: `New exam booking at ${selectedCenter.center_name_en} on ${new Date(selectedDate).toLocaleDateString()}. Candidate will arrive at 9:00 AM. Check Physical Exams tab for details.`,
      });

      setStep('success');
    } catch (err) {
      console.error('Error booking exam:', err);
      setError('Failed to book exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBooking = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select date and time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('physical_exam_bookings')
        .update({
          exam_date: selectedDate,
          status: 'rescheduled'
        })
        .eq('id', currentBooking.id);

      if (error) throw error;

      setStep('success');
    } catch (err) {
      console.error('Error updating booking:', err);
      setError('Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('physical_exam_bookings')
        .update({ status: 'cancelled' })
        .eq('id', currentBooking.id);

      if (error) throw error;

      await supabase
        .from('license_applications')
        .update({ physical_exam: 0 })
        .eq('id', applicationId);

      onClose();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError('Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const renderCentersStep = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">🗺️ Select Test Center</h3>
        <button
          onClick={getUserLocation}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
        >
          📍 Near Me
        </button>
      </div>

      {/* Map */}
      <div className="h-64 rounded-lg overflow-hidden border-2 border-gray-200">
        <MapContainer center={mapCenter} zoom={userLocation ? 10 : 7} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userLocation && (
            <>
              <Circle center={[userLocation.lat, userLocation.lng]} radius={50000} color="#10b981" fillOpacity={0.1} />
              <Marker 
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: 'custom-user-marker',
                  html: '<div style="background-color: #ef4444; width: 30px; height: 30px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                  iconSize: [30, 30],
                  iconAnchor: [15, 15],
                })}
              >
                <Popup>📍 Your Location</Popup>
              </Marker>
            </>
          )}
          {getSortedCenters().map(center => (
            <Marker key={center.id} position={[center.latitude, center.longitude]}>
              <Popup>
                <strong>{center.center_name_en}</strong><br/>
                {center.address_en}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Centers List */}
      <div className="max-h-96 overflow-y-auto space-y-3">
        {getSortedCenters().map((center) => {
          const distance = userLocation ? 
            calculateDistance(userLocation.lat, userLocation.lng, center.latitude, center.longitude) : null;
          
          return (
            <motion.div
              key={center.id}
              whileHover={{ scale: 1.02 }}
              className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
              onClick={() => handleSelectCenter(center)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">{center.center_name_en}</h4>
                  <p className="text-sm text-gray-600 mt-1">{center.office_name_en}</p>
                  <p className="text-sm text-gray-500">{center.address_en}</p>
                  <p className="text-sm text-gray-500 mt-1">📞 {center.phone}</p>
                  {distance && (
                    <p className="text-sm text-blue-600 font-semibold mt-1">
                      📏 {distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  {getRushBadge(center.rush_level)}
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {center.upcoming_bookings} booked
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderScheduleStep = () => (
    <div className="space-y-4">
      <button
        onClick={() => setStep('centers')}
        className="text-blue-600 hover:underline flex items-center gap-2"
      >
        ← Back to Centers
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-gray-800">📍 Selected Center</h4>
        <p className="text-sm text-gray-700 mt-1">{selectedCenter?.center_name_en}</p>
        <p className="text-sm text-gray-600">{selectedCenter?.address_en}</p>
        <div className="mt-2">{getRushBadge(selectedCenter?.rush_level)}</div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          📅 Select Date *
        </label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Choose a date...</option>
          {availableDates.map(date => (
            <option key={date} value={date}>
              {new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          ⏰ <strong>Exam Time:</strong> All physical exams start at <span className="font-bold text-blue-600">9:00 AM</span>
        </p>
        <p className="text-xs text-gray-600 mt-1">Please arrive 15 minutes early</p>
      </div>

      <button
        onClick={() => setStep('confirm')}
        disabled={!selectedDate}
        className="w-full px-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-bold text-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue to Confirm →
      </button>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <button
        onClick={() => setStep('schedule')}
        className="text-blue-600 hover:underline flex items-center gap-2"
      >
        ← Back to Schedule
      </button>

      <h3 className="text-2xl font-bold text-center">✅ Confirm Your Booking</h3>

      <div className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-600">Test Center</p>
          <p className="font-bold text-lg">{selectedCenter?.center_name_en}</p>
          <p className="text-sm text-gray-600">{selectedCenter?.address_en}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600">Date & Time</p>
          <p className="font-bold text-lg">
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="font-bold text-blue-600 text-xl mt-1">Come at 9:00 AM</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Contact</p>
          <p className="font-semibold">📞 {selectedCenter?.phone}</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Important:</strong> Please arrive 15 minutes before your scheduled time. Bring your NID and application number.
        </p>
      </div>

      <button
        onClick={currentBooking ? handleUpdateBooking : handleBooking}
        disabled={loading}
        className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-bold text-lg hover:shadow-lg disabled:opacity-50"
      >
        {loading ? 'Booking...' : (currentBooking ? '✓ Update Booking' : '✓ Confirm Booking')}
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center py-8 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-8xl"
      >
        ✅
      </motion.div>
      <h2 className="text-3xl font-bold text-green-600">
        {currentBooking ? 'Booking Updated!' : 'Booking Confirmed!'}
      </h2>
      <p className="text-gray-600">
        Your physical exam has been successfully {currentBooking ? 'updated' : 'scheduled'}.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <p className="font-bold text-lg">{selectedCenter?.center_name_en}</p>
        <p className="text-gray-700 mt-2">
          📅 {new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        <p className="text-blue-600 font-bold text-xl mt-2">⏰ Come at 9:00 AM</p>
      </div>
      <button
        onClick={() => {
          onClose();
          setTimeout(() => window.location.reload(), 500);
        }}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-bold hover:shadow-lg"
      >
        Done
      </button>
    </div>
  );

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
            <h2 className="text-2xl font-bold text-gray-800">
              🚗 Physical Driving Exam
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {step === 'centers' && renderCentersStep()}
            {step === 'schedule' && renderScheduleStep()}
            {step === 'confirm' && renderConfirmStep()}
            {step === 'success' && renderSuccessStep()}
          </div>

          {currentBooking && (step === 'centers' || step === 'schedule') && (
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-700">Current Booking:</p>
                <p className="text-sm text-gray-600 mt-1">
                  📅 {new Date(currentBooking.exam_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={handleCancelBooking}
                disabled={loading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                🗑️ Cancel This Booking
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default PhysicalExamBooking;
