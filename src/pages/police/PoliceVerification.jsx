import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Warning,
  Car,
  User,
  IdentificationCard,
  Calendar,
  MapPin,
  X,
  CreditCard,
  CurrencyCircleDollar,
  Clock,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import AddViolationModal from '../../components/AddViolationModal';
import ImpoundVehicleModal from '../../components/ImpoundVehicleModal';

const PoliceVerification = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language] || translations.en;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'file'
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionType, setInspectionType] = useState('routine_check');
  const [inspectionLocation, setInspectionLocation] = useState('');
  const [inspectionLocationBn, setInspectionLocationBn] = useState('');
  const [inspectionRemarks, setInspectionRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gettingInspectionLocation, setGettingInspectionLocation] = useState(false);
  const [ownerPhoto, setOwnerPhoto] = useState(null);
  const [taxTokenData, setTaxTokenData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [violations, setViolations] = useState([]);
  const [impoundments, setImpoundments] = useState([]);
  const [loadingViolations, setLoadingViolations] = useState(false);
  const [showAddViolationModal, setShowAddViolationModal] = useState(false);
  const [showImpoundModal, setShowImpoundModal] = useState(false);

  const scannerRef = useRef(null);
  const scanningLockRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const scannerActiveRef = useRef(false);

  useEffect(() => {
    if (showQRScanner && scanMode === 'camera' && !scanner && !isScanning) {
      initScanner();
    }
    return () => {
      cleanupScanner();
    };
  }, [showQRScanner, scanMode]);

  const cleanupScanner = () => {
    if (scanner) {
      try {
        // Stop all camera streams first
        scanner.clear().then(() => {
          // Force stop all media tracks
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(() => {});
        }).catch(() => {});
      } catch (e) {
        console.log('Scanner cleanup error:', e);
      }
      setScanner(null);
    }
    // Additional cleanup - stop any active media streams
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      });
    } catch (e) {
      console.log('Video cleanup error:', e);
    }
    setIsScanning(false);
  };

  const initScanner = async () => {
    try {
      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream); // Store for cleanup
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      
      const html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: ['QR_CODE'],
          videoConstraints: {
            facingMode: { ideal: 'environment' }
          }
        },
        false
      );

      html5QrcodeScanner.render(onScanSuccess, onScanError);
      setScanner(html5QrcodeScanner);
      scannerActiveRef.current = true;
    } catch (error) {
      console.error('Scanner init error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error(language === 'en' ? 'Camera permission denied. Please allow camera access.' : 'ক্যামেরা অনুমতি প্রত্যাখ্যান করা হয়েছে। অনুগ্রহ করে ক্যামেরা অ্যাক্সেসের অনুমতি দিন।');
      } else if (error.name === 'NotFoundError') {
        toast.error(language === 'en' ? 'No camera found on this device.' : 'এই ডিভাইসে কোনো ক্যামেরা পাওয়া যায়নি।');
      } else {
        toast.error(language === 'en' ? 'Failed to initialize scanner. Please try uploading a QR image instead.' : 'স্ক্যানার শুরু করতে ব্যর্থ। পরিবর্তে একটি QR ছবি আপলোড করার চেষ্টা করুন।');
      }
    }
  };

  const onScanSuccess = async (decodedText) => {
    // IMMEDIATELY check if scanner is still active
    if (!scannerActiveRef.current) {
      console.log('Scan blocked: scanner already stopped');
      return;
    }
    
    // Debounce: prevent scans within 3 seconds of each other
    const now = Date.now();
    if (now - lastScanTimeRef.current < 3000) {
      console.log('Scan blocked: too soon after previous scan');
      return;
    }
    
    // Prevent multiple simultaneous scans using ref (survives re-renders)
    if (scanningLockRef.current) {
      console.log('Scan blocked: already processing');
      return;
    }
    
    // IMMEDIATELY mark scanner as inactive BEFORE any async operations
    scannerActiveRef.current = false;
    scanningLockRef.current = true;
    lastScanTimeRef.current = now;
    setIsScanning(true);
    
    // Immediately cleanup scanner (don't await)
    cleanupScanner();
    setShowQRScanner(false);
    
    try {
      // Parse QR code data
      let registrationNumber = decodedText;
      
      // Try parsing as JSON first (vehicle smart card QR)
      try {
        const data = JSON.parse(decodedText);
        if (data.registration_number) {
          registrationNumber = data.registration_number;
        }
      } catch (jsonError) {
        // Not JSON, use as-is (plain registration number)
      }
      
      await fetchVehicleDetails(registrationNumber);
    } catch (error) {
      console.error('QR scan error:', error);
      toast.error(language === 'en' ? 'Invalid QR code' : 'অবৈধ QR কোড');
    } finally {
      // Reset locks after a delay
      setTimeout(() => {
        scanningLockRef.current = false;
        setIsScanning(false);
      }, 2000);
    }
  };

  const onScanError = (error) => {
    // Silent - scanning errors are normal
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-file-reader');
      
      const result = await html5QrCode.scanFile(file, true);
      let registrationNumber = result;
      
      // Try parsing as JSON first (vehicle smart card QR)
      try {
        const data = JSON.parse(result);
        if (data.registration_number) {
          registrationNumber = data.registration_number;
        }
      } catch (jsonError) {
        // Not JSON, use as-is (plain registration number)
      }
      
      await fetchVehicleDetails(registrationNumber);
      setShowQRScanner(false);
      toast.success(language === 'en' ? 'QR Code scanned successfully!' : 'QR কোড সফলভাবে স্ক্যান হয়েছে!');
    } catch (error) {
      console.error('File scan error:', error);
      toast.error(language === 'en' ? 'Invalid QR code image' : 'অবৈধ QR কোড ছবি');
    }
  };

  const fetchVehicleDetails = async (searchTerm) => {
    setLoadingVehicle(true);
    try {
      const searchUpper = searchTerm.toUpperCase().trim();
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Try multiple search strategies
      // 1. Exact registration number match
      let { data, error } = await supabase
        .from('registered_vehicles')
        .select('*')
        .eq('registration_number', searchUpper)
        .maybeSingle();
      
      // 2. If not found, try partial plate search (EN or BN)
      if (!data) {
        const { data: plateData, error: plateError } = await supabase
          .from('registered_vehicles')
          .select('*')
          .or(`registration_plate->>en.ilike.%${searchLower}%,registration_plate->>bn.ilike.%${searchLower}%`)
          .limit(1)
          .maybeSingle();
        
        if (plateData) {
          data = plateData;
          error = null;
        }
      }
      
      // 3. If still not found, try chassis or engine number
      if (!data) {
        const { data: chassisData, error: chassisError } = await supabase
          .from('registered_vehicles')
          .select('*')
          .or(`chassis_number.ilike.%${searchUpper}%,engine_number.ilike.%${searchUpper}%`)
          .limit(1)
          .maybeSingle();
        
        if (chassisData) {
          data = chassisData;
          error = null;
        }
      }

      // 4. If not found in vehicles, try searching tax_tokens table (if it exists)
      if (!data) {
        try {
          const { data: tokenData, error: tokenError } = await supabase
            .from('tax_tokens')
            .select('token_number, registered_vehicle_id')
            .eq('token_number', searchTerm.toUpperCase())
            .single();

          if (tokenData && !tokenError) {
            // Found by tax token, now fetch the vehicle
            const { data: vehicleData, error: vehicleError } = await supabase
              .from('registered_vehicles')
              .select('*')
              .eq('id', tokenData.registered_vehicle_id)
              .single();

            if (vehicleData && !vehicleError) {
              data = vehicleData;
              error = null;
            }
          }
        } catch (tokenSearchError) {
          // Tax tokens table doesn't exist yet, ignore
          console.log('Tax tokens table not found:', tokenSearchError);
        }
      }

      if (error || !data) {
        toast.error(language === 'en' ? 'Vehicle not found' : 'যানবাহন পাওয়া যায়নি');
        setSelectedVehicle(null);
        return;
      }

      // Check if registration is expired
      const today = new Date();
      const validUntil = new Date(data.valid_until);
      data.isExpired = today > validUntil;

      setSelectedVehicle(data);
      
      // Fetch owner photo from profiles
      if (data.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('photo_url, avatar_url, full_name')
          .eq('id', data.user_id)
          .single();
        
        if (profileData) {
          setOwnerPhoto(profileData.photo_url || profileData.avatar_url);
        }
      }
      
      // Fetch tax token for this vehicle (if table exists)
      if (data.id) {
        try {
          const { data: tokenData, error: tokenError } = await supabase
            .from('tax_tokens')
            .select('*')
            .eq('registered_vehicle_id', data.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (tokenData && !tokenError) {
            setTaxTokenData(tokenData);
          } else {
            setTaxTokenData(null);
          }
        } catch (tokenFetchError) {
          // Tax tokens table doesn't exist yet
          setTaxTokenData(null);
        }
      }
      
      // Fetch violations for this vehicle
      if (data.id) {
        fetchVehicleViolations(data.id);
      }
      
      toast.success(language === 'en' ? 'Vehicle found!' : 'যানবাহন পাওয়া গেছে!');
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      toast.error(language === 'en' ? 'Search failed' : 'অনুসন্ধান ব্যর্থ');
      setSelectedVehicle(null);
      setOwnerPhoto(null);
    } finally {
      setLoadingVehicle(false);
    }
  };

  const fetchVehicleViolations = async (vehicleId) => {
    try {
      setLoadingViolations(true);
      
      // Fetch violations
      const { data: violationsData, error: violationsError } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('registered_vehicle_id', vehicleId)
        .order('violation_date', { ascending: false });

      if (violationsError) throw violationsError;
      setViolations(violationsData || []);

      // Fetch impoundments
      const { data: impoundmentsData, error: impoundmentsError } = await supabase
        .from('vehicle_impoundments')
        .select('*')
        .eq('registered_vehicle_id', vehicleId)
        .order('impound_date', { ascending: false });

      if (impoundmentsError) throw impoundmentsError;
      setImpoundments(impoundmentsData || []);
    } catch (error) {
      console.error('Error fetching violations and impoundments:', error);
      setViolations([]);
      setImpoundments([]);
    } finally {
      setLoadingViolations(false);
    }
  };

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      toast.error(language === 'en' ? 'Enter registration number or plate' : 'নিবন্ধন নম্বর বা প্লেট লিখুন');
      return;
    }
    fetchVehicleDetails(searchQuery.trim());
  }, [searchQuery, language]);

  const getCurrentInspectionLocation = () => {
    if (!navigator.geolocation) {
      toast.error(language === 'en' ? 'Location not available' : 'অবস্থান পাওয়া যায়নি');
      return;
    }

    setGettingInspectionLocation(true);
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
          
          setInspectionLocation(locationName);
          setInspectionLocationBn(locationBn);
          
          toast.success(language === 'en' ? 'Location captured!' : 'অবস্থান সংরক্ষিত!');
        } catch (error) {
          console.error('Geocoding error:', error);
          setInspectionLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
          setInspectionLocationBn(`অক্ষাংশ: ${latitude.toFixed(4)}, দ্রাঘিমাংশ: ${longitude.toFixed(4)}`);
        } finally {
          setGettingInspectionLocation(false);
        }
      },
      (error) => {
        console.error('Location error:', error);
        toast.error(language === 'en' ? 'Location failed' : 'অবস্থান ব্যর্থ');
        setGettingInspectionLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleRecordInspection = async () => {
    if (!selectedVehicle) return;

    if (!inspectionLocation.trim()) {
      toast.error(language === 'en' ? 'Please enter location' : 'দয়া করে অবস্থান লিখুন');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('police_inspections')
        .insert([{
          registered_vehicle_id: selectedVehicle.id,
          police_user_id: user.id,
          inspection_type: inspectionType,
          location: inspectionLocation,
          location_bn: inspectionLocationBn || null,
          remarks: inspectionRemarks || null
        }]);

      if (error) throw error;

      // Send notification to vehicle owner
      await supabase
        .from('notifications')
        .insert([{
          user_id: selectedVehicle.user_id,
          recipient_type: 'user',
          title_en: 'Police Inspection Recorded',
          title_bn: 'পুলিশ পরিদর্শন রেকর্ড করা হয়েছে',
          message_en: `Your vehicle (${selectedVehicle.registration_plate.en}) was inspected. Type: ${inspectionType.replace('_', ' ')}`,
          message_bn: `আপনার যানবাহন (${selectedVehicle.registration_plate.bn}) পরিদর্শন করা হয়েছে। ধরন: ${inspectionType}`,
          notification_type: 'general',
          priority: 'normal'
        }]);

      toast.success(language === 'en' ? 'Inspection recorded!' : 'পরিদর্শন রেকর্ড করা হয়েছে!');
      setShowInspectionModal(false);
      setInspectionType('routine_check');
      setInspectionLocation('');
      setInspectionLocationBn('');
      setInspectionRemarks('');
    } catch (error) {
      console.error('Error recording inspection:', error);
      toast.error(language === 'en' ? 'Failed to record' : 'রেকর্ড করতে ব্যর্থ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearVehicleData = () => {
    setSelectedVehicle(null);
    setSearchQuery('');
    setOwnerPhoto(null);
    setTaxTokenData(null);
    setViolations([]);
    scanningLockRef.current = false;
    scannerActiveRef.current = false;
    setIsScanning(false);
  };

  const handleViolationAdded = () => {
    // Refresh violations list
    if (selectedVehicle?.id) {
      fetchVehicleViolations(selectedVehicle.id);
    }
  };

  const getStatusIcon = (vehicle) => {
    if (vehicle.isExpired) {
      return <XCircle size={24} weight="fill" className="text-danger" />;
    }
    return <CheckCircle size={24} weight="fill" className="text-success" />;
  };

  const getStatusColor = (vehicle) => {
    if (vehicle.isExpired) {
      return 'bg-danger/20 text-danger border-danger';
    }
    return 'bg-success/20 text-success border-success';
  };

  const getStatusText = (vehicle) => {
    if (vehicle.isExpired) {
      return language === 'en' ? 'Expired' : 'মেয়াদ শেষ';
    }
    return language === 'en' ? 'Valid' : 'বৈধ';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
      >
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 lg:p-8 rounded-2xl shadow-xl">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary to-green-600 rounded-xl">
              <QrCode size={24} weight="duotone" className="text-white sm:w-8 sm:h-8" />
            </div>
            <span className="break-words">{language === 'en' ? 'Vehicle Verification' : 'যানবাহন যাচাইকরণ'}</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
            {language === 'en' ? 'Scan QR code or search by plate number to verify vehicle documents' : 'যানবাহনের নথি যাচাই করতে QR কোড স্ক্যান করুন বা প্লেট নম্বর দিয়ে অনুসন্ধান করুন'}
          </p>

          {/* QR Scanner Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQRScanner(true)}
            className="w-full px-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mb-6"
          >
            <QrCode size={24} weight="bold" />
            {language === 'en' ? 'Scan QR Code' : 'QR কোড স্ক্যান করুন'}
          </motion.button>

          {/* QR Scanner Modal */}
          <AnimatePresence>
            {showQRScanner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => {
                  cleanupScanner();
                  setShowQRScanner(false);
                }}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                      {language === 'en' ? 'Scan QR Code' : 'QR কোড স্ক্যান করুন'}
                    </h3>
                    <button
                      onClick={() => {
                        cleanupScanner();
                        setShowQRScanner(false);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <X size={24} weight="bold" className="text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => {
                        cleanupScanner();
                        setScanMode('camera');
                      }}
                      className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all ${
                        scanMode === 'camera'
                          ? 'bg-gradient-to-r from-primary to-green-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {language === 'en' ? '📸 Camera' : '📸 ক্যামেরা'}
                    </button>
                    <button
                      onClick={() => {
                        cleanupScanner();
                        setScanMode('file');
                      }}
                      className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all ${
                        scanMode === 'file'
                          ? 'bg-gradient-to-r from-primary to-green-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {language === 'en' ? '🖼️ Upload' : '🖼️ আপলোড'}
                    </button>
                  </div>

                  {scanMode === 'camera' ? (
                    <div id="qr-reader" ref={scannerRef} className="rounded-xl overflow-hidden"></div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="qr-file-input"
                      />
                      <label
                        htmlFor="qr-file-input"
                        className="cursor-pointer flex flex-col items-center gap-3"
                      >
                        <QrCode size={64} weight="duotone" className="text-primary" />
                        <p className="text-gray-600 dark:text-gray-400 font-semibold">
                          {language === 'en' ? 'Click to upload QR code image' : 'QR কোড ছবি আপলোড করতে ক্লিক করুন'}
                        </p>
                        <div id="qr-file-reader" className="hidden"></div>
                      </label>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="relative my-6 sm:my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 sm:px-4 py-1 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-semibold rounded-full border-2 border-gray-200 dark:border-gray-700">
                {language === 'en' ? 'OR' : 'অথবা'}
              </span>
            </div>
          </div>

          {/* Manual Search */}
          <div className="space-y-3 sm:space-y-4">
            <label className="block text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
              {language === 'en' ? 'Search by plate number:' : 'প্লেট নম্বর দিয়ে অনুসন্ধান করুন:'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={language === 'en' ? 'Reg number, plate, tax token, chassis, or engine...' : 'রেজি নং, প্লেট, ট্যাক্স টোকেন, চেসিস, ইঞ্জিন...'}
                className="flex-1 px-4 sm:px-5 py-3 sm:py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all text-base sm:text-lg"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSearch}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <MagnifyingGlass size={20} className="sm:w-6 sm:h-6" weight="bold" />
                {language === 'en' ? 'Search' : 'খুঁজুন'}
              </motion.button>
            </div>
          </div>

          {/* Search Result */}
          {selectedVehicle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 sm:mt-8 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl border-2 border-gray-300 dark:border-gray-600 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-3">
                <div className="flex items-center gap-3">
                  {/* Owner Photo */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-primary/20 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    {ownerPhoto ? (
                      <img src={ownerPhoto} alt="Owner" className="w-full h-full object-cover" />
                    ) : selectedVehicle?.vehicle_photo_url ? (
                      <img src={selectedVehicle.vehicle_photo_url} alt="Owner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={28} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white mb-1 sm:mb-2">
                      {language === 'en' ? 'Vehicle Details' : 'যানবাহনের বিবরণ'}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                      {language === 'en' ? 'Document verification completed' : 'নথি যাচাইকরণ সম্পন্ন'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedVehicle)}
                  <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border-2 whitespace-nowrap ${getStatusColor(selectedVehicle)}`}>
                    {getStatusText(selectedVehicle)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Car size={14} />
                      {language === 'en' ? 'Plate Number' : 'প্লেট নম্বর'}
                    </span>
                    <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-white mt-1 break-words">
                      {language === 'en' ? selectedVehicle.registration_plate.en : selectedVehicle.registration_plate.bn}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{language === 'en' ? 'Registration #' : 'নিবন্ধন নং'}</span>
                    <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mt-1">{selectedVehicle.registration_number}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{language === 'en' ? 'Vehicle' : 'যানবাহন'}</span>
                    <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-white mt-1">
                      {selectedVehicle.vehicle_name} {selectedVehicle.model}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedVehicle.vehicle_type} • {selectedVehicle.engine_cc} CC
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <User size={14} />
                      {language === 'en' ? 'Owner' : 'মালিক'}
                    </span>
                    <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-white mt-1">
                      {language === 'en' ? selectedVehicle.owner_name_en : selectedVehicle.owner_name_bn}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <IdentificationCard size={14} />
                      {language === 'en' ? 'NID' : 'এনআইডি'}
                    </span>
                    <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mt-1">{selectedVehicle.owner_nid}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{language === 'en' ? 'DL Number' : 'ডিএল নম্বর'}</span>
                    <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mt-1">
                      {selectedVehicle.owner_dl_number || 'N/A'}
                    </p>
                  </div>
                  {taxTokenData && (
                    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <CreditCard size={14} />
                        {language === 'en' ? 'Tax Token' : 'ট্যাক্স টোকেন'}
                      </span>
                      <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                        {taxTokenData.token_number}
                      </p>
                    </div>
                  )}
                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={14} />
                      {language === 'en' ? 'Registration Date' : 'নিবন্ধনের তারিখ'}
                    </span>
                    <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mt-1">{selectedVehicle.registration_date}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{language === 'en' ? 'Valid Until' : 'বৈধতা'}</span>
                    <p className={`text-base sm:text-lg lg:text-xl font-bold mt-1 ${selectedVehicle.isExpired ? 'text-danger' : 'text-success'}`}>
                      {selectedVehicle.valid_until}
                    </p>
                  </div>
                </div>
              </div>

              {selectedVehicle.isExpired && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <XCircle size={24} weight="fill" className="text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-300">
                        {language === 'en' ? 'Expired Registration' : 'মেয়াদ শেষ নিবন্ধন'}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        {language === 'en' 
                          ? 'Vehicle registration has expired. The vehicle should not be operated until registration is renewed.' 
                          : 'যানবাহন নিবন্ধন মেয়াদ শেষ হয়ে গেছে। নিবন্ধন নবায়ন না হওয়া পর্যন্ত যানবাহন পরিচালনা করা উচিত নয়।'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Violations Section */}
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h5 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Warning size={24} weight="fill" className="text-red-600" />
                    {language === 'en' ? 'Violations & Actions' : 'লঙ্ঘন ও পদক্ষেপ'}
                  </h5>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAddViolationModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                      <Warning size={18} weight="bold" />
                      {language === 'en' ? 'Add Fine' : 'জরিমানা'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowImpoundModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-700 text-white rounded-lg font-semibold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                      <Car size={18} weight="bold" />
                      {language === 'en' ? 'Impound' : 'আটক'}
                    </motion.button>
                  </div>
                </div>

                {loadingViolations ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : violations.length === 0 && impoundments.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-2" weight="duotone" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {language === 'en' ? 'No violations or impoundments recorded' : 'কোনো লঙ্ঘন বা আটক রেকর্ড করা হয়নি'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {/* Display impoundments first */}
                    {impoundments.map((impoundment) => (
                      <div key={impoundment.id} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-300 dark:border-orange-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Car size={16} weight="fill" className="text-orange-600 dark:text-orange-400" />
                              <h6 className="font-bold text-gray-800 dark:text-white text-sm">
                                {language === 'en' ? 'Vehicle Impounded' : 'যানবাহন আটক'}
                              </h6>
                            </div>
                            <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                              {language === 'en' ? impoundment.reason_en : impoundment.reason_bn}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {impoundment.impound_location}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-600 dark:text-orange-400">
                              BDT {impoundment.total_amount}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              impoundment.status === 'released' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                            }`}>
                              {impoundment.status === 'released' 
                                ? (language === 'en' ? 'Released' : 'মুক্ত')
                                : (language === 'en' ? 'Impounded' : 'আটক')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar size={12} />
                            <span className="font-medium">
                              {language === 'en' ? 'Impounded:' : 'আটক:'}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-white">
                              {new Date(impoundment.impound_date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </span>
                          {impoundment.release_date && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle size={12} weight="fill" />
                              <span className="font-medium">
                                {language === 'en' ? 'Released:' : 'মুক্ত:'}
                              </span>
                              <span className="font-semibold">
                                {new Date(impoundment.release_date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </span>
                          )}
                          <span className="text-gray-500 dark:text-gray-400">#{impoundment.impound_number}</span>
                        </div>
                        {impoundment.status !== 'released' && (
                          <div className="mt-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded">
                            {language === 'en' 
                              ? `Storage: ${Math.floor((new Date() - new Date(impoundment.impound_date)) / (1000 * 60 * 60 * 24))} days × BDT 200/day`
                              : `সংরক্ষণ: ${Math.floor((new Date() - new Date(impoundment.impound_date)) / (1000 * 60 * 60 * 24))} দিন × ২০০ টাকা/দিন`}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Display violations */}
                    {violations.map((violation) => (
                      <div key={violation.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h6 className="font-bold text-gray-800 dark:text-white text-sm">
                              {language === 'en' ? violation.violation_name_en : violation.violation_name_bn}
                            </h6>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {language === 'en' ? violation.location : (violation.location_bn || violation.location)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600 dark:text-red-400">
                              BDT {violation.total_amount}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              violation.payment_status === 'paid' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}>
                              {violation.payment_status === 'paid' 
                                ? (language === 'en' ? 'Paid' : 'পরিশোধিত')
                                : (language === 'en' ? 'Unpaid' : 'বাকি')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar size={12} />
                            <span className="font-medium">
                              {language === 'en' ? 'Issued:' : 'জারি:'}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-white">
                              {new Date(violation.violation_date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </span>
                          {violation.due_date && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                              (() => {
                                const daysUntilDue = Math.ceil((new Date(violation.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                                if (violation.payment_status === 'paid') return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
                                if (daysUntilDue < 0) return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
                                if (daysUntilDue <= 3) return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400';
                                return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
                              })()
                            }`}>
                              <span className="text-[10px] uppercase tracking-wide">
                                {language === 'en' ? 'Due' : 'শেষ তারিখ'}
                              </span>
                              <span className="font-bold">
                                {new Date(violation.due_date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              {violation.payment_status !== 'paid' && (() => {
                                const daysUntilDue = Math.ceil((new Date(violation.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                                if (daysUntilDue < 0) {
                                  return <span className="text-[10px]">({Math.abs(daysUntilDue)}d {language === 'en' ? 'overdue' : 'বিলম্ব'})</span>;
                                } else if (daysUntilDue <= 7) {
                                  return <span className="text-[10px]">({daysUntilDue}d {language === 'en' ? 'left' : 'বাকি'})</span>;
                                }
                                return null;
                              })()}
                            </span>
                          )}
                          <span className="text-gray-500 dark:text-gray-400">#{violation.violation_number}</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col gap-2">
                        {impoundments.filter(i => i.status === 'impounded').length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">
                              {language === 'en' ? 'Pending Impoundments:' : 'বাকি আটক:'}
                            </span>
                            <span className="font-bold text-orange-600 dark:text-orange-400">
                              BDT {impoundments.filter(i => i.status === 'impounded').reduce((sum, i) => sum + parseFloat(i.total_amount), 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {violations.filter(v => v.payment_status === 'unpaid').length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">
                              {language === 'en' ? 'Pending Violations:' : 'বাকি লঙ্ঘন:'}
                            </span>
                            <span className="font-bold text-red-600 dark:text-red-400">
                              BDT {violations.filter(v => v.payment_status === 'unpaid').reduce((sum, v) => sum + parseFloat(v.total_amount), 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {language === 'en' ? 'Total Pending:' : 'মোট বাকি:'}
                          </span>
                          <span className="text-xl font-bold text-primary">
                            BDT {(
                              violations.filter(v => v.payment_status === 'unpaid').reduce((sum, v) => sum + parseFloat(v.total_amount), 0) +
                              impoundments.filter(i => i.status === 'impounded').reduce((sum, i) => sum + parseFloat(i.total_amount), 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Record Inspection Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowInspectionModal(true)}
                className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {language === 'en' ? '📝 Record Inspection' : '📝 পরিদর্শন রেকর্ড করুন'}
              </motion.button>

              <button
                onClick={clearVehicleData}
                className="w-full mt-3 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                {language === 'en' ? 'Clear' : 'মুছুন'}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Inspection Modal */}
      <AnimatePresence>
        {showInspectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInspectionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                {language === 'en' ? 'Record Inspection' : 'পরিদর্শন রেকর্ড করুন'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'Inspection Type' : 'পরিদর্শনের ধরন'}
                  </label>
                  <select
                    value={inspectionType}
                    onChange={(e) => setInspectionType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  >
                    <option value="routine_check">Routine Check</option>
                    <option value="warning_issued">Warning Issued</option>
                    <option value="document_requested">Document Requested</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'Location' : 'অবস্থান'} <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={inspectionLocation}
                      onChange={(e) => setInspectionLocation(e.target.value)}
                      placeholder={language === 'en' ? 'Enter location...' : 'অবস্থান লিখুন...'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      type="text"
                      value={inspectionLocationBn}
                      onChange={(e) => setInspectionLocationBn(e.target.value)}
                      placeholder={language === 'en' ? 'Location in Bengali...' : 'বাংলায় অবস্থান...'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={getCurrentInspectionLocation}
                      disabled={gettingInspectionLocation}
                      className="w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary dark:text-green-400 rounded-xl transition-colors font-medium disabled:opacity-50"
                    >
                      {gettingInspectionLocation 
                        ? (language === 'en' ? 'Getting location...' : 'অবস্থান নেওয়া হচ্ছে...') 
                        : (language === 'en' ? 'Use Current Location' : 'বর্তমান অবস্থান ব্যবহার করুন')}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'Remarks (Optional)' : 'মন্তব্য (ঐচ্ছিক)'}
                  </label>
                  <textarea
                    value={inspectionRemarks}
                    onChange={(e) => setInspectionRemarks(e.target.value)}
                    placeholder={language === 'en' ? 'Enter remarks...' : 'মন্তব্য লিখুন...'}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInspectionModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  {language === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  onClick={handleRecordInspection}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (language === 'en' ? 'Saving...' : 'সংরক্ষণ করা হচ্ছে...') : (language === 'en' ? 'Record' : 'রেকর্ড করুন')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Violation Modal */}
      <AddViolationModal
        isOpen={showAddViolationModal}
        onClose={() => setShowAddViolationModal(false)}
        vehicleData={selectedVehicle}
        onSuccess={handleViolationAdded}
      />

      {/* Impound Vehicle Modal */}
      <ImpoundVehicleModal
        isOpen={showImpoundModal}
        onClose={() => setShowImpoundModal(false)}
        vehicleData={selectedVehicle}
        onSuccess={handleViolationAdded}
      />
    </div>
  );
};

export default React.memo(PoliceVerification);
