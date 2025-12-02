import { motion, AnimatePresence } from 'framer-motion';
import { Car, Calendar, User, IdentificationCard, QrCode, Download, ArrowsClockwise, CreditCard } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import QRCode from 'qrcode';
import { useState, useEffect } from 'react';

const VehicleRegistrationCard = ({ vehicle, index = 0, onShowTaxToken, onDownload }) => {
  const { language } = useLanguage();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (vehicle?.registration_number) {
      generateQRCode();
    }
  }, [vehicle]);

  const generateQRCode = async () => {
    try {
      // Use registration_number for QR code (simpler and works with tax token QR)
      const qrData = vehicle.registration_number;
      const url = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('QR generation error:', error);
    }
  };

  const isExpired = new Date(vehicle.valid_until) < new Date();
  
  // Debug logging (remove after testing)
  useEffect(() => {
    console.log('🚗 Vehicle Card Debug:', {
      registration: vehicle.registration_number,
      valid_until: vehicle.valid_until,
      valid_until_date: new Date(vehicle.valid_until),
      today: new Date(),
      isExpired: isExpired
    });
  }, [vehicle, isExpired]);

  const generateQRCodeForDownload = () => {
    const qrData = `VC-${vehicle.id}|${vehicle.registration_plate.en}|${vehicle.vehicle_name}|${vehicle.registration_date}`;
    return qrData;
  };

  return (
    <div 
      className="relative cursor-pointer" 
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {/* Front Side */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: isFlipped ? 0 : 1, 
          scale: 1,
          rotateY: isFlipped ? 180 : 0
        }}
        transition={{ delay: index * 0.1, duration: 0.6 }}
        className={`${isFlipped ? 'hidden' : 'block'} relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl overflow-hidden text-white`}
      >
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs opacity-90 uppercase tracking-wider mb-1">
              {language === 'en' ? 'Bangladesh Road Transport Authority' : 'বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ'}
            </p>
            <h4 className="text-xl font-bold">
              {language === 'en' ? 'Vehicle Smart Card' : 'যানবাহন স্মার্ট কার্ড'}
            </h4>
          </div>
          <img src="/brta.png" alt="BRTA" className="h-12 w-12 bg-white/20 rounded-lg p-2 backdrop-blur-sm" />
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-6">
          {/* Owner Photo */}
          <div>
            <div className="w-28 h-32 bg-white/20 backdrop-blur-sm rounded-lg overflow-hidden border-2 border-white/40">
              {vehicle?.vehicle_photo_url ? (
                <img 
                  src={vehicle.vehicle_photo_url} 
                  alt="Owner" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center">
                  <User size={40} weight="duotone" className="text-white/60" />
                </div>
              )}
            </div>
            <p className="text-xs text-center mt-2 opacity-80">
              {language === 'en' ? 'Owner' : 'মালিক'}
            </p>
          </div>

          {/* Main Details */}
          <div className="space-y-3">
            {/* Number Plate */}
            <div className="bg-black text-white px-4 py-3 rounded-xl text-center border-4 border-yellow-400 shadow-lg">
              <p className="text-xl font-bold tracking-wider">
                {language === 'en' ? vehicle.registration_plate.en : vehicle.registration_plate.bn}
              </p>
            </div>

            {/* Vehicle Info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'Vehicle' : 'যানবাহন'}
                </p>
                <p className="font-bold text-base">{vehicle.vehicle_name}</p>
                <p className="text-xs opacity-90">{vehicle.model}</p>
              </div>
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'Type' : 'ধরন'}
                </p>
                <p className="font-bold text-base">{vehicle.vehicle_type}</p>
                <p className="text-xs opacity-90">{vehicle.engine_cc} CC</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'Registration No.' : 'নিবন্ধন নং'}
                </p>
                <p className="font-bold text-sm">{vehicle.registration_number}</p>
              </div>
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'Status' : 'অবস্থা'}
                </p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block ${
                  isExpired ? 'bg-red-500/30 border border-red-300' : 'bg-green-500/30 border border-green-300'
                }`}>
                  {isExpired 
                    ? (language === 'en' ? 'Expired' : 'মেয়াদ শেষ')
                    : (language === 'en' ? 'Valid' : 'বৈধ')
                  }
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                {language === 'en' ? 'Owner Name' : 'মালিকের নাম'}
              </p>
              <p className="font-bold">
                {language === 'en' ? vehicle.owner_name_en : vehicle.owner_name_bn}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'NID' : 'এনআইডি'}
                </p>
                <p className="font-bold text-sm">{vehicle.owner_nid}</p>
              </div>
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'DL Number' : 'ডিএল নম্বর'}
                </p>
                <p className="font-bold text-sm">{vehicle.owner_dl_number || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Validity Footer */}
        <div className="mt-6 pt-4 border-t border-white/30">
          <div className="flex items-center justify-between text-xs opacity-90 mb-3">
            <div>
              <span className="opacity-70">{language === 'en' ? 'Registration:' : 'নিবন্ধন:'}</span>
              <span className="ml-1 font-semibold">{vehicle.registration_date}</span>
            </div>
            <div>
              <span className="opacity-70">{language === 'en' ? 'Valid Until:' : 'বৈধতা:'}</span>
              <span className={`ml-1 font-semibold ${isExpired ? 'text-red-300' : 'text-green-300'}`}>
                {vehicle.valid_until}
              </span>
            </div>
            <div>
              <span className="opacity-70">{language === 'en' ? 'Engine:' : 'ইঞ্জিন:'}</span>
              <span className="ml-1 font-semibold text-xs">{vehicle.engine_number}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {isExpired ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onShowTaxToken) {
                    // Show tax token modal which will show renew button
                    onShowTaxToken(vehicle);
                  }
                }}
                className="w-full px-3 py-2 bg-yellow-400 text-green-800 hover:bg-yellow-300 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <ArrowsClockwise size={16} />
                {language === 'en' ? 'Renew Now' : 'এখনই নবায়ন করুন'}
              </motion.button>
            ) : (
              <>
                {onDownload && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(vehicle);
                    }}
                    className="flex-1 px-3 py-2 bg-white text-blue-600 hover:bg-white/90 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5"
                  >
                    <Download size={16} />
                    {language === 'en' ? 'Download' : 'ডাউনলোড'}
                  </motion.button>
                )}
                {onShowTaxToken && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowTaxToken(vehicle);
                    }}
                    className={`${onDownload ? 'flex-1' : 'w-full'} px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5`}
                  >
                    <CreditCard size={16} />
                    {language === 'en' ? 'Tax Token' : 'ট্যাক্স টোকেন'}
                  </motion.button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      </motion.div>

      {/* Back Side */}
      <motion.div
        animate={{ 
          opacity: isFlipped ? 1 : 0,
          rotateY: isFlipped ? 0 : -180
        }}
        transition={{ duration: 0.6 }}
        className={`${!isFlipped ? 'hidden' : 'block'} relative bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 rounded-2xl shadow-2xl overflow-hidden text-white`}
      >
        {/* Background Decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="relative z-10 p-8">
          <h4 className="text-xl font-bold mb-6 text-center">
            {language === 'en' ? 'Vehicle Details' : 'যানবাহনের বিবরণ'}
          </h4>
          
          <div className="flex justify-center items-center gap-6 mb-6">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36" />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center">
                  <QrCode size={48} className="text-gray-400 animate-pulse" />
                </div>
              )}
              <p className="text-xs text-center mt-2 text-gray-800 font-semibold">
                {language === 'en' ? 'Scan to Verify' : 'যাচাই করুন'}
              </p>
            </div>
            
            {/* Details */}
            <div className="space-y-2.5 text-sm">
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'Engine No.' : 'ইঞ্জিন নং'}
                </p>
                <p className="font-semibold">{vehicle.engine_number}</p>
              </div>
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'Owner' : 'মালিক'}
                </p>
                <p className="font-semibold">{language === 'en' ? vehicle.owner_name_en : vehicle.owner_name_bn}</p>
              </div>
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'NID' : 'এনআইডি'}
                </p>
                <p className="font-semibold">{vehicle.owner_nid}</p>
              </div>
              <div>
                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                  {language === 'en' ? 'Contact' : 'যোগাযোগ'}
                </p>
                <p className="font-semibold">{vehicle.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-white/30">
            <p className="text-xs opacity-80 text-center">
              {language === 'en' ? 'Click card to flip • For verification: www.brta.gov.bd' : 'কার্ড উল্টাতে ক্লিক করুন • যাচাইয়ের জন্য: www.brta.gov.bd'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VehicleRegistrationCard;
