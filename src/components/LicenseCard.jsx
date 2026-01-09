import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  CheckCircle,
  ArrowsClockwise,
  DownloadSimple,
  MapPin,
  Phone,
  Sparkle,
  Warning
} from 'phosphor-react';

const LicenseCard = ({ license, language, onDownload, onRenew, generateLicenseQRCode }) => {
  const [flipped, setFlipped] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const isExpired = new Date(license.expiry_date) < new Date();
  const isActive = license.status === 'active' && !isExpired;

  return (
    <div className="w-full perspective-1000">
      <motion.div
        className="relative w-full preserve-3d cursor-pointer"
        style={{ height: '620px', transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        onClick={() => setFlipped(!flipped)}
      >
        {/* Front Side */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)'
          }}
        >
          <div className="bg-gradient-to-br from-green-600 via-green-500 to-green-700 p-6 rounded-2xl shadow-2xl text-white relative overflow-hidden h-full flex flex-col">
            {/* Transparent Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <img src="/brta.png" alt="" className="w-64 h-64 object-contain" />
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 flex-1 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs opacity-90 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Bangladesh Road Transport Authority' : 'বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ'}
                  </p>
                  <h4 className="text-xl font-bold">
                    {language === 'en' ? 'Driving License' : 'ড্রাইভিং লাইসেন্স'}
                  </h4>
                </div>
                <div className="h-12 w-12 bg-white/20 rounded-lg p-2 backdrop-blur-sm flex items-center justify-center">
                  <Sparkle size={24} weight="duotone" className="text-white" />
                </div>
              </div>

              {/* Photo and Details */}
              <div className="grid grid-cols-[120px_1fr] gap-5 mb-4">
                {/* User Photo */}
                <div className="row-span-2">
                  <div className="w-28 h-36 bg-white/20 backdrop-blur-sm rounded-lg overflow-hidden border-2 border-white/40">
                    {license.photo_url ? (
                      <img 
                        src={license.photo_url} 
                        alt="License Holder" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center">
                        <User size={48} weight="duotone" className="text-white/60" />
                      </div>
                    )}
                  </div>
                </div>

                {/* License Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'License No.' : 'লাইসেন্স নং'}
                    </p>
                    <p className="text-lg font-bold">{license.license_number}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'Name' : 'নাম'}
                    </p>
                    <p className="text-base font-bold">{license.full_name_en}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'Father Name' : 'পিতার নাম'}
                    </p>
                    <p className="text-sm font-bold">{license.father_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'Date of Birth' : 'জন্ম তারিখ'}
                    </p>
                    <p className="text-sm font-bold">{formatDate(license.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'Gender' : 'লিঙ্গ'}
                    </p>
                    <p className="text-sm font-bold">{license.gender}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'Blood Group' : 'রক্তের গ্রুপ'}
                    </p>
                    <p className="text-sm font-bold">{license.blood_group}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'Issuing Authority' : 'ইস্যুকারী কর্তৃপক্ষ'}
                    </p>
                    <p className="text-sm font-bold">{license.issuing_authority || 'BRTA Head Office'}</p>
                  </div>
                </div>
              </div>

              {/* Validity and Status */}
              <div className="mt-auto border-t border-white/30 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-base">
                  <div>
                    <p className="text-xs opacity-75">
                      {language === 'en' ? 'Issue Date' : 'ইস্যুর তারিখ'}
                    </p>
                    <p className="font-semibold">{formatDate(license.issue_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75">
                      {language === 'en' ? 'Expiry Date' : 'মেয়াদ শেষ'}
                    </p>
                    <p className="font-semibold">{formatDate(license.expiry_date)}</p>
                  </div>
                </div>

                {isActive ? (
                  <div className="flex items-center gap-2 bg-green-500/20 border border-green-300/30 rounded-lg px-3 py-2">
                    <CheckCircle size={20} weight="fill" />
                    <span className="text-sm font-semibold">
                      {language === 'en' ? `Valid Until ${formatDate(license.expiry_date)}` : `বৈধ ${formatDate(license.expiry_date)} পর্যন্ত`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-500/20 border border-red-300/30 rounded-lg px-3 py-2">
                    <Warning size={20} weight="fill" />
                    <span className="text-sm font-semibold">
                      {language === 'en' ? 'License Expired' : 'লাইসেন্স মেয়াদোত্তীর্ণ'}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                {isExpired ? (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenew(license);
                    }}
                    className="w-full px-4 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 rounded-lg font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <ArrowsClockwise size={20} weight="bold" />
                    {language === 'en' ? 'Renew License' : 'লাইসেন্স নবায়ন করুন'}
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(license);
                    }}
                    className="w-full px-4 py-3.5 bg-white text-green-600 hover:bg-green-50 rounded-lg font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <DownloadSimple size={20} weight="bold" />
                    {language === 'en' ? 'Download' : 'ডাউনলোড'}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-6 rounded-2xl shadow-2xl text-white relative overflow-hidden h-full flex flex-col">
            {/* Transparent Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <img src="/brta.png" alt="" className="w-64 h-64 object-contain" />
            </div>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="relative z-10 flex-1 flex flex-col">
              <h4 className="text-lg font-bold mb-4 text-center border-b border-white/30 pb-2">
                {language === 'en' ? 'License Details' : 'লাইসেন্সের বিবরণ'}
              </h4>

              <div className="flex flex-col items-center mb-3 flex-1 space-y-4">
                {/* QR Code */}
                <div className="bg-white p-3 rounded-xl">
                  <img 
                    src={generateLicenseQRCode(license.license_number)} 
                    alt="QR Code" 
                    className="w-32 h-32"
                  />
                  <p className="text-xs text-center mt-1.5 text-gray-800 font-semibold">
                    {language === 'en' ? 'Scan to Verify' : 'স্ক্যান করুন'}
                  </p>
                </div>

                {/* Additional Info - Centered */}
                <div className="space-y-3 text-center max-w-md w-full">
                  <div>
                    <p className="text-xs opacity-75 uppercase tracking-wider mb-1.5">
                      {language === 'en' ? 'License Number' : 'লাইসেন্স নম্বর'}
                    </p>
                    <p className="text-lg font-bold text-yellow-300">{license.license_number}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/30 pt-3">
                    <div>
                      <p className="text-xs opacity-75 uppercase tracking-wider mb-1">
                        {language === 'en' ? 'Type' : 'ধরন'}
                      </p>
                      <p className="text-sm font-semibold">{license.license_type}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-75 uppercase tracking-wider mb-1">
                        {language === 'en' ? 'Category' : 'শ্রেণী'}
                      </p>
                      <p className="text-sm font-semibold">{license.license_category}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/30 pt-3">
                    <p className="text-xs opacity-75 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'Address' : 'ঠিকানা'}
                    </p>
                    <p className="text-sm leading-relaxed">{license.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/30 pt-3">
                    <div>
                      <p className="text-xs opacity-75 uppercase tracking-wider mb-1">
                        {language === 'en' ? 'Issue Date' : 'ইস্যু তারিখ'}
                      </p>
                      <p className="text-sm font-semibold">{formatDate(license.issue_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-75 uppercase tracking-wider mb-1">
                        {language === 'en' ? 'Expiry Date' : 'মেয়াদ শেষ'}
                      </p>
                      <p className="text-sm font-semibold">{formatDate(license.expiry_date)}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/30 pt-3">
                    <p className="text-xs opacity-75 uppercase tracking-wider mb-1">
                      {language === 'en' ? 'Status' : 'অবস্থা'}
                    </p>
                    <p className="text-sm font-bold uppercase">{license.status}</p>
                  </div>
                </div>
              </div>

              {/* Found/Lost License Message - Positioned at bottom */}
              <div className="mt-auto pt-4 border-t border-white/30">
                <p className="text-xs text-center opacity-95 leading-relaxed font-medium px-2">
                  {language === 'en' 
                    ? 'If the license is found or lost, please inform nearest Police Station' 
                    : 'লাইসেন্স পাওয়া গেলে বা হারিয়ে গেলে, অনুগ্রহ করে নিকটস্থ থানায় জানান'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LicenseCard;
