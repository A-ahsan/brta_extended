import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

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
  const [selectedCenter, setSelectedCenter] = useState(currentBooking?.test_centers || null);
  const [selectedDate, setSelectedDate] = useState(currentBooking?.exam_date || '');
  const [selectedTime] = useState('09:00'); // Fixed time at 9 AM
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
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

      // Get application data for DL number
      const { data: applicationData } = await supabase
        .from('license_applications')
        .select('application_number')
        .eq('id', applicationId)
        .single();

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

      // Get current user for notification
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Send notifications
      if (currentUser) {
        console.log('Sending notification for user:', currentUser.id);
        const dlNumber = applicationData?.application_number || 'N/A';
        console.log('DL Number:', dlNumber);
        const { data: notifData, error: notifError } = await supabase.rpc('create_dual_notification', {
          p_user_id: currentUser.id,
          p_title_en: 'Physical Exam Scheduled',
          p_title_bn: 'শারীরিক পরীক্ষা নির্ধারিত',
          p_message_en: `Your physical driving exam is scheduled for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${selectedCenter.center_name_en}. Please arrive at 9:00 AM sharp. Bring your NID and application documents.`,
          p_message_bn: `আপনার শারীরিক ড্রাইভিং পরীক্ষা ${new Date(selectedDate).toLocaleDateString('bn-BD')} তারিখে ${selectedCenter.center_name_bn}-এ নির্ধারিত হয়েছে। সকাল ৯:০০ টায় উপস্থিত হন। আপনার NID এবং আবেদন নথি সঙ্গে আনুন।`,
          p_type: 'exam',
          p_application_id: applicationId,
          p_action_url: null,
          p_admin_title_en: 'New Physical Exam Booking',
          p_admin_title_bn: 'নতুন শারীরিক পরীক্ষা বুকিং',
          p_admin_message_en: `New exam booking (DL: ${dlNumber}) at ${selectedCenter.center_name_en} on ${new Date(selectedDate).toLocaleDateString()}. Candidate will arrive at 9:00 AM. Check Physical Exams tab for details.`,
          p_admin_message_bn: `${selectedCenter.center_name_bn}-এ ${new Date(selectedDate).toLocaleDateString('bn-BD')} তারিখে নতুন পরীক্ষা বুকিং (DL: ${dlNumber})। প্রার্থী সকাল ৯:০০ টায় আসবে। বিস্তারিত জানতে শারীরিক পরীক্ষা ট্যাব দেখুন।`,
        });
        
        if (notifError) {
          console.error('Notification error:', notifError);
        } else {
          console.log('Notification sent successfully:', notifData);
        }
      }

      setStep('success');
    } catch (err) {
      console.error('Error booking exam:', err);
      setError('Failed to book exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBooking = async () => {
    if (!selectedDate) {
      setError('Please select date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('physical_exam_bookings')
        .update({
          test_center_id: selectedCenter.id,
          exam_date: selectedDate,
          status: 'scheduled'
        })
        .eq('id', currentBooking.id);

      if (error) throw error;

      // Get current user for notification
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Get application data for DL number
      const { data: applicationData } = await supabase
        .from('license_applications')
        .select('application_number')
        .eq('id', applicationId)
        .single();

      // Send notifications for rescheduling
      if (currentUser) {
        const dlNumber = applicationData?.application_number || 'N/A';
        await supabase.rpc('create_dual_notification', {
          p_user_id: currentUser.id,
          p_title_en: 'Exam Rescheduled',
          p_title_bn: 'পরীক্ষা পুনঃনির্ধারিত',
          p_message_en: `Your physical exam has been rescheduled to ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${selectedCenter.center_name_en}. Arrive at 9:00 AM.`,
          p_message_bn: `আপনার শারীরিক পরীক্ষা ${new Date(selectedDate).toLocaleDateString('bn-BD')} তারিখে ${selectedCenter.center_name_bn}-এ পুনঃনির্ধারিত হয়েছে। সকাল ৯:০০ টায় উপস্থিত হন।`,
          p_type: 'exam',
          p_application_id: applicationId,
          p_action_url: null,
          p_admin_title_en: 'Exam Rescheduled',
          p_admin_title_bn: 'পরীক্ষা পুনঃনির্ধারিত',
          p_admin_message_en: `Exam rescheduled (DL: ${dlNumber}) to ${selectedCenter.center_name_en} on ${new Date(selectedDate).toLocaleDateString()}. New time: 9:00 AM.`,
          p_admin_message_bn: `${selectedCenter.center_name_bn}-এ ${new Date(selectedDate).toLocaleDateString('bn-BD')} তারিখে পরীক্ষা পুনঃনির্ধারিত (DL: ${dlNumber})। নতুন সময়: সকাল ৯:০০।`,
        });
      }

      toast.success('Booking updated successfully!');
      onClose();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('Error updating booking:', err);
      setError('Failed to update booking');
      toast.error('Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    setShowCancelModal(false);
    setLoading(true);
    setError('');
    
    try {
      // Get current user and application data before deleting
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Get application and booking details for notification
      const { data: applicationData } = await supabase
        .from('license_applications')
        .select('application_number')
        .eq('id', applicationId)
        .single();

      const centerName = currentBooking.test_centers?.center_name_en || 'Test Center';
      const centerNameBn = currentBooking.test_centers?.center_name_bn || 'পরীক্ষা কেন্দ্র';
      const examDate = currentBooking.exam_date;
      const dlNumber = applicationData?.application_number || 'N/A';

      // Delete the booking instead of updating status (to avoid unique constraint issues)
      const { error: deleteError } = await supabase
        .from('physical_exam_bookings')
        .delete()
        .eq('id', currentBooking.id);

      if (deleteError) throw deleteError;

      // Reset physical_exam status in license_applications
      const { error: updateError } = await supabase
        .from('license_applications')
        .update({ 
          physical_exam: 0,
          status: 'pending'
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Send cancellation notifications
      if (currentUser) {
        await supabase.rpc('create_dual_notification', {
          p_user_id: currentUser.id,
          p_title_en: 'Exam Booking Cancelled',
          p_title_bn: 'পরীক্ষা বুকিং বাতিল',
          p_message_en: `Your physical exam booking at ${centerName} on ${new Date(examDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} has been cancelled. You can book a new slot anytime.`,
          p_message_bn: `${centerNameBn}-এ ${new Date(examDate).toLocaleDateString('bn-BD')} তারিখের আপনার শারীরিক পরীক্ষা বুকিং বাতিল করা হয়েছে। আপনি যেকোনো সময় নতুন স্লট বুক করতে পারেন।`,
          p_type: 'exam',
          p_application_id: applicationId,
          p_action_url: null,
          p_admin_title_en: 'Exam Booking Cancelled',
          p_admin_title_bn: 'পরীক্ষা বুকিং বাতিল',
          p_admin_message_en: `Candidate cancelled exam booking (DL: ${dlNumber}) at ${centerName} scheduled for ${new Date(examDate).toLocaleDateString()}. Slot is now available.`,
          p_admin_message_bn: `প্রার্থী ${centerNameBn}-এ ${new Date(examDate).toLocaleDateString('bn-BD')} তারিখের পরীক্ষা বুকিং বাতিল করেছে (DL: ${dlNumber})। স্লট এখন উপলব্ধ।`,
        });
      }

      toast.success('Booking cancelled successfully!');
      onClose();
      
      // Reload page to refresh data
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError('Failed to cancel booking. Please try again.');
      toast.error('Failed to cancel booking');
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
            <Marker key={center.id} position={[center.latitude, center.longitude]} eventHandlers={{ click: () => handleSelectCenter(center) }}>
              <Popup>
                <strong>{center.center_name_en}</strong><br/>
                {center.address_en}
                <br/>
                <button
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  onClick={(e) => { e.stopPropagation(); handleSelectCenter(center); }}
                >
                  Select This Center
                </button>
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
                    <p className="text-sm text-green-600 font-semibold mt-1">
                      📏 {distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-green-600 rounded-full flex items-center justify-center text-white text-xl">
                    ✓
                  </div>
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
        className="text-primary hover:underline flex items-center gap-2"
      >
        ← Back to Centers
      </button>

      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
        <h4 className="font-bold text-gray-800">📍 Selected Center</h4>
        <p className="text-sm text-gray-700 mt-1 font-semibold">{selectedCenter?.center_name_en}</p>
        <p className="text-sm text-gray-600">{selectedCenter?.address_en}</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          📅 Select Date *
        </label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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

      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          ⏰ <strong>Exam Time:</strong> All physical exams start at <span className="font-bold text-green-600">9:00 AM</span>
        </p>
        <p className="text-xs text-gray-600 mt-1">Please arrive 15 minutes early</p>
      </div>

      <button
        onClick={currentBooking ? handleUpdateBooking : () => setStep('confirm')}
        disabled={!selectedDate || loading}
        className="w-full px-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-bold text-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : (currentBooking ? 'Update Booking' : 'Continue to Confirm')}
      </button>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <button
        onClick={() => setStep('schedule')}
        className="text-primary hover:underline flex items-center gap-2"
      >
        ← Back to Schedule
      </button>

      <h3 className="text-2xl font-bold text-center">✅ Confirm Your Booking</h3>

      <div className="bg-gradient-to-br from-primary/5 to-green-50 border-2 border-green-300 rounded-lg p-6 space-y-4">
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
          <p className="font-bold text-green-600 text-xl mt-1">Come at 9:00 AM</p>
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
        className="w-full px-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {loading ? 'Processing...' : (currentBooking ? 'Update Booking' : 'Confirm Booking')}
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center py-8 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto"
      >
        <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
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
          {new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        <p className="text-green-600 font-bold text-xl mt-2">Come at 9:00 AM</p>
      </div>
      <button
        onClick={() => {
          onClose();
          setTimeout(() => window.location.reload(), 500);
        }}
        className="px-8 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-bold hover:shadow-lg"
      >
        Done
      </button>
    </div>
  );

  if (!isOpen) return null;

  const modalContent = (
    <>
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
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-green-700 mb-2">Your Current Booking:</p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{currentBooking.test_centers?.center_name_en || 'Test Center'}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{new Date(currentBooking.exam_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                  <p className="text-sm text-green-600 font-semibold">9:00 AM</p>
                </div>
              </div>
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  🗑️ Cancel This Booking
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Custom Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10001] flex items-center justify-center p-4"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-red-600 font-bold">!</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Cancel Booking?</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-all"
                  >
                    No, Keep It
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {loading ? '⏳ Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default PhysicalExamBooking;
