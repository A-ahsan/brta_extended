import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, Bicycle, MapPin, CalendarCheck, Upload, Image as ImageIcon, CreditCard } from 'phosphor-react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const VehicleRegistrationModal = ({ isOpen, onClose, user, onSuccess }) => {
  const { language } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [userVehicles, setUserVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    division_code: '',
    registration_period: 1,
    vehicle_photo_url: '',
    use_dl_photo: false,
  });

  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Fee structure (per year)
  const FEE_STRUCTURE = {
    Bike: {
      light: 500,  // ≤150 CC
      heavy: 800   // >150 CC
    },
    Car: {
      light: 1500,  // ≤1500 CC
      heavy: 2500   // >1500 CC
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDivisions();
      fetchUserVehicles();
    }
  }, [isOpen, user]);

  const fetchDivisions = async () => {
    try {
      const { data, error } = await supabase
        .from('bd_divisions')
        .select('*')
        .order('division_name_en');
      
      if (error) throw error;
      setDivisions(data || []);
    } catch (error) {
      console.error('Error fetching divisions:', error);
      toast.error(language === 'en' ? 'Failed to load divisions' : 'বিভাগ লোড ব্যর্থ');
    }
  };

  const fetchUserVehicles = async () => {
    setLoadingVehicles(true);
    try {
      // Get user's vehicles that are NOT already registered
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', user?.id);
      
      if (error) throw error;

      // Filter out already registered vehicles
      const { data: registeredVehicles, error: regError } = await supabase
        .from('registered_vehicles')
        .select('vehicle_id')
        .eq('user_id', user?.id);

      if (regError) throw regError;

      const registeredVehicleIds = registeredVehicles?.map(rv => rv.vehicle_id) || [];
      const unregisteredVehicles = vehicles?.filter(v => !registeredVehicleIds.includes(v.id)) || [];
      
      setUserVehicles(unregisteredVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error(language === 'en' ? 'Failed to load vehicles' : 'যানবাহন লোড ব্যর্থ');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const calculateFee = () => {
    if (!selectedVehicle) return 0;
    
    const vehicleType = selectedVehicle.vehicle_type;
    const engineCC = selectedVehicle.engine_cc || 0;
    
    let baseFee = 0;
    if (vehicleType === 'Bike') {
      baseFee = engineCC <= 150 ? FEE_STRUCTURE.Bike.light : FEE_STRUCTURE.Bike.heavy;
    } else {
      baseFee = engineCC <= 1500 ? FEE_STRUCTURE.Car.light : FEE_STRUCTURE.Car.heavy;
    }
    
    return baseFee * formData.registration_period;
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({ ...formData, vehicle_id: vehicle.id });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'en' ? 'Please select an image file' : 'একটি ছবি ফাইল নির্বাচন করুন');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'en' ? 'Image size must be less than 5MB' : 'ছবির আকার ৫MB এর কম হতে হবে');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_vehicle_${Date.now()}.${fileExt}`;
      const filePath = `vehicle_photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-documents')
        .getPublicUrl(filePath);

      setFormData({ ...formData, vehicle_photo_url: publicUrl, use_dl_photo: false });
      toast.success(language === 'en' ? 'Image uploaded successfully' : 'ছবি সফলভাবে আপলোড হয়েছে');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(language === 'en' ? 'Failed to upload image' : 'ছবি আপলোড ব্যর্থ');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUseDLPhoto = async () => {
    try {
      // Fetch user's most recent active DL photo (in case user has multiple licenses)
      const { data: licenses, error } = await supabase
        .from('licenses')
        .select('photo_url, license_number, license_type, created_at')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (licenses && licenses.length > 0) {
        // Use the most recent license photo
        const latestLicense = licenses[0];
        setFormData({ ...formData, vehicle_photo_url: latestLicense.photo_url, use_dl_photo: true });
        toast.success(
          language === 'en' 
            ? `DL photo selected from ${latestLicense.license_number}` 
            : `${latestLicense.license_number} থেকে DL ফটো নির্বাচিত`
        );
      } else {
        toast.error(language === 'en' ? 'No DL photo found' : 'কোনো DL ফটো পাওয়া যায়নি');
      }
    } catch (error) {
      console.error('Error fetching DL photo:', error);
      toast.error(language === 'en' ? 'Failed to load DL photo' : 'DL ফটো লোড ব্যর্থ');
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicle) {
      toast.error(language === 'en' ? 'Please select a vehicle' : 'একটি যানবাহন নির্বাচন করুন');
      return;
    }

    if (!formData.division_code) {
      toast.error(language === 'en' ? 'Please select a division' : 'একটি বিভাগ নির্বাচন করুন');
      return;
    }

    setLoading(true);
    try {
      const totalFee = calculateFee();
      
      // Generate unique transaction ID
      const tranId = `VR${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create payment record first
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          user_id: user.id,
          payment_type: 'vehicle_registration',
          amount: totalFee,
          status: 'initiated',
          tran_id: tranId
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create vehicle registration application
      const { data: application, error: appError } = await supabase
        .from('vehicle_registrations')
        .insert([{
          application_number: await generateApplicationNumber(),
          user_id: user.id,
          vehicle_id: formData.vehicle_id,
          division_code: formData.division_code,
          registration_period: formData.registration_period,
          registration_fee: totalFee,
          vehicle_photo_url: formData.vehicle_photo_url || null,
          use_dl_photo: formData.use_dl_photo,
          payment_id: payment.id,
          payment_status: 'pending',
          status: 'pending'
        }])
        .select()
        .single();

      if (appError) throw appError;

      // Initiate SSLCommerz payment
      await initiatePayment(payment.id, totalFee, application.application_number);

      toast.success(language === 'en' 
        ? 'Registration application created! Redirecting to payment...' 
        : 'নিবন্ধন আবেদন তৈরি হয়েছে! পেমেন্টে রিডাইরেক্ট হচ্ছে...');
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error submitting registration:', error);
      toast.error(language === 'en' ? 'Failed to submit registration' : 'নিবন্ধন জমা ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const generateApplicationNumber = async () => {
    const { data, error } = await supabase.rpc('generate_vehicle_registration_application_number');
    if (error) throw error;
    return data;
  };

  const initiatePayment = async (paymentId, amount, applicationNumber) => {
    try {
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      const port = window.location.port;
      const frontendUrl = `${protocol}//${host}${port ? ':' + port : ''}`;
      const backendHost = host === 'localhost' ? 'localhost' : host;
      
      const response = await fetch(`${protocol}//${backendHost}:5000/api/payment/vehicle-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          userId: user.id,
          amount,
          applicationNumber,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || 'User',
          frontend_url: frontendUrl
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error(language === 'en' ? 'Payment initialization failed' : 'পেমেন্ট শুরু ব্যর্থ');
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      division_code: '',
      registration_period: 1,
      vehicle_photo_url: '',
      use_dl_photo: false,
    });
    setSelectedVehicle(null);
    setStep(1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => { resetForm(); onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-primary to-green-600 text-white p-6 rounded-t-3xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Car size={32} weight="duotone" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {language === 'en' ? 'Vehicle Registration' : 'যানবাহন নিবন্ধন'}
                  </h2>
                  <p className="text-sm opacity-90">
                    {language === 'en' ? 'Register your vehicle & get number plate' : 'আপনার যানবাহন নিবন্ধন করুন এবং নম্বর প্লেট পান'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { resetForm(); onClose(); }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 flex items-center justify-center gap-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s ? 'bg-white text-primary' : 'bg-white/20'
                  }`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-white' : 'bg-white/20'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Step 1: Select Vehicle */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  {language === 'en' ? 'Select Vehicle to Register' : 'নিবন্ধনের জন্য যানবাহন নির্বাচন করুন'}
                </h3>

                {loadingVehicles ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : userVehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <Car size={64} weight="duotone" className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {language === 'en' 
                        ? 'No unregistered vehicles found. Please add a vehicle first.' 
                        : 'কোনো অনিবন্ধিত যানবাহন পাওয়া যায়নি। প্রথমে একটি যানবাহন যুক্ত করুন।'}
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {userVehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        onClick={() => handleVehicleSelect(vehicle)}
                        className={`p-6 rounded-2xl border-2 transition-all text-left ${
                          selectedVehicle?.id === vehicle.id
                            ? 'border-primary bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          {vehicle.vehicle_type === 'Bike' ? (
                            <Bicycle size={32} weight="duotone" className="text-primary" />
                          ) : (
                            <Car size={32} weight="duotone" className="text-primary" />
                          )}
                          {selectedVehicle?.id === vehicle.id && (
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-white text-lg">
                          {vehicle.vehicle_name} {vehicle.model}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {language === 'en' ? 'Engine:' : 'ইঞ্জিন:'} {vehicle.engine_number}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'CC:' : 'সিসি:'} {vehicle.engine_cc || 'N/A'}
                        </p>
                        <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                          {vehicle.vehicle_type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedVehicle}
                  className="w-full bg-gradient-to-r from-primary to-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  {language === 'en' ? 'Continue →' : 'পরবর্তী →'}
                </button>
              </div>
            )}

            {/* Step 2: Registration Details */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  {language === 'en' ? 'Registration Details' : 'নিবন্ধন বিবরণ'}
                </h3>

                {/* Division Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'Select Division (for Number Plate)' : 'বিভাগ নির্বাচন করুন (নম্বর প্লেটের জন্য)'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {divisions.map((division) => (
                      <button
                        key={division.id}
                        onClick={() => setFormData({ ...formData, division_code: division.division_code })}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          formData.division_code === division.division_code
                            ? 'border-primary bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                        }`}
                      >
                        <MapPin size={24} weight="duotone" className="mx-auto mb-2 text-primary" />
                        <p className="font-semibold text-gray-800 dark:text-white text-sm">
                          {language === 'en' ? division.division_name_en : division.division_name_bn}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Registration Period */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'Registration Period (Years)' : 'নিবন্ধন সময়কাল (বছর)'}
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {[1, 2, 3, 4, 5].map((year) => (
                      <button
                        key={year}
                        onClick={() => setFormData({ ...formData, registration_period: year })}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.registration_period === year
                            ? 'border-primary bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                        }`}
                      >
                        <CalendarCheck size={24} weight="duotone" className="mx-auto mb-1 text-primary" />
                        <p className="font-bold text-gray-800 dark:text-white">{year}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {language === 'en' ? 'Year' : 'বছর'}{year > 1 ? 's' : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee Calculation */}
                {selectedVehicle && formData.registration_period && (
                  <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
                    <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <CreditCard size={24} weight="duotone" className="text-primary" />
                      {language === 'en' ? 'Fee Calculation' : 'ফি গণনা'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'Vehicle Type:' : 'যানবাহনের ধরন:'}
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {selectedVehicle.vehicle_type} ({selectedVehicle.engine_cc || 0} CC)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'Period:' : 'সময়কাল:'}
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {formData.registration_period} {language === 'en' ? 'Year(s)' : 'বছর'}
                        </span>
                      </div>
                      <div className="pt-2 border-t-2 border-green-200 dark:border-green-800 flex justify-between">
                        <span className="font-bold text-gray-800 dark:text-white">
                          {language === 'en' ? 'Total Fee:' : 'মোট ফি:'}
                        </span>
                        <span className="font-bold text-2xl text-primary">
                          ৳{calculateFee()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    {language === 'en' ? '← Back' : '← পূর্ববর্তী'}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!formData.division_code}
                    className="flex-1 bg-gradient-to-r from-primary to-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                  >
                    {language === 'en' ? 'Continue →' : 'পরবর্তী →'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Upload Photo */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  {language === 'en' ? 'Vehicle Photo (Optional)' : 'যানবাহনের ছবি (ঐচ্ছিক)'}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Upload New Photo */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                    <Upload size={48} weight="duotone" className="mx-auto text-gray-400 mb-4" />
                    <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                      {language === 'en' ? 'Upload Vehicle Photo' : 'যানবাহনের ছবি আপলোড করুন'}
                    </h4>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="vehicle-photo"
                    />
                    <label
                      htmlFor="vehicle-photo"
                      className="inline-block cursor-pointer px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all"
                    >
                      {uploadingImage ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {language === 'en' ? 'Uploading...' : 'আপলোড হচ্ছে...'}
                        </span>
                      ) : (
                        language === 'en' ? 'Choose File' : 'ফাইল নির্বাচন করুন'
                      )}
                    </label>
                  </div>

                  {/* Use DL Photo */}
                  <button
                    onClick={handleUseDLPhoto}
                    className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-primary transition-all"
                  >
                    <ImageIcon size={48} weight="duotone" className="mx-auto text-primary mb-4" />
                    <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                      {language === 'en' ? 'Use License Photo' : 'লাইসেন্সের ছবি ব্যবহার করুন'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {language === 'en' ? 'Use your DL photo' : 'আপনার DL ফটো ব্যবহার করুন'}
                    </p>
                  </button>
                </div>

                {formData.vehicle_photo_url && (
                  <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                    <p className="text-green-700 dark:text-green-300 font-semibold flex items-center gap-2">
                      <ImageIcon size={20} />
                      {language === 'en' ? 'Photo selected successfully!' : 'ছবি সফলভাবে নির্বাচিত!'}
                      {formData.use_dl_photo && ` (${language === 'en' ? 'DL Photo' : 'DL ফটো'})`}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    {language === 'en' ? '← Back' : '← পূর্ববর্তী'}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-primary to-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {language === 'en' ? 'Processing...' : 'প্রক্রিয়াকরণ...'}
                      </>
                    ) : (
                      <>
                        <CreditCard size={20} weight="bold" />
                        {language === 'en' ? 'Proceed to Payment' : 'পেমেন্টে যান'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VehicleRegistrationModal;
