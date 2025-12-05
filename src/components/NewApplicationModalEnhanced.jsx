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
  
  // Camera states
  const [scanMode, setScanMode] = useState('file'); // 'file' or 'camera'
  const [cameraActive, setCameraActive] = useState(false);
  const [detectionScore, setDetectionScore] = useState(0);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      stopCamera();
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
        setScanMode('file');
        setCameraActive(false);
        setDetectionScore(0);
      }, 300);
    }
  }, [open]);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        
        // Start quality scoring
        videoRef.current.onloadedmetadata = () => {
          startQualityCheck();
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error(isEnglish 
        ? 'Cannot access camera. Please grant permission or use file upload.' 
        : 'ক্যামেরা অ্যাক্সেস করা যাচ্ছে না। অনুমতি দিন বা ফাইল আপলোড ব্যবহার করুন।');
      setScanMode('file');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setDetectionScore(0);
  };

  // Start quality check (no auto-capture)
  const startQualityCheck = () => {
    if (detectionIntervalRef.current) return;
    
    console.log('Starting quality check...');
    detectionIntervalRef.current = setInterval(() => {
      checkImageQuality();
    }, 300); // Check every 300ms
  };

  // Check image quality (for visual feedback only)
  const checkImageQuality = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scale = 0.3;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get card area
    const cardX = Math.floor(canvas.width * 0.1);
    const cardY = Math.floor(canvas.height * 0.15);
    const cardWidth = Math.floor(canvas.width * 0.8);
    const cardHeight = Math.floor(canvas.height * 0.7);
    
    const imageData = ctx.getImageData(cardX, cardY, cardWidth, cardHeight);
    const data = imageData.data;
    
    // Calculate quality metrics
    let totalBrightness = 0;
    let whitePixels = 0;
    let edges = 0;
    let highContrastPixels = 0;
    let pixelCount = 0;
    
    const stride = 8;
    
    for (let y = 0; y < cardHeight; y += stride) {
      for (let x = 0; x < cardWidth; x += stride) {
        const idx = (y * cardWidth + x) * 4;
        if (idx >= data.length - 3) continue;
        
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        totalBrightness += brightness;
        pixelCount++;
        
        if (brightness > 180 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
          whitePixels++;
        }
        
        const rightIdx = idx + (stride * 4);
        if (rightIdx < data.length && x + stride < cardWidth) {
          const rightR = data[rightIdx];
          const rightG = data[rightIdx + 1];
          const rightB = data[rightIdx + 2];
          const rightBrightness = (rightR + rightG + rightB) / 3;
          const diff = Math.abs(brightness - rightBrightness);
          
          if (diff > 25) edges++;
          if (diff > 80) highContrastPixels++;
        }
      }
    }
    
    const avgBrightness = totalBrightness / pixelCount;
    const whiteRatio = whitePixels / pixelCount;
    const edgeRatio = edges / pixelCount;
    const contrastRatio = highContrastPixels / pixelCount;
    
    // Quality score (0-100)
    let score = 0;
    
    // Brightness (0-30)
    if (avgBrightness >= 120 && avgBrightness <= 200) score += 30;
    else if (avgBrightness >= 100 && avgBrightness <= 220) score += 20;
    else if (avgBrightness >= 80) score += 10;
    
    // White background (0-30)
    if (whiteRatio >= 0.25) score += 30;
    else if (whiteRatio >= 0.15) score += 20;
    else if (whiteRatio >= 0.10) score += 10;
    
    // Edges/sharpness (0-25)
    if (edgeRatio >= 0.10 && edgeRatio <= 0.30) score += 25;
    else if (edgeRatio >= 0.08 && edgeRatio <= 0.35) score += 15;
    
    // Contrast (0-15)
    if (contrastRatio >= 0.05 && contrastRatio <= 0.15) score += 15;
    else if (contrastRatio >= 0.03) score += 8;
    
    score = Math.max(0, Math.min(100, score));
    setDetectionScore(score);
  };

  // Capture photo from camera (manual)
  const captureFromCamera = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      // Create a File object from blob
      const file = new File([blob], 'nid-capture.jpg', { type: 'image/jpeg' });
      
      // Stop camera
      stopCamera();
      
      // Process with OCR (same as file upload)
      await processNIDImage(file);
    }, 'image/jpeg', 0.95);
  };

  // Switch to camera mode
  useEffect(() => {
    if (scanMode === 'camera' && step === 2) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [scanMode, step]);

  // Keyboard shortcuts for camera capture
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if camera is active and on step 2
      if (scanMode === 'camera' && step === 2 && cameraActive && !processing) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          captureFromCamera();
        }
      }
    };

    if (open && scanMode === 'camera' && step === 2) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [open, scanMode, step, cameraActive, processing]);

  // Step 1: Select License Type & Category
  const handleTypeSelection = async (type, category) => {
    // Check both existing licenses AND pending/approved applications
    try {
      // Check existing generated licenses
      const { data: existingLicenses, error: licenseError } = await supabase
        .from('licenses')
        .select('license_type, license_category')
        .eq('user_id', user.id);

      // Check pending/approved applications
      const { data: existingApps, error: appError } = await supabase
        .from('license_applications')
        .select('license_type, license_category, status')
        .eq('user_id', user.id)
        .in('status', ['approved', 'pending']);

      if (licenseError || appError) throw licenseError || appError;

      // Combine data from both sources
      const allLicenses = [];
      if (existingLicenses) allLicenses.push(...existingLicenses.map(l => ({ type: l.license_type, category: l.license_category })));
      if (existingApps) allLicenses.push(...existingApps.map(a => ({ type: a.license_type, category: a.license_category })));

      if (allLicenses.length > 0) {
        const existingTypes = allLicenses.map(l => l.type);
        
        // If user has Light+Motor, they can't apply for anything (but can apply for different category)
        if (existingTypes.includes('Light+Motor')) {
          // Check if they're applying for same type but different category
          const existingLightMotor = allLicenses.find(l => l.type === 'Light+Motor');
          if (type === 'Light+Motor' && existingLightMotor.category !== category) {
            // Allow different category
          } else {
            toast.error(isEnglish 
              ? 'You already have Light+Motor license. No further applications allowed!' 
              : 'আপনার ইতিমধ্যে Light+Motor লাইসেন্স আছে। আর কোনো আবেদন করা যাবে না!');
            return;
          }
        }

        // If user has Light, they can only apply for Motor (or different category Light)
        if (existingTypes.includes('Light')) {
          const existingLight = allLicenses.find(l => l.type === 'Light');
          
          if (type === 'Light+Motor') {
            toast.error(isEnglish 
              ? 'You already have Light license. You can only apply for Motor, not Light+Motor!' 
              : 'আপনার ইতিমধ্যে Light লাইসেন্স আছে। আপনি শুধু Motor এর জন্য আবেদন করতে পারবেন, Light+Motor নয়!');
            return;
          }
          if (type === 'Light' && existingLight.category === category) {
            toast.error(isEnglish 
              ? 'You already have this Light license category!' 
              : 'আপনার ইতিমধ্যে এই Light লাইসেন্স ক্যাটাগরি আছে!');
            return;
          }
        }

        // If user has Motor, they can only apply for Light (or different category Motor)
        if (existingTypes.includes('Motor')) {
          const existingMotor = allLicenses.find(l => l.type === 'Motor');
          
          if (type === 'Light+Motor') {
            toast.error(isEnglish 
              ? 'You already have Motor license. You can only apply for Light, not Light+Motor!' 
              : 'আপনার ইতিমধ্যে Motor লাইসেন্স আছে। আপনি শুধু Light এর জন্য আবেদন করতে পারবেন, Light+Motor নয়!');
            return;
          }
          if (type === 'Motor' && existingMotor.category === category) {
            toast.error(isEnglish 
              ? 'You already have this Motor license category!' 
              : 'আপনার ইতিমধ্যে এই Motor লাইসেন্স ক্যাটাগরি আছে!');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing licenses:', error);
    }

    setLicenseType(type);
    setLicenseCategory(category);
    setStep(2);
  };

  // Step 2: Upload NID and Extract Number
  const handleNIDUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await processNIDImage(file);
  };

  // Process NID image (used by both file upload and camera capture)
  const processNIDImage = async (file) => {
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
        setStep(3); // Move to next step only if successful
      } else {
        // OCR failed to detect NID number
        toast.error(
          isEnglish 
            ? '❌ Could not detect NID number. Please upload a clearer FRONT side image.' 
            : '❌ এনআইডি নম্বর সনাক্ত করা যায়নি। দয়া করে সামনের পাতার আরও পরিষ্কার ছবি আপলোড করুন।',
          { duration: 5000, icon: '⚠️' }
        );
        // Keep image displayed but allow retry
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error(
        isEnglish 
          ? '❌ OCR Failed! Could not process NID image. Please upload a clearer FRONT side image.' 
          : '❌ OCR ব্যর্থ! এনআইডি ছবি প্রক্রিয়া করা যায়নি। সামনের পাতার আরও পরিষ্কার ছবি আপলোড করুন।',
        { duration: 5000, icon: '⚠️' }
      );
      // Keep on step 2 to allow retry
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

            {/* Warning Message */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <WarningCircle size={24} weight="fill" className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">
                    {isEnglish ? '⚠️ Important Instructions:' : '⚠️ গুরুত্বপূর্ণ নির্দেশনা:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{isEnglish ? 'Upload FRONT side of NID card only' : 'শুধুমাত্র এনআইডি কার্ডের সামনের পাতা আপলোড করুন'}</li>
                    <li>{isEnglish ? 'Ensure image is clear and well-lit' : 'নিশ্চিত করুন ছবি স্পষ্ট এবং ভালো আলোতে তোলা'}</li>
                    <li>{isEnglish ? 'All text must be readable' : 'সকল লেখা পাঠযোগ্য হতে হবে'}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Mode Selector: Camera or File Upload */}
            {!nidImage && !processing && (
              <div className="flex gap-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <button
                  onClick={() => setScanMode('file')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    scanMode === 'file'
                      ? 'bg-white dark:bg-gray-700 text-primary shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Upload size={20} />
                  {isEnglish ? 'Upload File' : 'ফাইল আপলোড'}
                </button>
                <button
                  onClick={() => setScanMode('camera')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    scanMode === 'camera'
                      ? 'bg-white dark:bg-gray-700 text-primary shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Camera size={20} />
                  {isEnglish ? 'Use Camera' : 'ক্যামেরা ব্যবহার করুন'}
                </button>
              </div>
            )}
            
            {/* File Upload Mode */}
            {scanMode === 'file' && (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNIDUpload}
                  className="hidden"
                />
                
                {nidImage && !processing ? (
                  <div className="space-y-4">
                    <img src={nidImage} alt="NID Preview" className="max-w-full max-h-64 mx-auto rounded-lg border-2 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => {
                        setNidImage(null);
                        setNidNumber('');
                        fileInputRef.current?.click();
                      }}
                      className="mx-auto flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all"
                    >
                      <Upload size={20} />
                      {isEnglish ? 'Upload Again (Clearer Image)' : 'আবার আপলোড করুন (পরিষ্কার ছবি)'}
                    </button>
                  </div>
                ) : (
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
                )}
              </div>
            )}

            {/* Camera Mode */}
            {scanMode === 'camera' && !nidImage && !processing && (
              <div className="space-y-3">
                {/* Helpful tip */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 {isEnglish 
                      ? 'Place NID card on a dark surface for best detection. Ensure good lighting and avoid shadows.'
                      : 'সেরা সনাক্তকরণের জন্য এনআইডি কার্ডটি একটি গাঢ় পৃষ্ঠে রাখুন। ভাল আলো নিশ্চিত করুন এবং ছায়া এড়িয়ে চলুন।'}
                  </p>
                </div>

                <div className="relative bg-black rounded-xl overflow-hidden" style={{ height: '400px' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* NID Card Overlay Guide */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    {/* Card outline */}
                    <rect
                      x="10%"
                      y="15%"
                      width="80%"
                      height="70%"
                      fill="none"
                      stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'}
                      strokeWidth="4"
                      strokeDasharray="10,5"
                      rx="10"
                    />
                    {/* Corner markers */}
                    <line x1="10%" y1="15%" x2="15%" y2="15%" stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'} strokeWidth="6" strokeLinecap="round"/>
                    <line x1="10%" y1="15%" x2="10%" y2="20%" stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'} strokeWidth="6" strokeLinecap="round"/>
                    <line x1="90%" y1="15%" x2="85%" y2="15%" stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'} strokeWidth="6" strokeLinecap="round"/>
                    <line x1="90%" y1="15%" x2="90%" y2="20%" stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'} strokeWidth="6" strokeLinecap="round"/>
                    <line x1="10%" y1="85%" x2="15%" y2="85%" stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'} strokeWidth="6" strokeLinecap="round"/>
                    <line x1="10%" y1="85%" x2="10%" y2="80%" stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'} strokeWidth="6" strokeLinecap="round"/>
                    <line x1="90%" y1="85%" x2="85%" y2="85%" stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'} strokeWidth="6" strokeLinecap="round"/>
                    <line x1="90%" y1="85%" x2="90%" y2="80%" stroke={detectionScore > 70 ? '#22c55e' : detectionScore > 40 ? '#eab308' : '#3b82f6'} strokeWidth="6" strokeLinecap="round"/>
                  </svg>

                {/* Status Text */}
                <div className="absolute top-4 left-0 right-0 text-center">
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-lg shadow-lg bg-blue-500 text-white">
                    <Camera size={24} weight="fill" />
                    {isEnglish ? 'Align NID card in frame' : 'ফ্রেমে এনআইডি কার্ড সারিবদ্ধ করুন'}
                  </div>
                  
                  {/* Quality score bar */}
                  {cameraActive && (
                    <div className="mt-2 mx-auto max-w-xs">
                      <div className="bg-gray-800/70 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            detectionScore > 70 ? 'bg-green-500' :
                            detectionScore > 40 ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${detectionScore}%` }}
                        />
                      </div>
                      <p className="text-white text-xs mt-1 font-semibold">
                        {isEnglish ? 'Image Quality: ' : 'ছবির মান: '}{detectionScore}%
                      </p>
                    </div>
                  )}
                </div>

                  {/* Capture Button with Keyboard Hint */}
                  {cameraActive && (
                    <div className="absolute bottom-4 left-0 right-0 text-center space-y-2">
                      <button
                        onClick={captureFromCamera}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-bold rounded-full shadow-lg hover:bg-gray-100 transition-all"
                      >
                        <Camera size={24} weight="fill" />
                        {isEnglish ? 'Capture Photo' : 'ছবি তুলুন'}
                      </button>
                      <p className="text-white text-xs font-semibold bg-black/50 inline-block px-3 py-1 rounded-full">
                        {isEnglish ? 'Press Space or Enter to capture' : 'ক্যাপচার করতে Space বা Enter চাপুন'}
                      </p>
                    </div>
                  )}

                  {/* Loading indicator if camera not ready */}
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <div className="text-white text-center">
                        <CircleNotch className="animate-spin mx-auto mb-2" size={48} />
                        <p className="font-semibold">{isEnglish ? 'Starting camera...' : 'ক্যামেরা চালু হচ্ছে...'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show captured image from camera */}
            {scanMode === 'camera' && nidImage && !processing && (
              <div className="space-y-4">
                <img src={nidImage} alt="NID Preview" className="max-w-full max-h-64 mx-auto rounded-lg border-2 border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    setNidImage(null);
                    setNidNumber('');
                    setScanMode('camera');
                  }}
                  className="mx-auto flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all"
                >
                  <Camera size={20} />
                  {isEnglish ? 'Capture Again' : 'আবার ক্যাপচার করুন'}
                </button>
              </div>
            )}

            {/* Processing Progress */}
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
                {isEnglish ? 'NID Number (Auto-detected)' : 'এনআইডি নম্বর (স্বয়ংক্রিয়ভাবে সনাক্ত)'}
              </label>
              <input
                type="text"
                value={nidNumber}
                readOnly
                disabled
                placeholder={isEnglish ? 'NID number will be auto-detected from image' : 'এনআইডি নম্বর ছবি থেকে স্বয়ংক্রিয়ভাবে সনাক্ত হবে'}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed opacity-75"
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
