import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Warning, CurrencyCircleDollar, MapPin, Camera, Upload, NavigationArrow } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const AddViolationModal = ({ isOpen, onClose, vehicleData, onSuccess }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  
  const [violationTypes, setViolationTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    violation_type_id: '',
    location: '',
    location_bn: '',
    description: '',
    additional_charges: 0,
    photo_evidence_url: '',
    notes: '',
    coordinates: null
  });

  // Fetch violation types
  useEffect(() => {
    if (isOpen) {
      fetchViolationTypes();
    }
  }, [isOpen]);

  const fetchViolationTypes = async () => {
    try {
      setLoadingTypes(true);
      const { data, error } = await supabase
        .from('violation_types')
        .select('*')
        .eq('is_active', true)
        .order('severity', { ascending: false });

      if (error) throw error;
      setViolationTypes(data || []);
    } catch (error) {
      console.error('Error fetching violation types:', error);
      toast.error(language === 'en' ? 'Failed to load violation types' : 'লঙ্ঘনের ধরন লোড করতে ব্যর্থ');
    } finally {
      setLoadingTypes(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(language === 'en' ? 'Location not available' : 'অবস্থান পাওয়া যায়নি');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const locationName = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          // Try to translate to Bengali
          let locationBn = '';
          try {
            const translateResponse = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(locationName)}`
            );
            const translateData = await translateResponse.json();
            locationBn = translateData[0]?.[0]?.[0] || '';
          } catch (translateError) {
            console.log('Translation failed, will use empty:', translateError);
          }
          
          setFormData({
            ...formData,
            location: locationName,
            location_bn: locationBn, // Auto-translated Bengali
            coordinates: { latitude, longitude }
          });
          
          toast.success(language === 'en' ? 'Location captured!' : 'অবস্থান সংরক্ষিত!');
        } catch (error) {
          console.error('Geocoding error:', error);
          setFormData({
            ...formData,
            location: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
            location_bn: `অক্ষাংশ: ${latitude.toFixed(4)}, দ্রাঘিমাংশ: ${longitude.toFixed(4)}`,
            coordinates: { latitude, longitude }
          });
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Location error:', error);
        toast.error(language === 'en' ? 'Location failed' : 'অবস্থান ব্যর্থ');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const selectedViolationType = violationTypes.find(v => v.id === formData.violation_type_id);
  
  // Calculate due date based on severity
  const getDueDateFromSeverity = (severity) => {
    const days = {
      'critical': 7,
      'severe': 15,
      'moderate': 30,
      'minor': 45
    };
    const daysToAdd = days[severity] || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return { date: dueDate, days: daysToAdd };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.violation_type_id) {
      toast.error(language === 'en' ? 'Please select a violation type' : 'দয়া করে একটি লঙ্ঘনের ধরন নির্বাচন করুন');
      return;
    }

    if (!formData.location) {
      toast.error(language === 'en' ? 'Please enter location' : 'দয়া করে অবস্থান লিখুন');
      return;
    }

    try {
      setSubmitting(true);

      // Get police profile info
      const { data: policeProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Generate violation number
      const violationNumber = `VIO-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;

      // Calculate total amount
      const fineAmount = selectedViolationType.base_fine_amount;
      const additionalCharges = parseFloat(formData.additional_charges) || 0;
      
      // Calculate due date based on violation severity
      const dueDateInfo = getDueDateFromSeverity(selectedViolationType.severity);
      const dueDate = dueDateInfo.date;

      // Create violation record
      const { data: violation, error: violationError } = await supabase
        .from('traffic_violations')
        .insert({
          violation_number: violationNumber,
          registered_vehicle_id: vehicleData.id,
          user_id: vehicleData.user_id,
          police_user_id: user.id,
          police_name: policeProfile.full_name,
          police_badge_number: user.email || 'N/A',
          violation_type_id: formData.violation_type_id,
          violation_code: selectedViolationType.code,
          violation_name_en: selectedViolationType.name_en,
          violation_name_bn: selectedViolationType.name_bn,
          description: formData.description,
          fine_amount: fineAmount,
          additional_charges: additionalCharges,
          due_date: dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          location: formData.location,
          location_bn: formData.location_bn || formData.location,
          photo_evidence_url: formData.photo_evidence_url,
          notes: formData.notes,
          payment_status: 'unpaid',
          status: 'active'
        })
        .select()
        .single();

      if (violationError) throw violationError;

      // Send bilingual notification to user
      const totalAmount = fineAmount + additionalCharges;
      const dueDateFormatted = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const dueDateFormattedBn = dueDate.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
      
      await supabase.from('notifications').insert({
        user_id: vehicleData.user_id,
        title_en: 'Traffic Violation Fine Issued',
        title_bn: 'ট্রাফিক লঙ্ঘন জরিমানা জারি করা হয়েছে',
        message_en: `A fine of BDT ${totalAmount.toFixed(2)} has been issued for ${selectedViolationType.name_en} at ${formData.location}. Violation #${violationNumber}. Payment due by ${dueDateFormatted} (${dueDateInfo.days} days).`,
        message_bn: `${selectedViolationType.name_bn} এর জন্য ${formData.location_bn || formData.location} এ BDT ${totalAmount.toFixed(2)} জরিমানা জারি করা হয়েছে। লঙ্ঘন #${violationNumber}। ${dueDateFormattedBn} এর মধ্যে পরিশোধ করুন (${dueDateInfo.days} দিন)।`,
        type: 'violation',
        priority: selectedViolationType.severity === 'critical' || selectedViolationType.severity === 'severe' ? 'high' : 'normal',
        recipient_type: 'user'
      });

      // Send notification to police (confirmation)
      await supabase.from('notifications').insert({
        user_id: user.id,
        title_en: 'Violation Recorded Successfully',
        title_bn: 'লঙ্ঘন সফলভাবে রেকর্ড করা হয়েছে',
        message_en: `Violation ${violationNumber} recorded for vehicle ${vehicleData.registration_number}. Fine: BDT ${totalAmount.toFixed(2)}`,
        message_bn: `গাড়ি ${vehicleData.registration_number} এর জন্য লঙ্ঘন ${violationNumber} রেকর্ড করা হয়েছে। জরিমানা: BDT ${totalAmount.toFixed(2)}`,
        type: 'violation',
        priority: 'normal',
        recipient_type: 'police'
      });

      // Send SMS to user's phone number
      try {
        const websiteUrl = window.location.origin; // Get current website URL
        
        // Get backend URL - use window.location.hostname to work on both localhost and mobile
        const backendHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
          ? window.location.hostname 
          : window.location.hostname; // Use same host as frontend
        const backendUrl = `https://${backendHost}:5000/api/violations/send-sms`;
        
        console.log('📱 Attempting to send SMS via:', backendUrl);
        
        const smsResponse = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: vehicleData.user_id,
            violationNumber: violationNumber,
            violationName: selectedViolationType.name_en,
            amount: totalAmount.toFixed(2),
            websiteUrl: websiteUrl
          })
        });

        const smsResult = await smsResponse.json();
        
        if (smsResult.success) {
          console.log('✅ SMS sent successfully to user');
        } else {
          console.warn('⚠️ SMS sending failed:', smsResult.error);
          // Don't fail the whole operation if SMS fails
        }
      } catch (smsError) {
        console.error('❌ SMS Error:', smsError);
        console.error('Full error details:', smsError.message);
        // Continue even if SMS fails - violation is already saved
      }

      toast.success(language === 'en' ? 'Violation added successfully!' : 'লঙ্ঘন সফলভাবে যোগ করা হয়েছে!');
      
      // Reset form
      setFormData({
        violation_type_id: '',
        location: '',
        location_bn: '',
        description: '',
        additional_charges: 0,
        photo_evidence_url: '',
        notes: '',
        coordinates: null
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding violation:', error);
      toast.error(language === 'en' ? 'Failed to add violation' : 'লঙ্ঘন যোগ করতে ব্যর্থ');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'severe': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'minor': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scroll
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto my-2 sm:my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-red-500 to-orange-600 text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Warning size={28} weight="bold" className="flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold truncate">
                    {language === 'en' ? 'Add Traffic Violation' : 'ট্রাফিক লঙ্ঘন যোগ করুন'}
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90 truncate">
                    {vehicleData?.registration_number} - {vehicleData?.vehicle_name}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={submitting}
                className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={24} weight="bold" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Violation Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'en' ? 'Violation Type *' : 'লঙ্ঘনের ধরন *'}
              </label>
              {loadingTypes ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-[40vh] overflow-y-auto pr-2">
                  {violationTypes.map((type, index) => (
                    <motion.button
                      key={type.id}
                      type="button"
                      tabIndex={0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, violation_type_id: type.id })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setFormData({ ...formData, violation_type_id: type.id });
                        }
                      }}
                      className={`p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        formData.violation_type_id === type.id
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                      }`}
                      aria-pressed={formData.violation_type_id === type.id}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white line-clamp-2">
                          {language === 'en' ? type.name_en : type.name_bn}
                        </h4>
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold flex-shrink-0 ${getSeverityColor(type.severity)}`}>
                          {type.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {language === 'en' ? type.description_en : type.description_bn}
                      </p>
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs sm:text-sm">
                        <CurrencyCircleDollar size={16} weight="bold" className="flex-shrink-0" />
                        <span>BDT {type.base_fine_amount.toFixed(2)}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Violation Summary */}
            {selectedViolationType && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl p-3 sm:p-4"
              >
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 text-sm sm:text-base">
                  {language === 'en' ? 'Selected Violation' : 'নির্বাচিত লঙ্ঘন'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {language === 'en' ? 'Code:' : 'কোড:'}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-white ml-2">
                      {selectedViolationType.code}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {language === 'en' ? 'Base Fine:' : 'মূল জরিমানা:'}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-white ml-2">
                      BDT {selectedViolationType.base_fine_amount.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {language === 'en' ? 'Due Date:' : 'শেষ তারিখ:'}
                    </span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400 ml-2">
                      {(() => {
                        const info = getDueDateFromSeverity(selectedViolationType.severity);
                        return language === 'en' 
                          ? `${info.days} days (${info.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                          : `${info.days} দিন (${info.date.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })})`;
                      })()}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Location */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <MapPin size={14} weight="bold" className="inline mr-1" />
                {language === 'en' ? 'Location *' : 'অবস্থান *'}
              </label>
              
              {/* Get Current Location Button */}
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full mb-3 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {gettingLocation ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {language === 'en' ? 'Getting Location...' : 'অবস্থান নিচ্ছি...'}
                  </>
                ) : (
                  <>
                    <NavigationArrow size={18} weight="bold" />
                    {language === 'en' ? 'Use Current Location' : 'বর্তমান অবস্থান ব্যবহার করুন'}
                  </>
                )}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    id="location-en"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={language === 'en' ? 'e.g., Gulshan-2 Circle' : 'যেমন: গুলশান-২ সার্কেল'}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors"
                    required
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'en' ? 'English' : 'ইংরেজি'}
                  </p>
                </div>
                <div>
                  <input
                    id="location-bn"
                    type="text"
                    value={formData.location_bn}
                    onChange={(e) => setFormData({ ...formData, location_bn: e.target.value })}
                    placeholder={language === 'en' ? 'e.g., গুলশান-২ সার্কেল' : 'যেমন: গুলশান-২ সার্কেল'}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'en' ? 'Bengali (Optional)' : 'বাংলা (ঐচ্ছিক)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Charges */}
            <div>
              <label htmlFor="additional-charges" className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <CurrencyCircleDollar size={14} weight="bold" className="inline mr-1" />
                {language === 'en' ? 'Additional Charges (if any)' : 'অতিরিক্ত চার্জ (যদি থাকে)'}
              </label>
              <input
                id="additional-charges"
                type="number"
                min="0"
                step="0.01"
                value={formData.additional_charges}
                onChange={(e) => setFormData({ ...formData, additional_charges: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors"
                autoComplete="off"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'en' ? 'Description/Details' : 'বিবরণ/বিস্তারিত'}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'en' ? 'Enter additional details about the violation...' : 'লঙ্ঘন সম্পর্কে অতিরিক্ত বিবরণ লিখুন...'}
                rows="3"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Notes (Police Internal) */}
            <div>
              <label htmlFor="notes" className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'en' ? 'Internal Notes (Police Only)' : 'অভ্যন্তরীণ নোট (শুধুমাত্র পুলিশ)'}
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'en' ? 'Internal notes, observations...' : 'অভ্যন্তরীণ নোট, পর্যবেক্ষণ...'}
                rows="2"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Total Amount Display */}
            {selectedViolationType && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg sm:rounded-xl p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-sm sm:text-lg font-bold text-gray-800 dark:text-white">
                    {language === 'en' ? 'Total Fine Amount:' : 'মোট জরিমানা:'}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                    BDT {(parseFloat(selectedViolationType.base_fine_amount) + parseFloat(formData.additional_charges || 0)).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 pb-2 -mb-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.violation_type_id}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {language === 'en' ? 'Adding...' : 'যোগ করা হচ্ছে...'}
                  </>
                ) : (
                  <>
                    <Warning size={20} weight="bold" />
                    {language === 'en' ? 'Add Violation' : 'লঙ্ঘন যোগ করুন'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddViolationModal;
