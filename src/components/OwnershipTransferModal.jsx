import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MagnifyingGlass, 
  Car, 
  IdentificationCard, 
  CheckCircle, 
  XCircle, 
  Warning,
  Upload,
  ArrowRight,
  CreditCard
} from 'phosphor-react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export default function OwnershipTransferModal({ isOpen, onClose, user, onSuccess }) {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  const [step, setStep] = useState(1); // 1: Select Vehicle, 2: Search New Owner, 3: Select Photo, 4: Upload Deed, 5: Review & Submit
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [eligibilityCheck, setEligibilityCheck] = useState(null);
  const [newOwnerDL, setNewOwnerDL] = useState('');
  const [searchingDL, setSearchingDL] = useState(false);
  const [newOwnerData, setNewOwnerData] = useState(null);
  const [photoOption, setPhotoOption] = useState(''); // 'license' or 'upload'
  const [customPhotoFile, setCustomPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [deedFile, setDeedFile] = useState(null);
  const [uploadingDeed, setUploadingDeed] = useState(false);
  const [deedUrl, setDeedUrl] = useState('');

  const t = {
    en: {
      title: 'Vehicle Ownership Transfer',
      selectVehicle: 'Select Your Vehicle',
      searchNewOwner: 'Search New Owner',
      selectPhoto: 'Select New Owner Photo',
      uploadDeed: 'Upload Deed Document',
      reviewSubmit: 'Review & Submit',
      dlNumber: 'Driving License Number',
      dlPlaceholder: 'Enter DL number (e.g., DL25XXXXXXX)',
      search: 'Search',
      searching: 'Searching...',
      newOwnerInfo: 'New Owner Information',
      name: 'Name',
      nid: 'NID',
      licenseType: 'License Type',
      licenseCategory: 'Category',
      eligibilityCheck: 'Eligibility Check',
      smartCard: 'Smart Card Status',
      taxToken: 'Tax Token Status',
      unpaidFines: 'Unpaid Fines',
      impoundmentStatus: 'Impoundment Status',
      licenseMatch: 'License Type Match',
      valid: 'Valid',
      invalid: 'Invalid',
      expired: 'Expired',
      none: 'None',
      hasFines: 'Has Unpaid Fines',
      isImpounded: 'Vehicle Impounded',
      compatible: 'Compatible',
      incompatible: 'Incompatible',
      photoOption: 'Choose Photo Option',
      useDLPhoto: 'Use License Photo',
      uploadNewPhoto: 'Upload New Photo',
      selectPhotoFile: 'Select Photo (JPG/PNG)',
      photoUploading: 'Uploading photo...',
      deedDocument: 'Deed Document (দলিল)',
      selectFile: 'Select PDF or Image',
      uploading: 'Uploading...',
      transferFee: 'Transfer Fee',
      vehicleDetails: 'Vehicle Details',
      regNumber: 'Registration Number',
      vehicleType: 'Type',
      model: 'Model',
      currentOwner: 'Current Owner',
      newOwner: 'New Owner',
      submit: 'Submit Application',
      submitting: 'Submitting...',
      cancel: 'Cancel',
      next: 'Next',
      previous: 'Previous',
      noVehicles: 'No registered vehicles found',
      selectVehicleFirst: 'Please select a vehicle',
      dlNotFound: 'No active license found with this DL number',
      uploadDeedFirst: 'Please upload the deed document',
      incompatibleLicense: 'New owner license type is not compatible with vehicle type',
      notEligible: 'Vehicle is not eligible for transfer. Please resolve the issues.',
      applicationSubmitted: 'Transfer application submitted successfully!',
      waitingApproval: 'Waiting for admin approval',
      errorSubmitting: 'Error submitting application',
      errorFetchingVehicles: 'Error loading vehicles',
      errorSearching: 'Error searching license',
      errorUploading: 'Error uploading deed',
      bike: 'Bike',
      car: 'Car'
    },
    bn: {
      title: 'গাড়ি মালিকানা হস্তান্তর',
      selectVehicle: 'আপনার গাড়ি নির্বাচন করুন',
      searchNewOwner: 'নতুন মালিক খুঁজুন',
      selectPhoto: 'নতুন মালিকের ছবি নির্বাচন করুন',
      uploadDeed: 'দলিল আপলোড করুন',
      reviewSubmit: 'পর্যালোচনা ও জমা দিন',
      dlNumber: 'ড্রাইভিং লাইসেন্স নম্বর',
      dlPlaceholder: 'DL নম্বর লিখুন (যেমন, DL25XXXXXXX)',
      search: 'খুঁজুন',
      searching: 'খুঁজছি...',
      newOwnerInfo: 'নতুন মালিকের তথ্য',
      name: 'নাম',
      nid: 'এনআইডি',
      licenseType: 'লাইসেন্স টাইপ',
      licenseCategory: 'ক্যাটাগরি',
      eligibilityCheck: 'যোগ্যতা যাচাই',
      smartCard: 'স্মার্ট কার্ড স্ট্যাটাস',
      taxToken: 'ট্যাক্স টোকেন স্ট্যাটাস',
      unpaidFines: 'অপরিশোধিত জরিমানা',
      impoundmentStatus: 'আটকের অবস্থা',
      licenseMatch: 'লাইসেন্স টাইপ মিল',
      valid: 'বৈধ',
      invalid: 'অবৈধ',
      expired: 'মেয়াদোত্তীর্ণ',
      none: 'নেই',
      hasFines: 'অপরিশোধিত জরিমানা আছে',
      isImpounded: 'গাড়ি আটক আছে',
      compatible: 'উপযুক্ত',
      incompatible: 'অনুপযুক্ত',
      photoOption: 'ছবির অপশন নির্বাচন করুন',
      useDLPhoto: 'লাইসেন্সের ছবি ব্যবহার করুন',
      uploadNewPhoto: 'নতুন ছবি আপলোড করুন',
      selectPhotoFile: 'ছবি নির্বাচন করুন (JPG/PNG)',
      photoUploading: 'ছবি আপলোড হচ্ছে...',
      deedDocument: 'দলিল ডকুমেন্ট',
      selectFile: 'PDF বা ছবি নির্বাচন করুন',
      uploading: 'আপলোড হচ্ছে...',
      transferFee: 'হস্তান্তর ফি',
      vehicleDetails: 'গাড়ির বিবরণ',
      regNumber: 'রেজিস্ট্রেশন নম্বর',
      vehicleType: 'টাইপ',
      model: 'মডেল',
      currentOwner: 'বর্তমান মালিক',
      newOwner: 'নতুন মালিক',
      submit: 'আবেদন জমা দিন',
      submitting: 'জমা হচ্ছে...',
      cancel: 'বাতিল',
      next: 'পরবর্তী',
      previous: 'পূর্ববর্তী',
      noVehicles: 'কোন রেজিস্টার্ড গাড়ি পাওয়া যায়নি',
      selectVehicleFirst: 'অনুগ্রহ করে একটি গাড়ি নির্বাচন করুন',
      dlNotFound: 'এই DL নম্বরে কোন সক্রিয় লাইসেন্স পাওয়া যায়নি',
      uploadDeedFirst: 'অনুগ্রহ করে দলিল আপলোড করুন',
      incompatibleLicense: 'নতুন মালিকের লাইসেন্স গাড়ির টাইপের সাথে সামঞ্জস্যপূর্ণ নয়',
      notEligible: 'গাড়িটি হস্তান্তরের জন্য যোগ্য নয়। সমস্যা সমাধান করুন।',
      applicationSubmitted: 'হস্তান্তর আবেদন সফলভাবে জমা হয়েছে!',
      waitingApproval: 'অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করছে',
      errorSubmitting: 'আবেদন জমা দিতে ত্রুটি',
      errorFetchingVehicles: 'গাড়ি লোড করতে ত্রুটি',
      errorSearching: 'লাইসেন্স খুঁজতে ত্রুটি',
      errorUploading: 'দলিল আপলোড করতে ত্রুটি',
      bike: 'বাইক',
      car: 'গাড়ি'
    }
  };

  const text = t[language];

  useEffect(() => {
    if (isOpen && user) {
      fetchUserVehicles();
    }
  }, [isOpen, user]);

  const fetchUserVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('registered_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error(text.errorFetchingVehicles);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async (vehicleId) => {
    try {
      const { data, error } = await supabase
        .rpc('check_vehicle_transfer_eligibility', { p_vehicle_id: vehicleId });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setEligibilityCheck(data[0]);
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return null;
    }
  };

  const handleVehicleSelect = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setEligibilityCheck(null);
    
    // Check eligibility
    const eligibility = await checkEligibility(vehicle.id);
    
    if (eligibility && eligibility.is_eligible) {
      setStep(2);
    }
  };

  const searchNewOwner = async () => {
    if (!newOwnerDL.trim()) {
      toast.error(isEnglish ? 'Please enter DL number' : 'DL নম্বর লিখুন');
      return;
    }

    try {
      setSearchingDL(true);
      setNewOwnerData(null);

      const { data, error } = await supabase
        .rpc('search_user_by_dl_number', { p_dl_number: newOwnerDL.trim() });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error(text.dlNotFound);
        return;
      }

      const owner = data[0];

      // CHECK: Prevent transferring to yourself!
      if (owner.user_id === user.id) {
        toast.error(isEnglish 
          ? '❌ You cannot transfer vehicle to yourself!' 
          : '❌ আপনি নিজের কাছে গাড়ি হস্তান্তর করতে পারবেন না!');
        setNewOwnerDL('');
        return;
      }

      setNewOwnerData(owner);

      // Validate license type compatibility
      const { data: isValid } = await supabase
        .rpc('validate_license_for_vehicle_type', {
          p_license_type: owner.license_type,
          p_vehicle_type: selectedVehicle.vehicle_type
        });

      if (!isValid) {
        toast.error(text.incompatibleLicense);
      } else {
        toast.success(isEnglish ? 'New owner found!' : 'নতুন মালিক পাওয়া গেছে!');
      }

    } catch (error) {
      console.error('Error searching DL:', error);
      toast.error(text.errorSearching);
    } finally {
      setSearchingDL(false);
    }
  };

  // Handle custom photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error(isEnglish ? 'Please upload JPG or PNG image' : 'অনুগ্রহ করে JPG বা PNG ছবি আপলোড করুন');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(isEnglish ? 'Photo size must be less than 2MB' : 'ছবির আকার ২MB এর কম হতে হবে');
      return;
    }

    try {
      setUploadingPhoto(true);
      setCustomPhotoFile(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `new-owner-photos/${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('vehicle-documents')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-documents')
        .getPublicUrl(fileName);

      setCustomPhotoUrl(publicUrl);
      toast.success(isEnglish ? 'Photo uploaded successfully' : 'ছবি সফলভাবে আপলোড হয়েছে');

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(isEnglish ? 'Failed to upload photo' : 'ছবি আপলোড করতে ব্যর্থ');
      setCustomPhotoFile(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeedUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error(isEnglish ? 'Please upload PDF or image file' : 'অনুগ্রহ করে PDF বা ছবি আপলোড করুন');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isEnglish ? 'File size must be less than 5MB' : 'ফাইলের আকার ৫MB এর কম হতে হবে');
      return;
    }

    try {
      setUploadingDeed(true);
      setDeedFile(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `ownership-transfer-deeds/${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('vehicle-documents')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-documents')
        .getPublicUrl(fileName);

      setDeedUrl(publicUrl);
      toast.success(isEnglish ? 'Deed uploaded successfully' : 'দলিল সফলভাবে আপলোড হয়েছে');

    } catch (error) {
      console.error('Error uploading deed:', error);
      toast.error(text.errorUploading);
      setDeedFile(null);
    } finally {
      setUploadingDeed(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicle || !newOwnerData || !deedUrl) {
      toast.error(isEnglish ? 'Please complete all steps' : 'সকল ধাপ সম্পন্ন করুন');
      return;
    }

    // Determine which photo to use
    const finalPhotoUrl = photoOption === 'upload' ? customPhotoUrl : newOwnerData.photo_url;

    try {
      setLoading(true);

      // Generate application number
      const { data: appNumber } = await supabase
        .rpc('generate_ownership_transfer_application_number');

      // Create application
      const { data: application, error: appError } = await supabase
        .from('ownership_transfer_applications')
        .insert({
          application_number: appNumber,
          current_owner_user_id: user.id,
          new_owner_user_id: newOwnerData.user_id,
          new_owner_dl_number: newOwnerData.license_number,
          new_owner_name_en: newOwnerData.full_name_en,
          new_owner_name_bn: newOwnerData.full_name_bn,
          new_owner_photo_url: finalPhotoUrl,
          registered_vehicle_id: selectedVehicle.id,
          vehicle_registration_number: selectedVehicle.registration_number,
          vehicle_name: selectedVehicle.vehicle_name,
          vehicle_type: selectedVehicle.vehicle_type,
          deed_document_url: deedUrl,
          smart_card_valid: eligibilityCheck?.smart_card_valid,
          tax_token_valid: eligibilityCheck?.tax_token_valid,
          has_unpaid_fines: eligibilityCheck?.has_unpaid_fines,
          has_impoundment: eligibilityCheck?.has_impoundment,
          license_type_valid: true,
          status: 'pending'
        })
        .select()
        .single();

      if (appError) throw appError;

      // Send notifications to all 3 parties
      await supabase.from('notifications').insert([
        // 1. Current Owner (Applicant)
        {
          user_id: user.id,
          recipient_type: 'user',
          title_en: 'Ownership Transfer Application Submitted',
          title_bn: 'মালিকানা হস্তান্তর আবেদন জমা হয়েছে',
          message_en: `Your ownership transfer application ${appNumber} for ${selectedVehicle.vehicle_name} has been submitted. Waiting for admin approval.`,
          message_bn: `আপনার ${selectedVehicle.vehicle_name} গাড়ির মালিকানা হস্তান্তর আবেদন ${appNumber} জমা হয়েছে। অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করছে।`,
          notification_type: 'application',
          priority: 'normal'
        },
        // 2. New Owner (will receive vehicle)
        {
          user_id: newOwnerData.user_id,
          recipient_type: 'user',
          title_en: 'Vehicle Transfer Application Received',
          title_bn: 'গাড়ি হস্তান্তর আবেদন প্রাপ্ত',
          message_en: `${user.full_name || 'A user'} has initiated ownership transfer of ${selectedVehicle.vehicle_name} (${selectedVehicle.registration_number}) to you. Application: ${appNumber}`,
          message_bn: `${user.full_name || 'একজন ব্যবহারকারী'} আপনার কাছে ${selectedVehicle.vehicle_name} (${selectedVehicle.registration_number}) গাড়ির মালিকানা হস্তান্তর শুরু করেছেন। আবেদন: ${appNumber}`,
          notification_type: 'application',
          priority: 'high'
        },
        // 3. Admin
        {
          user_id: null,
          recipient_type: 'admin',
          title_en: 'New Ownership Transfer Request',
          title_bn: 'নতুন মালিকানা হস্তান্তর অনুরোধ',
          message_en: `New ownership transfer application ${appNumber} for vehicle ${selectedVehicle.registration_number}. From: ${user.full_name || 'User'} → To: ${newOwnerData.full_name_en}`,
          message_bn: `গাড়ি ${selectedVehicle.registration_number} এর জন্য নতুন মালিকানা হস্তান্তর আবেদন ${appNumber}। থেকে: ${user.full_name || 'ব্যবহারকারী'} → প্রতি: ${newOwnerData.full_name_bn}`,
          notification_type: 'application',
          priority: 'high'
        }
      ]);

      toast.success(text.applicationSubmitted);
      
      if (onSuccess) onSuccess();
      handleClose();

    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(text.errorSubmitting);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedVehicle(null);
    setEligibilityCheck(null);
    setNewOwnerDL('');
    setNewOwnerData(null);
    setPhotoOption('');
    setCustomPhotoFile(null);
    setCustomPhotoUrl('');
    setDeedFile(null);
    setDeedUrl('');
    onClose();
  };

  const canProceedToStep2 = selectedVehicle && eligibilityCheck?.is_eligible;
  const canProceedToStep3 = canProceedToStep2 && newOwnerData;
  const canProceedToStep4 = canProceedToStep3 && photoOption && (photoOption === 'license' || (photoOption === 'upload' && customPhotoUrl));
  const canProceedToStep5 = canProceedToStep4 && deedUrl;
  const canSubmit = canProceedToStep5;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gradient-to-r from-primary to-primary-dark dark:from-green-700 dark:to-green-900 text-white">
            <h2 className="text-2xl font-bold">{text.title}</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} weight="bold" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-900">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                    step >= s
                      ? 'bg-primary text-white'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step 1: Select Vehicle */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {text.selectVehicle}
                </h3>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {text.noVehicles}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {vehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        onClick={() => handleVehicleSelect(vehicle)}
                        className="p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Car size={40} className="text-primary" weight="duotone" />
                            <div>
                              <p className="font-bold text-lg text-gray-900 dark:text-white">
                                {vehicle.vehicle_name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {vehicle.registration_number}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isEnglish 
                                  ? `${vehicle.vehicle_type} • ${vehicle.model}` 
                                  : `${vehicle.vehicle_type === 'Bike' ? text.bike : text.car} • ${vehicle.model}`
                                }
                              </p>
                            </div>
                          </div>
                          <ArrowRight size={24} className="text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Eligibility Check Results */}
                {eligibilityCheck && selectedVehicle && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle size={20} />
                      {text.eligibilityCheck}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Smart Card */}
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{text.smartCard}</span>
                        <span className={`text-sm font-bold ${eligibilityCheck.smart_card_valid ? 'text-green-600' : 'text-red-600'}`}>
                          {eligibilityCheck.smart_card_valid ? text.valid : text.expired}
                        </span>
                      </div>

                      {/* Tax Token */}
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{text.taxToken}</span>
                        <span className={`text-sm font-bold ${eligibilityCheck.tax_token_valid ? 'text-green-600' : 'text-red-600'}`}>
                          {eligibilityCheck.tax_token_valid ? text.valid : text.expired}
                        </span>
                      </div>

                      {/* Unpaid Fines */}
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{text.unpaidFines}</span>
                        <span className={`text-sm font-bold ${!eligibilityCheck.has_unpaid_fines ? 'text-green-600' : 'text-red-600'}`}>
                          {!eligibilityCheck.has_unpaid_fines ? text.none : text.hasFines}
                        </span>
                      </div>

                      {/* Impoundment Status */}
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{text.impoundmentStatus}</span>
                        <span className={`text-sm font-bold ${!eligibilityCheck.has_impoundment ? 'text-green-600' : 'text-orange-600'}`}>
                          {!eligibilityCheck.has_impoundment ? text.none : text.isImpounded}
                        </span>
                      </div>
                    </div>

                    {!eligibilityCheck.is_eligible && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                          <Warning size={18} weight="fill" />
                          {eligibilityCheck.error_message}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Search New Owner */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {text.searchNewOwner}
                </h3>

                {/* DL Search */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {text.dlNumber}
                    </label>
                    <input
                      type="text"
                      value={newOwnerDL}
                      onChange={(e) => setNewOwnerDL(e.target.value.toUpperCase())}
                      placeholder={text.dlPlaceholder}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      onKeyPress={(e) => e.key === 'Enter' && searchNewOwner()}
                    />
                  </div>
                  <button
                    onClick={searchNewOwner}
                    disabled={searchingDL}
                    className="mt-7 px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <MagnifyingGlass size={20} />
                    {searchingDL ? text.searching : text.search}
                  </button>
                </div>

                {/* New Owner Info */}
                {newOwnerData && (
                  <div className="mt-6 p-4 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-green-900/20 dark:to-green-800/10 rounded-lg border-2 border-primary/30">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <IdentificationCard size={24} className="text-primary" weight="duotone" />
                      {text.newOwnerInfo}
                    </h4>

                    <div className="flex items-start gap-4">
                      {newOwnerData.photo_url && (
                        <img
                          src={newOwnerData.photo_url}
                          alt={newOwnerData.full_name_en}
                          className="w-20 h-20 rounded-lg object-cover border-2 border-primary"
                        />
                      )}

                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{text.name}</p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {isEnglish ? newOwnerData.full_name_en : newOwnerData.full_name_bn}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{text.nid}</p>
                          <p className="font-bold text-gray-900 dark:text-white">{newOwnerData.nid_number}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{text.licenseType}</p>
                          <p className="font-bold text-gray-900 dark:text-white">{newOwnerData.license_type}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{text.licenseCategory}</p>
                          <p className="font-bold text-gray-900 dark:text-white">{newOwnerData.license_category}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Photo */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {text.selectPhoto}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {text.photoOption}
                </p>

                {/* Photo Options */}
                <div className="grid gap-4">
                  {/* Option 1: Use DL Photo */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setPhotoOption('license')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      photoOption === 'license'
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {newOwnerData?.photo_url && (
                        <img
                          src={newOwnerData.photo_url}
                          alt={newOwnerData.full_name_en}
                          className="w-20 h-20 rounded-lg object-cover border-2 border-primary"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <IdentificationCard size={24} className="text-primary" weight="duotone" />
                          <h4 className="font-bold text-gray-900 dark:text-white">{text.useDLPhoto}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {isEnglish 
                            ? 'Use the photo from driving license' 
                            : 'ড্রাইভিং লাইসেন্সের ছবি ব্যবহার করুন'}
                        </p>
                      </div>
                      {photoOption === 'license' && (
                        <CheckCircle size={24} className="text-primary" weight="fill" />
                      )}
                    </div>
                  </motion.div>

                  {/* Option 2: Upload New Photo */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setPhotoOption('upload')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      photoOption === 'upload'
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Upload size={24} className="text-primary" weight="duotone" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">{text.uploadNewPhoto}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {isEnglish 
                            ? 'Upload a different photo (JPG/PNG, Max 2MB)' 
                            : 'ভিন্ন ছবি আপলোড করুন (JPG/PNG, সর্বোচ্চ ২MB)'}
                        </p>
                      </div>
                      {photoOption === 'upload' && (
                        <CheckCircle size={24} className="text-primary" weight="fill" />
                      )}
                    </div>
                  </motion.div>

                  {/* Upload Section for Custom Photo */}
                  {photoOption === 'upload' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center"
                    >
                      {customPhotoUrl ? (
                        <div className="space-y-3">
                          <img
                            src={customPhotoUrl}
                            alt="Uploaded photo"
                            className="w-32 h-32 rounded-lg object-cover border-2 border-primary mx-auto"
                          />
                          <CheckCircle size={48} className="mx-auto text-green-600" weight="fill" />
                          <p className="text-green-600 font-bold">
                            {isEnglish ? 'Photo uploaded successfully!' : 'ছবি সফলভাবে আপলোড হয়েছে!'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                          <label className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg cursor-pointer transition-colors">
                            {uploadingPhoto ? text.photoUploading : text.selectPhotoFile}
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={handlePhotoUpload}
                              className="hidden"
                              disabled={uploadingPhoto}
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-2">
                            {isEnglish ? 'JPG or PNG (Max 2MB)' : 'JPG বা PNG (সর্বোচ্চ ২MB)'}
                          </p>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Upload Deed */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {text.uploadDeed}
                </h3>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  
                  {deedUrl ? (
                    <div className="space-y-3">
                      <CheckCircle size={48} className="mx-auto text-green-600" weight="fill" />
                      <p className="text-green-600 font-bold">
                        {isEnglish ? 'Deed uploaded successfully!' : 'দলিল সফলভাবে আপলোড হয়েছে!'}
                      </p>
                      {deedFile && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{deedFile.name}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {text.deedDocument}
                      </p>
                      <label className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg cursor-pointer transition-colors">
                        {uploadingDeed ? text.uploading : text.selectFile}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleDeedUpload}
                          className="hidden"
                          disabled={uploadingDeed}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        {isEnglish ? 'PDF or Image (Max 5MB)' : 'PDF বা ছবি (সর্বোচ্চ ৫MB)'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {step === 5 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {text.reviewSubmit}
                </h3>

                {/* Vehicle Details */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">{text.vehicleDetails}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{text.regNumber}</p>
                      <p className="font-bold text-gray-900 dark:text-white">{selectedVehicle.registration_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{text.vehicleType}</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {selectedVehicle.vehicle_type === 'Bike' ? text.bike : text.car}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{text.model}</p>
                      <p className="font-bold text-gray-900 dark:text-white">{selectedVehicle.vehicle_name}</p>
                    </div>
                  </div>
                </div>

                {/* Transfer Details */}
                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-green-900/20 dark:to-green-800/10 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{text.currentOwner}</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {isEnglish ? selectedVehicle.owner_name_en : selectedVehicle.owner_name_bn}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{text.newOwner}</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {isEnglish ? newOwnerData.full_name_en : newOwnerData.full_name_bn}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-primary/30">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{text.transferFee}</span>
                      <span className="text-2xl font-bold text-primary">৳ 5,000</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {isEnglish ? 'Payable after admin approval' : 'অ্যাডমিন অনুমোদনের পরে পরিশোধযোগ্য'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {step === 1 ? text.cancel : text.previous}
            </button>

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedToStep2) ||
                  (step === 2 && !canProceedToStep3) ||
                  (step === 3 && !canProceedToStep4) ||
                  (step === 4 && !canProceedToStep5)
                }
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {text.next}
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
                className="px-8 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? text.submitting : text.submit}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
