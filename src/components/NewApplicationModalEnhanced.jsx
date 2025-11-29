import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, CheckCircle, WarningCircle, CircleNotch, CarSimple, Bicycle } from 'phosphor-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { createWorker } from 'tesseract.js';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const vehicleAnimations = {
  motorcycle: 'https://lottie.host/c77efa6e-4e4b-473f-8518-b6147ce58d11/wbmo8770ze.lottie',
  car: 'https://lottie.host/5c743060-b312-40cf-8ae6-6d11bdb32b3e/rxeXGZHj2h.lottie',
};

const licenseAnimations = {
  professional: '/ID Card.json',
  nonProfessional: '/idcard.json',
};

export default function NewApplicationModal({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  // Step management
  const [step, setStep] = useState(1); // 1: Type Selection, 2: NID Upload, 3: Face Crop, 4: Review & Submit
  
  // Form data
  const [licenseType, setLicenseType] = useState(''); // 'Light' or 'Motor'
  const [licenseCategory, setLicenseCategory] = useState(''); // 'Professional' or 'Non-Professional'
  const [nidImage, setNidImage] = useState(null);
  const [nidNumber, setNidNumber] = useState('');
  const [nidData, setNidData] = useState(null);
  const [faceCrop, setFaceCrop] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  
  // UI states
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [cropArea, setCropArea] = useState({ x: 10, y: 50, width: 100, height: 130 }); // Initial face position
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setLicenseType('');
        setLicenseCategory('');
        setNidImage(null);
        setNidNumber('');
        setNidData(null);
        setFaceCrop(null);
        setUserPhoto(null);
        setProcessing(false);
      }, 300);
    }
  }, [open]);

  // Step 1: Select License Type & Category
  const handleTypeSelection = (type, category) => {
    setLicenseType(type);
    setLicenseCategory(category);
    setStep(2);
  };

  // Step 2: Upload NID and Extract Number
  const handleNIDUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessing(true);
    setOcrProgress(0);

    try {
      // Create image URL for display
      const imageUrl = URL.createObjectURL(file);
      setNidImage(imageUrl);

      // Run Tesseract OCR
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Extract NID number (10-13 digits)
      const nidMatch = text.match(/\b\d{10,13}\b/);
      if (nidMatch) {
        setNidNumber(nidMatch[0]);
        toast.success(isEnglish ? `NID Number detected: ${nidMatch[0]}` : `এনআইডি নম্বর সনাক্ত: ${nidMatch[0]}`);
      } else {
        toast.error(isEnglish ? 'Could not detect NID number. Please enter manually.' : 'এনআইডি নম্বর সনাক্ত করা যায়নি। দয়া করে ম্যানুয়ালি লিখুন।');
      }

      setStep(3);
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error(isEnglish ? 'Failed to process NID image' : 'এনআইডি ছবি প্রক্রিয়া করতে ব্যর্থ');
    } finally {
      setProcessing(false);
      setOcrProgress(0);
    }
  };

  // Step 3: Verify NID & Crop Face
  const handleVerifyNID = async () => {
    if (!nidNumber || nidNumber.length < 10) {
      toast.error(isEnglish ? 'Please enter a valid NID number' : 'একটি বৈধ এনআইডি নম্বর লিখুন');
      return;
    }

    setProcessing(true);

    try {
      // Query nid_mock_server
      const { data, error } = await supabase
        .from('nid_mock_server')
        .select('*')
        .eq('nid_number', nidNumber)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast.error(isEnglish ? 'NID not found in database. Please check the number.' : 'এনআইডি ডাটাবেসে পাওয়া যায়নি। নম্বর চেক করুন।');
        setProcessing(false);
        return;
      }

      setNidData(data);
      toast.success(isEnglish ? 'NID verified successfully!' : 'এনআইডি সফলভাবে যাচাই করা হয়েছে!');
      
      // Proceed to face cropping
      setStep(4);
    } catch (error) {
      console.error('NID Verification Error:', error);
      toast.error(isEnglish ? 'Failed to verify NID' : 'এনআইডি যাচাই করতে ব্যর্থ');
    } finally {
      setProcessing(false);
    }
  };

  // Step 4: Crop Face from NID
  const handleCropFace = () => {
    if (!nidImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set canvas size to crop area
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      // Draw cropped area
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );

      // Convert to blob
      canvas.toBlob((blob) => {
        setFaceCrop(blob);
        setStep(5);
      }, 'image/jpeg', 0.95);
    };

    img.src = nidImage;
  };

  // Step 5: Upload User Photo & Submit
  const handleUserPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserPhoto(file);
    }
  };

  const handleSubmit = async () => {
    if (!userPhoto) {
      toast.error(isEnglish ? 'Please upload your photo' : 'আপনার ছবি আপলোড করুন');
      return;
    }

    setProcessing(true);

    try {
      // 1. Upload face crop to storage
      const faceFileName = `${user.id}_${Date.now()}_face.jpg`;
      const { data: faceData, error: faceError } = await supabase.storage
        .from('license-nid-faces')
        .upload(faceFileName, faceCrop);

      if (faceError) throw faceError;

      const { data: faceUrlData } = supabase.storage
        .from('license-nid-faces')
        .getPublicUrl(faceFileName);

      // 2. Upload user photo to storage
      const photoFileName = `${user.id}_${Date.now()}_photo.jpg`;
      const { data: photoData, error: photoError } = await supabase.storage
        .from('license-user-photos')
        .upload(photoFileName, userPhoto);

      if (photoError) throw photoError;

      const { data: photoUrlData } = supabase.storage
        .from('license-user-photos')
        .getPublicUrl(photoFileName);

      // 3. Generate application number
      const appNumber = `DL${new Date().getFullYear()}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

      // 4. Create application in database
      const { data: appData, error: appError } = await supabase
        .from('license_applications')
        .insert([{
          application_number: appNumber,
          user_id: user.id,
          license_type: licenseType,
          license_category: licenseCategory,
          nid_number: nidNumber,
          full_name_en: nidData.full_name_en,
          full_name_bn: nidData.full_name_bn,
          father_name: nidData.father_name,
          mother_name: nidData.mother_name,
          date_of_birth: nidData.date_of_birth,
          gender: nidData.gender,
          blood_group: nidData.blood_group,
          division: nidData.division,
          district: nidData.district,
          upazila: nidData.upazila,
          address: nidData.address,
          nid_face_extracted_url: faceUrlData.publicUrl,
          user_photo_url: photoUrlData.publicUrl,
          status: 'nid_verified',
          nid_verified_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (appError) throw appError;

      // 5. Create notifications (user + admin with different messages)
      console.log('Creating notification for application:', appData.id);
      const { data: notifData, error: notifError } = await supabase.rpc('create_dual_notification', {
        p_user_id: user.id,
        p_title_en: 'Application Submitted',
        p_title_bn: 'আবেদন জমা দেওয়া হয়েছে',
        p_message_en: `Your driving license application (${appNumber}) has been submitted successfully. Next step: Face Verification.`,
        p_message_bn: `আপনার ড্রাইভিং লাইসেন্স আবেদন (${appNumber}) সফলভাবে জমা দেওয়া হয়েছে। পরবর্তী ধাপ: মুখ যাচাইকরণ।`,
        p_type: 'application',
        p_application_id: appData.id,
        p_admin_title_en: 'New Application',
        p_admin_title_bn: 'নতুন আবেদন',
        p_admin_message_en: `${licenseType}-${licenseCategory}: ${nidData.full_name_en} (${appNumber})`,
        p_admin_message_bn: `${licenseType}-${licenseCategory}: ${nidData.full_name_bn} (${appNumber})`,
      });
      
      if (notifError) {
        console.error('❌ Notification creation error:', notifError);
      } else {
        console.log('✅ Notification created successfully:', notifData);
      }

      toast.success(isEnglish ? `Application submitted! Number: ${appNumber}` : `আবেদন জমা দেওয়া হয়েছে! নম্বর: ${appNumber}`);
      
      setTimeout(() => {
        onClose();
        // Call success callback to refresh applications list
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (error) {
      console.error('Submission Error:', error);
      toast.error(isEnglish ? 'Failed to submit application' : 'আবেদন জমা দিতে ব্যর্থ');
    } finally {
      setProcessing(false);
    }
  };

  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {isEnglish ? 'Select License Type' : 'লাইসেন্সের ধরন নির্বাচন করুন'}
            </h3>
            
            {/* License Type Selection */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { type: 'Light', label: isEnglish ? 'Light (Bike)' : 'লাইট (বাইক)', animation: vehicleAnimations.car },
                { type: 'Motor', label: isEnglish ? 'Motor (Car)' : 'মোটর (গাড়ি)', animation: vehicleAnimations.motorcycle },
                { type: 'Light+Motor', label: isEnglish ? 'Light + Motor' : 'লাইট + মোটর', animation: null },
              ].map((item) => (
                <motion.button
                  key={item.type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLicenseType(item.type)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    licenseType === item.type
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  {item.animation ? (
                    <div className="w-20 h-20 mx-auto mb-2">
                      <DotLottieReact src={item.animation} autoplay loop style={{ width: '100%', height: '100%' }} />
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-center mb-2 h-20 items-center">
                      <div className="w-10 h-10">
                        <DotLottieReact src={vehicleAnimations.car} autoplay loop style={{ width: '100%', height: '100%' }} />
                      </div>
                      <div className="w-10 h-10">
                        <DotLottieReact src={vehicleAnimations.motorcycle} autoplay loop style={{ width: '100%', height: '100%' }} />
                      </div>
                    </div>
                  )}
                  <div className="font-semibold text-gray-900 dark:text-white">{item.label}</div>
                </motion.button>
              ))}
            </div>

            {/* Category Selection */}
            {licenseType && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                  {isEnglish ? 'Select Category' : 'শ্রেণী নির্বাচন করুন'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { category: 'Professional', label: isEnglish ? 'Professional' : 'পেশাদার', animation: licenseAnimations.professional },
                    { category: 'Non-Professional', label: isEnglish ? 'Non-Professional' : 'অপেশাদার', animation: licenseAnimations.nonProfessional },
                  ].map((item) => (
                    <motion.button
                      key={item.category}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTypeSelection(licenseType, item.category)}
                      className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                    >
                      <div className="w-16 h-16 mx-auto mb-2">
                        <DotLottieReact src={item.animation} autoplay loop style={{ width: '100%', height: '100%' }} />
                      </div>
                      <div className="font-semibold">{item.label}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {isEnglish ? 'Upload NID Card' : 'এনআইডি কার্ড আপলোড করুন'}
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleNIDUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="mx-auto flex flex-col items-center gap-3 p-6 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Upload size={48} className="text-blue-600" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {isEnglish ? 'Click to upload NID front image' : 'এনআইডি সামনের ছবি আপলোড করতে ক্লিক করুন'}
                </span>
              </button>
            </div>

            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isEnglish ? 'Processing...' : 'প্রক্রিয়া করা হচ্ছে...'}
                  </span>
                  <span className="font-semibold">{ocrProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {isEnglish ? 'Verify NID Number' : 'এনআইডি নম্বর যাচাই করুন'}
            </h3>

            {nidImage && (
              <img src={nidImage} alt="NID" className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700" />
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {isEnglish ? 'NID Number' : 'এনআইডি নম্বর'}
              </label>
              <input
                type="text"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value.replace(/\D/g, ''))}
                placeholder={isEnglish ? 'Enter 10-13 digit NID number' : '১০-১৩ সংখ্যার এনআইডি নম্বর লিখুন'}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleVerifyNID}
              disabled={processing || !nidNumber}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <CircleNotch className="animate-spin" size={20} />
                  {isEnglish ? 'Verifying...' : 'যাচাই করা হচ্ছে...'}
                </span>
              ) : (
                isEnglish ? 'Verify & Continue' : 'যাচাই করুন এবং চালিয়ে যান'
              )}
            </button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {isEnglish ? 'Crop Your Face from NID' : 'এনআইডি থেকে আপনার মুখ ক্রপ করুন'}
            </h3>

            <div className="relative">
              {nidImage && (
                <div 
                  className="relative inline-block"
                  onMouseMove={(e) => {
                    if (isDragging) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left - cropArea.width / 2;
                      const y = e.clientY - rect.top - cropArea.height / 2;
                      setCropArea({
                        ...cropArea,
                        x: Math.max(0, Math.min(x, rect.width - cropArea.width)),
                        y: Math.max(0, Math.min(y, rect.height - cropArea.height)),
                      });
                    }
                  }}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                >
                  <img src={nidImage} alt="NID" className="max-w-full rounded-lg select-none" draggable={false} />
                  <div
                    className="absolute border-4 border-green-500 cursor-move"
                    style={{
                      left: `${cropArea.x}px`,
                      top: `${cropArea.y}px`,
                      width: `${cropArea.width}px`,
                      height: `${cropArea.height}px`,
                    }}
                    onMouseDown={() => setIsDragging(true)}
                  >
                    <div className="absolute top-0 left-0 w-full h-full bg-green-500/20" />
                    <div className="absolute -top-8 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded">
                      {isEnglish ? 'Drag to move' : 'টেনে সরান'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {isEnglish 
                ? 'Position the green box over your face photo on the NID card'
                : 'এনআইডি কার্ডের আপনার মুখের ছবির উপর সবুজ বক্স রাখুন'
              }
            </p>

            <canvas ref={canvasRef} className="hidden" />

            <button
              onClick={handleCropFace}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all"
            >
              {isEnglish ? 'Confirm Face Crop' : 'মুখ ক্রপ নিশ্চিত করুন'}
            </button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {isEnglish ? 'Review & Submit' : 'পর্যালোচনা এবং জমা দিন'}
            </h3>

            {/* Application Summary */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 space-y-4 border-2 border-primary/30 dark:border-primary/50">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {isEnglish ? '📋 Application Details' : '📋 আবেদনের বিবরণ'}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Full Name:' : 'পূর্ণ নাম:'}</span>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">
                    {isEnglish ? nidData?.full_name_en : nidData?.full_name_bn}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'License Type:' : 'লাইসেন্সের ধরন:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{licenseType}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'License Category:' : 'লাইসেন্স শ্রেণী:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{licenseCategory}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Father\'s Name:' : 'পিতার নাম:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{nidData?.father_name}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Mother\'s Name:' : 'মাতার নাম:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{nidData?.mother_name}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'NID Number:' : 'এনআইডি নম্বর:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white font-mono">{nidNumber}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Date of Birth:' : 'জন্ম তারিখ:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{nidData?.date_of_birth}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Blood Group:' : 'রক্তের গ্রুপ:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{nidData?.blood_group}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Gender:' : 'লিঙ্গ:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{nidData?.gender}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Address:' : 'ঠিকানা:'}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {nidData?.upazila}, {nidData?.district}, {nidData?.division}
                  </p>
                </div>
              </div>
            </div>

            {/* Upload User Photo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {isEnglish ? 'Upload Your Photo (for License Card)' : 'আপনার ছবি আপলোড করুন (লাইসেন্স কার্ডের জন্য)'}
              </label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handleUserPhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary transition-all"
              >
                {userPhoto ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle size={24} />
                    <span>{userPhoto.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                    <Camera size={24} />
                    <span>{isEnglish ? 'Click to upload photo' : 'ছবি আপলোড করতে ক্লিক করুন'}</span>
                  </div>
                )}
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={processing || !userPhoto}
              className="w-full py-3 bg-gradient-to-r from-primary to-green-600 hover:from-primary-dark hover:to-green-700 text-white font-semibold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <CircleNotch className="animate-spin" size={20} />
                  {isEnglish ? 'Submitting...' : 'জমা দেওয়া হচ্ছে...'}
                </span>
              ) : (
                isEnglish ? 'Submit Application' : 'আবেদন জমা দিন'
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center z-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEnglish ? 'New License Application' : 'নতুন লাইসেন্স আবেদন'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      step >= s
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 5 && (
                    <div
                      className={`w-12 h-1 ${
                        step > s ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {renderStep()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
