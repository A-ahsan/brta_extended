import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Car,
  CreditCard,
  Calendar,
  X,
  ArrowLeft,
  User,
} from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

const PublicTaxTokenVerification = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [scanMode, setScanMode] = useState('camera');
  const [ownerPhoto, setOwnerPhoto] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
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
    scannerActiveRef.current = false;
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.label);
      });
      setCameraStream(null);
    }
    
    if (scanner) {
      try {
        scanner.clear().catch(() => {});
      } catch (e) {
        console.log('Scanner cleanup error:', e);
      }
      setScanner(null);
    }
    
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped video track:', track.label);
          });
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      stream.getTracks().forEach(track => track.stop());
      
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
        toast.error(language === 'en' ? 'Camera permission denied' : 'ক্যামেরা অনুমতি প্রত্যাখ্যান');
      } else if (error.name === 'NotFoundError') {
        toast.error(language === 'en' ? 'No camera found' : 'ক্যামেরা পাওয়া যায়নি');
      } else {
        toast.error(language === 'en' ? 'Failed to start camera' : 'ক্যামেরা চালু করতে ব্যর্থ');
      }
    }
  };

  const onScanSuccess = async (decodedText) => {
    if (!scannerActiveRef.current) {
      console.log('Scan blocked: scanner already stopped');
      return;
    }
    
    const now = Date.now();
    if (now - lastScanTimeRef.current < 3000) {
      console.log('Scan blocked: too soon');
      return;
    }
    
    if (scanningLockRef.current) {
      console.log('Scan blocked: already processing');
      return;
    }
    
    scannerActiveRef.current = false;
    scanningLockRef.current = true;
    lastScanTimeRef.current = now;
    setIsScanning(true);
    
    cleanupScanner();
    setShowQRScanner(false);
    
    try {
      // Parse QR data: TT-2025-123456|PLATE|₹5000|31/12/2025
      const parts = decodedText.split('|');
      const tokenNumber = parts[0];
      
      if (tokenNumber) {
        await fetchTokenDetails(tokenNumber);
      } else {
        throw new Error('Invalid QR data');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      toast.error(language === 'en' ? 'Invalid QR code' : 'অবৈধ QR কোড');
    } finally {
      setTimeout(() => {
        scanningLockRef.current = false;
        setIsScanning(false);
      }, 2000);
    }
  };

  const onScanError = (error) => {
    // Silent
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-file-reader');
      
      const result = await html5QrCode.scanFile(file, true);
      const parts = result.split('|');
      const tokenNumber = parts[0];
      
      if (tokenNumber) {
        await fetchTokenDetails(tokenNumber);
        setShowQRScanner(false);
        toast.success(language === 'en' ? 'QR scanned!' : 'QR স্ক্যান সম্পন্ন!');
      } else {
        throw new Error('Invalid QR data');
      }
    } catch (error) {
      console.error('File scan error:', error);
      toast.error(language === 'en' ? 'Invalid QR image' : 'অবৈধ QR ছবি');
    }
  };

  const fetchTokenDetails = async (searchTerm) => {
    setLoadingToken(true);
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('tax_tokens')
        .select('*')
        .eq('token_number', searchTerm.toUpperCase())
        .single();

      if (tokenError || !tokenData) {
        toast.error(language === 'en' ? 'Tax token not found' : 'ট্যাক্স টোকেন পাওয়া যায়নি');
        setSelectedToken(null);
        setSelectedVehicle(null);
        return;
      }

      setSelectedToken(tokenData);

      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('registered_vehicles')
        .select('*')
        .eq('id', tokenData.registered_vehicle_id)
        .single();

      if (vehicleData && !vehicleError) {
        setSelectedVehicle(vehicleData);
        
        // Fetch owner photo
        if (vehicleData.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('photo_url, avatar_url')
            .eq('id', vehicleData.user_id)
            .single();
          
          if (profileData) {
            setOwnerPhoto(profileData.photo_url || profileData.avatar_url);
          }
        }
      }
      
      toast.success(language === 'en' ? 'Tax token found!' : 'ট্যাক্স টোকেন পাওয়া গেছে!');
    } catch (error) {
      console.error('Error fetching tax token:', error);
      toast.error(language === 'en' ? 'Search failed' : 'অনুসন্ধান ব্যর্থ');
      setSelectedToken(null);
      setSelectedVehicle(null);
      setOwnerPhoto(null);
    } finally {
      setLoadingToken(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error(language === 'en' ? 'Enter tax token number' : 'ট্যাক্স টোকেন নম্বর লিখুন');
      return;
    }
    fetchTokenDetails(searchQuery.trim());
  };

  const clearData = () => {
    setSelectedToken(null);
    setSelectedVehicle(null);
    setSearchQuery('');
    setOwnerPhoto(null);
    scanningLockRef.current = false;
    scannerActiveRef.current = false;
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
            >
              <ArrowLeft size={20} weight="bold" />
              <span className="font-medium">{language === 'en' ? 'Back' : 'ফিরে যান'}</span>
            </button>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4">
              <CreditCard size={32} weight="duotone" className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {language === 'en' ? 'Tax Token Verification' : 'ট্যাক্স টোকেন যাচাইকরণ'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'en' ? 'Verify vehicle tax token authenticity' : 'যানবাহন ট্যাক্স টোকেন সত্যতা যাচাই করুন'}
            </p>
          </div>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6"
        >
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={language === 'en' ? 'Enter tax token number (e.g., TT-2025-123456)' : 'ট্যাক্স টোকেন নম্বর লিখুন'}
                className="w-full px-4 py-3 pl-12 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:border-green-500 focus:outline-none transition-all"
              />
              <MagnifyingGlass size={20} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSearch}
              disabled={loadingToken}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loadingToken ? '...' : (language === 'en' ? 'Search' : 'খুঁজুন')}
            </motion.button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
              {language === 'en' ? 'or' : 'অথবা'}
            </span>
            <button
              onClick={() => setShowQRScanner(true)}
              className="text-green-600 dark:text-green-400 font-semibold hover:underline inline-flex items-center gap-2"
            >
              <QrCode size={20} weight="duotone" />
              {language === 'en' ? 'Scan QR Code' : 'QR কোড স্ক্যান করুন'}
            </button>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {selectedToken && selectedVehicle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  {selectedToken.status === 'active' ? (
                    <CheckCircle size={28} weight="fill" className="text-green-500" />
                  ) : (
                    <XCircle size={28} weight="fill" className="text-red-500" />
                  )}
                  {language === 'en' ? 'Tax Token Details' : 'ট্যাক্স টোকেন বিবরণ'}
                </h2>
                <button
                  onClick={clearData}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Tax Token Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <CreditCard size={20} />
                    {language === 'en' ? 'Token Information' : 'টোকেন তথ্য'}
                  </h3>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Token Number' : 'টোকেন নম্বর'}</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">{selectedToken.token_number}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Issue Date' : 'ইস্যুর তারিখ'}</p>
                          <p className="font-semibold text-gray-800 dark:text-white">{new Date(selectedToken.issue_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Valid Until' : 'বৈধ পর্যন্ত'}</p>
                          <p className="font-semibold text-gray-800 dark:text-white">{new Date(selectedToken.valid_until).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Amount Paid' : 'পরিশোধিত পরিমাণ'}</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">৳ {selectedToken.amount_paid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Status' : 'স্ট্যাটাস'}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          selectedToken.status === 'active' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {selectedToken.status === 'active' ? 
                            (language === 'en' ? 'Active' : 'সক্রিয়') :
                            (language === 'en' ? 'Expired' : 'মেয়াদ শেষ')
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Car size={20} />
                    {language === 'en' ? 'Vehicle Details' : 'যানবাহনের বিবরণ'}
                  </h3>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-3">
                    {ownerPhoto && (
                      <div className="flex justify-center mb-3">
                        <img 
                          src={ownerPhoto} 
                          alt="Owner" 
                          className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-600 shadow-md"
                        />
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Vehicle' : 'যানবাহন'}</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{selectedVehicle.vehicle_name} {selectedVehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Registration Plate' : 'নিবন্ধন প্লেট'}</p>
                      <p className="font-bold text-lg text-gray-800 dark:text-white">
                        {language === 'en' ? selectedVehicle.registration_plate.en : selectedVehicle.registration_plate.bn}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Registration Number' : 'নিবন্ধন নম্বর'}</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{selectedVehicle.registration_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'en' ? 'Owner' : 'মালিক'}</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{selectedVehicle.owner_name_en}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                    {language === 'en' ? 'Scan Tax Token QR' : 'ট্যাক্স টোকেন QR স্ক্যান'}
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

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      cleanupScanner();
                      setScanMode('camera');
                    }}
                    className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all ${
                      scanMode === 'camera'
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
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
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {language === 'en' ? '📁 Upload' : '📁 আপলোড'}
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
                      <QrCode size={48} weight="duotone" className="text-gray-400" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium">
                        {language === 'en' ? 'Click to upload QR image' : 'QR ছবি আপলোড করতে ক্লিক করুন'}
                      </p>
                    </label>
                    <div id="qr-file-reader"></div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PublicTaxTokenVerification;
