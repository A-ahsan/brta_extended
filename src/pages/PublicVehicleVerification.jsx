import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Car,
  User,
  IdentificationCard,
  Calendar,
  X,
  ArrowLeft,
  Warning,
  MapPin,
  Clock,
  CurrencyCircleDollar,
} from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

const PublicVehicleVerification = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [scanMode, setScanMode] = useState('camera');
  const [ownerPhoto, setOwnerPhoto] = useState(null);
  const [taxTokenData, setTaxTokenData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loadingViolations, setLoadingViolations] = useState(false);
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
          .select('photo_url, avatar_url')
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
      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('registered_vehicle_id', vehicleId)
        .order('violation_date', { ascending: false });

      if (error) throw error;
      setViolations(data || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
      setViolations([]);
    } finally {
      setLoadingViolations(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error(language === 'en' ? 'Enter registration number or plate' : 'নিবন্ধন নম্বর বা প্লেট লিখুন');
      return;
    }
    fetchVehicleDetails(searchQuery.trim());
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md"
          >
            <ArrowLeft size={24} weight="bold" className="text-primary" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              {language === 'en' ? 'Vehicle Verification' : 'যানবাহন যাচাইকরণ'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'en' ? 'Verify any registered vehicle in Bangladesh' : 'বাংলাদেশে যেকোনো নিবন্ধিত যানবাহন যাচাই করুন'}
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl"
        >
          {/* QR Scanner Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
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
                    <div id="qr-reader" className="rounded-xl overflow-hidden"></div>
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
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 py-1 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-semibold rounded-full border-2 border-gray-200 dark:border-gray-700">
                {language === 'en' ? 'OR' : 'অথবা'}
              </span>
            </div>
          </div>

          {/* Manual Search */}
          <div className="space-y-4">
            <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
              {language === 'en' ? 'Search by registration number or plate:' : 'নিবন্ধন নম্বর বা প্লেট দিয়ে অনুসন্ধান করুন:'}
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={language === 'en' ? 'Reg number, plate, or tax token...' : 'রেজি নং, প্লেট, বা ট্যাক্স টোকেন...'}
                className="flex-1 px-5 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all text-lg"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSearch}
                className="px-8 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <MagnifyingGlass size={20} weight="bold" />
                {language === 'en' ? 'Search' : 'খুঁজুন'}
              </motion.button>
            </div>
          </div>

          {/* Search Result */}
          {selectedVehicle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl border-2 border-gray-300 dark:border-gray-600 shadow-lg"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {/* Owner Photo */}
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/20 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    {ownerPhoto ? (
                      <img src={ownerPhoto} alt="Owner" className="w-full h-full object-cover" />
                    ) : selectedVehicle?.vehicle_photo_url ? (
                      <img src={selectedVehicle.vehicle_photo_url} alt="Owner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                      {language === 'en' ? 'Vehicle Details' : 'যানবাহনের বিবরণ'}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {language === 'en' ? 'Verified information from BRTA database' : 'BRTA ডাটাবেস থেকে যাচাইকৃত তথ্য'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedVehicle)}
                  <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusColor(selectedVehicle)}`}>
                    {getStatusText(selectedVehicle)}
                  </span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Car size={14} />
                      {language === 'en' ? 'Plate Number' : 'প্লেট নম্বর'}
                    </span>
                    <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                      {language === 'en' ? selectedVehicle.registration_plate.en : selectedVehicle.registration_plate.bn}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{language === 'en' ? 'Registration #' : 'নিবন্ধন নং'}</span>
                    <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">{selectedVehicle.registration_number}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{language === 'en' ? 'Vehicle' : 'যানবাহন'}</span>
                    <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                      {selectedVehicle.vehicle_name} {selectedVehicle.model}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedVehicle.vehicle_type} • {selectedVehicle.engine_cc} CC
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <User size={14} />
                      {language === 'en' ? 'Owner' : 'মালিক'}
                    </span>
                    <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                      {language === 'en' ? selectedVehicle.owner_name_en : selectedVehicle.owner_name_bn}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <IdentificationCard size={14} />
                      {language === 'en' ? 'NID' : 'এনআইডি'}
                    </span>
                    <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">{selectedVehicle.owner_nid}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{language === 'en' ? 'DL Number' : 'ডিএল নম্বর'}</span>
                    <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">
                      {selectedVehicle.owner_dl_number || 'N/A'}
                    </p>
                  </div>
                  {taxTokenData && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <CreditCard size={14} />
                        {language === 'en' ? 'Tax Token' : 'ট্যাক্স টোকেন'}
                      </span>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                        {taxTokenData.token_number}
                      </p>
                    </div>
                  )}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={14} />
                      {language === 'en' ? 'Registration Date' : 'নিবন্ধনের তারিখ'}
                    </span>
                    <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">{selectedVehicle.registration_date}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{language === 'en' ? 'Valid Until' : 'বৈধতা'}</span>
                    <p className={`text-xl font-bold mt-1 ${selectedVehicle.isExpired ? 'text-danger' : 'text-success'}`}>
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
                          ? 'This vehicle registration has expired. The vehicle should not be operated on public roads.' 
                          : 'এই যানবাহন নিবন্ধন মেয়াদ শেষ হয়ে গেছে। যানবাহনটি পাবলিক রাস্তায় চালানো উচিত নয়।'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Violations Section */}
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700">
                <h5 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                  <Warning size={24} weight="fill" className="text-red-600" />
                  {language === 'en' ? 'Violations & Fines' : 'লঙ্ঘন ও জরিমানা'}
                </h5>

                {loadingViolations ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : violations.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-2" weight="duotone" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {language === 'en' ? 'No violations recorded' : 'কোনো লঙ্ঘন রেকর্ড করা হয়নি'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {violations.map((violation) => (
                      <div key={violation.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h6 className="font-bold text-gray-800 dark:text-white text-sm">
                              {language === 'en' ? violation.violation_name_en : violation.violation_name_bn}
                            </h6>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                              <MapPin size={12} />
                              {language === 'en' ? violation.location : (violation.location_bn || violation.location)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                              <CurrencyCircleDollar size={16} weight="bold" />
                              {violation.total_amount}
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
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(violation.violation_date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD')}
                          </span>
                          <span>#{violation.violation_number}</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {language === 'en' ? 'Total Pending:' : 'মোট বাকি:'}
                        </span>
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">
                          BDT {violations.filter(v => v.payment_status === 'unpaid').reduce((sum, v) => sum + parseFloat(v.total_amount), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={clearVehicleData}
                className="w-full mt-6 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                {language === 'en' ? 'Clear' : 'মুছুন'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PublicVehicleVerification;
