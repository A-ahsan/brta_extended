import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, CurrencyCircleDollar, MapPin, NavigationArrow, Calendar } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const ImpoundVehicleModal = ({ isOpen, onClose, vehicleData, onSuccess }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  
  const [impoundReasons, setImpoundReasons] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    reason_code: '',
    impound_location: '',
    impound_location_bn: '',
    description: '',
    additional_charges: 0,
    photo_evidence_url: '',
    notes: '',
    coordinates: null
  });

  useEffect(() => {
    if (isOpen) {
      fetchImpoundReasons();
    }
  }, [isOpen]);

  const fetchImpoundReasons = async () => {
    try {
      setLoadingReasons(true);
      const { data, error } = await supabase
        .from('impound_reasons')
        .select('*')
        .eq('is_active', true)
        .order('severity', { ascending: false });

      if (error) throw error;
      setImpoundReasons(data || []);
    } catch (error) {
      console.error('Error fetching impound reasons:', error);
      toast.error(language === 'en' ? 'Failed to load reasons' : 'কারণ লোড করতে ব্যর্থ');
    } finally {
      setLoadingReasons(false);
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
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const locationName = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          let locationBn = '';
          try {
            const translateResponse = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(locationName)}`
            );
            const translateData = await translateResponse.json();
            locationBn = translateData[0]?.[0]?.[0] || '';
          } catch (translateError) {
            console.log('Translation failed:', translateError);
          }
          
          setFormData({
            ...formData,
            impound_location: locationName,
            impound_location_bn: locationBn,
            coordinates: { latitude, longitude }
          });
          
          toast.success(language === 'en' ? 'Location captured!' : 'অবস্থান সংরক্ষিত!');
        } catch (error) {
          console.error('Geocoding error:', error);
          setFormData({
            ...formData,
            impound_location: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
            impound_location_bn: `অক্ষাংশ: ${latitude.toFixed(4)}, দ্রাঘিমাংশ: ${longitude.toFixed(4)}`,
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

  const selectedReason = impoundReasons.find(r => r.code === formData.reason_code);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.reason_code) {
      toast.error(language === 'en' ? 'Please select a reason' : 'দয়া করে একটি কারণ নির্বাচন করুন');
      return;
    }

    if (!formData.impound_location) {
      toast.error(language === 'en' ? 'Please enter location' : 'দয়া করে অবস্থান লিখুন');
      return;
    }

    try {
      setSubmitting(true);

      // Get police profile
      const { data: policeProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Generate impound number
      const impoundNumber = `IMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;

      // Calculate total
      const baseFee = selectedReason.base_fee;
      const additionalCharges = parseFloat(formData.additional_charges) || 0;
      const dailyStorage = 200; // BDT 200 per day
      const daysImpounded = 0; // Initial
      const totalAmount = baseFee + additionalCharges + (dailyStorage * daysImpounded);

      // Create impound record
      const { data: impoundment, error: impoundError } = await supabase
        .from('vehicle_impoundments')
        .insert({
          impound_number: impoundNumber,
          registered_vehicle_id: vehicleData.id,
          user_id: vehicleData.user_id,
          police_user_id: user.id,
          police_name: policeProfile.full_name,
          police_badge_number: user.email || 'N/A',
          reason_code: formData.reason_code,
          reason_en: selectedReason.name_en,
          reason_bn: selectedReason.name_bn,
          description: formData.description,
          base_impound_fee: baseFee,
          daily_storage_fee: dailyStorage,
          additional_charges: additionalCharges,
          days_impounded: daysImpounded,
          total_amount: totalAmount,
          impound_location: formData.impound_location,
          impound_location_bn: formData.impound_location_bn || formData.impound_location,
          photo_evidence_url: formData.photo_evidence_url,
          notes: formData.notes,
          payment_status: 'unpaid',
          status: 'impounded'
        })
        .select()
        .single();

      if (impoundError) throw impoundError;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: vehicleData.user_id,
        title_en: 'Vehicle Impounded (Racker)',
        title_bn: 'গাড়ি আটক করা হয়েছে (র্যাকার)',
        message_en: `Your vehicle (${vehicleData.registration_number}) has been impounded. Reason: ${selectedReason.name_en}. Impound #${impoundNumber}. Fee: BDT ${totalAmount.toFixed(2)} + BDT 200/day storage. Pay to release.`,
        message_bn: `আপনার গাড়ি (${vehicleData.registration_number}) আটক করা হয়েছে। কারণ: ${selectedReason.name_bn}। আটক #${impoundNumber}। ফি: BDT ${totalAmount.toFixed(2)} + BDT ২০০/দিন স্টোরেজ। মুক্ত করতে পরিশোধ করুন।`,
        type: 'impoundment',
        priority: selectedReason.severity === 'critical' || selectedReason.severity === 'severe' ? 'high' : 'normal',
        recipient_type: 'user'
      });

      // Send confirmation to police
      await supabase.from('notifications').insert({
        user_id: user.id,
        title_en: 'Vehicle Impounded Successfully',
        title_bn: 'গাড়ি সফলভাবে আটক করা হয়েছে',
        message_en: `Impound ${impoundNumber} recorded for vehicle ${vehicleData.registration_number}. Fee: BDT ${totalAmount.toFixed(2)}`,
        message_bn: `গাড়ি ${vehicleData.registration_number} এর জন্য আটক ${impoundNumber} রেকর্ড করা হয়েছে। ফি: BDT ${totalAmount.toFixed(2)}`,
        type: 'impoundment',
        priority: 'normal',
        recipient_type: 'police'
      });

      // Send SMS to user
      try {
        const websiteUrl = window.location.origin;
        const backendUrl = `${import.meta.env.VITE_BACKEND_URL}/api/impoundments/send-sms`;
        
        await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: vehicleData.user_id,
            impoundNumber: impoundNumber,
            reason: selectedReason.name_en,
            amount: totalAmount.toFixed(2),
            websiteUrl: websiteUrl
          })
        });
      } catch (smsError) {
        console.error('SMS Error:', smsError);
      }

      toast.success(language === 'en' ? 'Vehicle impounded successfully!' : 'গাড়ি সফলভাবে আটক করা হয়েছে!');
      
      setFormData({
        reason_code: '',
        impound_location: '',
        impound_location_bn: '',
        description: '',
        additional_charges: 0,
        photo_evidence_url: '',
        notes: '',
        coordinates: null
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error impounding vehicle:', error);
      toast.error(language === 'en' ? 'Failed to impound vehicle' : 'গাড়ি আটক করতে ব্যর্থ');
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

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
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
          <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Truck size={28} weight="bold" className="flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold truncate">
                    {language === 'en' ? 'Impound Vehicle (Racker)' : 'গাড়ি আটক করুন (র্যাকার)'}
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
              >
                <X size={24} weight="bold" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Impound Reason Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'en' ? 'Impound Reason *' : 'আটকের কারণ *'}
              </label>
              {loadingReasons ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-[40vh] overflow-y-auto pr-2">
                  {impoundReasons.map((reason) => (
                    <motion.button
                      key={reason.id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, reason_code: reason.code })}
                      className={`p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl text-left transition-all ${
                        formData.reason_code === reason.code
                          ? 'border-orange-500 bg-orange-500/10 dark:bg-orange-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-xs sm:text-sm text-gray-800 dark:text-white line-clamp-2">
                          {language === 'en' ? reason.name_en : reason.name_bn}
                        </h4>
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold flex-shrink-0 ${getSeverityColor(reason.severity)}`}>
                          {reason.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {language === 'en' ? reason.description_en : reason.description_bn}
                      </p>
                      <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold text-xs sm:text-sm">
                        <CurrencyCircleDollar size={16} weight="bold" className="flex-shrink-0" />
                        <span>BDT {reason.base_fee.toFixed(2)} + BDT 200/day</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Reason Summary */}
            {selectedReason && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg sm:rounded-xl p-3 sm:p-4"
              >
                <h4 className="font-bold text-orange-800 dark:text-orange-300 mb-2 text-sm sm:text-base">
                  {language === 'en' ? 'Selected Reason' : 'নির্বাচিত কারণ'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{language === 'en' ? 'Code:' : 'কোড:'}</span>
                    <span className="font-semibold text-gray-800 dark:text-white ml-2">{selectedReason.code}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{language === 'en' ? 'Base Fee:' : 'মূল ফি:'}</span>
                    <span className="font-semibold text-gray-800 dark:text-white ml-2">BDT {selectedReason.base_fee.toFixed(2)}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">{language === 'en' ? 'Daily Storage:' : 'দৈনিক স্টোরেজ:'}</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400 ml-2">BDT 200 per day</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Location */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'en' ? 'Impound Location *' : 'আটকের স্থান *'}
              </label>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full mb-3 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
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
                    type="text"
                    value={formData.impound_location}
                    onChange={(e) => setFormData({ ...formData, impound_location: e.target.value })}
                    placeholder={language === 'en' ? 'e.g., Mirpur-10 Racker Yard' : 'যেমন: মিরপুর-১০ র্যাকার ইয়ার্ড'}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-colors"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'en' ? 'English' : 'ইংরেজি'}
                  </p>
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.impound_location_bn}
                    onChange={(e) => setFormData({ ...formData, impound_location_bn: e.target.value })}
                    placeholder={language === 'en' ? 'e.g., মিরপুর-১০ র্যাকার ইয়ার্ড' : 'যেমন: মিরপুর-১০ র্যাকার ইয়ার্ড'}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'en' ? 'Bengali (Optional)' : 'বাংলা (ঐচ্ছিক)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Charges */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'en' ? 'Additional Charges (Optional)' : 'অতিরিক্ত চার্জ (ঐচ্ছিক)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.additional_charges}
                onChange={(e) => setFormData({ ...formData, additional_charges: e.target.value })}
                placeholder={language === 'en' ? 'e.g., 1000' : 'যেমন: ১০০০'}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'en' ? 'Description/Details' : 'বিবরণ/বিস্তারিত'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'en' ? 'Enter additional details...' : 'অতিরিক্ত বিবরণ লিখুন...'}
                rows="3"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'en' ? 'Internal Notes (Police Only)' : 'অভ্যন্তরীণ নোট (শুধুমাত্র পুলিশ)'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'en' ? 'Internal notes...' : 'অভ্যন্তরীণ নোট...'}
                rows="2"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Total Amount Display */}
            {selectedReason && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg sm:rounded-xl p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-sm sm:text-lg font-bold text-gray-800 dark:text-white">
                    {language === 'en' ? 'Initial Fee:' : 'প্রাথমিক ফি:'}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                    BDT {(parseFloat(selectedReason.base_fee) + parseFloat(formData.additional_charges || 0)).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {language === 'en' 
                    ? '+ BDT 200 per day storage fee will be added automatically' 
                    : '+ BDT ২০০ দৈনিক স্টোরেজ ফি স্বয়ংক্রিয়ভাবে যোগ হবে'}
                </p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 pb-2 -mb-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.reason_code}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {language === 'en' ? 'Impounding...' : 'আটক করা হচ্ছে...'}
                  </>
                ) : (
                  <>
                    <Truck size={20} weight="bold" />
                    {language === 'en' ? 'Impound Vehicle' : 'গাড়ি আটক করুন'}
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

export default ImpoundVehicleModal;
