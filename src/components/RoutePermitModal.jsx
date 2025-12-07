import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Upload, Car, Calendar, CurrencyDollar, FileText, Info } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for start and end points
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map click handler component
function MapClickHandler({ onMapClick, markerType }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng, markerType);
    },
  });
  return null;
}

// Auto-center map component
function MapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function RoutePermitModal({ isOpen, onClose, user, onSuccess }) {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  const [step, setStep] = useState(1); // 1: Select Vehicle, 2: Route Selection, 3: Details & Document
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    route_from: null, // {lat, lng, name}
    route_to: null, // {lat, lng, name}
    distance_km: 0,
    permit_days: 7,
    reason_description_en: '',
    reason_description_bn: '',
    reason_document: null,
  });

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [markerMode, setMarkerMode] = useState(null); // 'from' or 'to'
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]); // Dhaka center

  useEffect(() => {
    if (isOpen) {
      fetchRegisteredVehicles();
      resetForm();
    }
  }, [isOpen, user]);

  useEffect(() => {
    // Calculate fee when vehicle, distance, or days change
    if (formData.vehicle_id && formData.distance_km > 0 && formData.permit_days > 0) {
      calculateFee();
    }
  }, [formData.vehicle_id, formData.distance_km, formData.permit_days]);

  const fetchRegisteredVehicles = async () => {
    if (!user?.id) return;
    
    setLoadingVehicles(true);
    try {
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
      toast.error(isEnglish ? 'Failed to load vehicles' : 'যানবাহন লোড করতে ব্যর্থ');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const calculateFee = async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_route_permit_fee', {
        p_vehicle_id: formData.vehicle_id,
        p_distance_km: formData.distance_km,
        p_permit_days: formData.permit_days
      });

      if (error) throw error;
      setFeeBreakdown(data);
    } catch (error) {
      console.error('Error calculating fee:', error);
    }
  };

  const calculateDistance = (from, to) => {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  };

  const getLocationName = async (lat, lng) => {
    try {
      // Use Nominatim (OpenStreetMap) reverse geocoding - free and no API key needed
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json',
          'accept-language': 'en'
        }
      });

      if (response.data && response.data.display_name) {
        // Extract meaningful location name
        const address = response.data.address;
        let name = '';
        
        if (address.city) {
          name = address.city;
        } else if (address.town) {
          name = address.town;
        } else if (address.village) {
          name = address.village;
        } else if (address.state) {
          name = address.state;
        } else {
          name = response.data.display_name.split(',')[0];
        }
        
        return name;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const handleMapClick = async (latlng, type) => {
    const locationName = await getLocationName(latlng.lat, latlng.lng);
    
    if (type === 'from') {
      setFormData(prev => ({
        ...prev,
        route_from: {
          lat: latlng.lat,
          lng: latlng.lng,
          name: locationName
        }
      }));
      setMarkerMode(null);
      
      // If both points are set, calculate distance
      if (formData.route_to) {
        const dist = calculateDistance(
          { lat: latlng.lat, lng: latlng.lng },
          formData.route_to
        );
        setFormData(prev => ({ ...prev, distance_km: dist }));
      }
    } else if (type === 'to') {
      setFormData(prev => ({
        ...prev,
        route_to: {
          lat: latlng.lat,
          lng: latlng.lng,
          name: locationName
        }
      }));
      setMarkerMode(null);
      
      // If both points are set, calculate distance
      if (formData.route_from) {
        const dist = calculateDistance(
          formData.route_from,
          { lat: latlng.lat, lng: latlng.lng }
        );
        setFormData(prev => ({ ...prev, distance_km: dist }));
      }
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type (PDF or images)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(isEnglish ? 'Only PDF and images allowed' : 'শুধুমাত্র PDF এবং ছবি অনুমোদিত');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isEnglish ? 'File size must be less than 10MB' : 'ফাইলের আকার 10MB এর কম হতে হবে');
      return;
    }

    setUploadingDocument(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('route-permit-documents')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('route-permit-documents')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        reason_document: urlData.publicUrl
      }));

      toast.success(isEnglish ? 'Document uploaded successfully' : 'ডকুমেন্ট সফলভাবে আপলোড হয়েছে');
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error(isEnglish ? 'Failed to upload document' : 'ডকুমেন্ট আপলোড করতে ব্যর্থ');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData(prev => ({ ...prev, vehicle_id: vehicle.id }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.vehicle_id) {
      toast.error(isEnglish ? 'Please select a vehicle' : 'একটি যানবাহন নির্বাচন করুন');
      return;
    }

    if (!formData.route_from || !formData.route_to) {
      toast.error(isEnglish ? 'Please select both start and end points on map' : 'মানচিত্রে শুরু এবং শেষ উভয় পয়েন্ট নির্বাচন করুন');
      return;
    }

    if (!formData.reason_document) {
      toast.error(isEnglish ? 'Please upload reason document' : 'কারণ ডকুমেন্ট আপলোড করুন');
      return;
    }

    if (!formData.reason_description_en || !formData.reason_description_bn) {
      toast.error(isEnglish ? 'Please provide reason in both languages' : 'উভয় ভাষায় কারণ প্রদান করুন');
      return;
    }

    if (formData.permit_days < 1 || formData.permit_days > 365) {
      toast.error(isEnglish ? 'Permit days must be between 1 and 365' : 'পারমিট দিন 1 থেকে 365 এর মধ্যে হতে হবে');
      return;
    }

    if (!feeBreakdown) {
      toast.error(isEnglish ? 'Fee calculation failed' : 'ফি গণনা ব্যর্থ');
      return;
    }

    setLoading(true);
    try {
      // Generate permit number
      const { data: permitNumber, error: permitError } = await supabase
        .rpc('generate_route_permit_number');

      if (permitError) throw permitError;

      // Create payment record
      const tran_id = `RP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          user_id: user.id,
          amount: feeBreakdown.total_fee,
          currency: 'BDT',
          tran_id: tran_id,
          status: 'initiated',
          payment_type: 'route_permit'
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create route permit application
      const routeData = {
        from: formData.route_from,
        to: formData.route_to,
        distance_km: formData.distance_km
      };

      const { data: routePermit, error: permitInsertError } = await supabase
        .from('route_permits')
        .insert([{
          permit_number: permitNumber,
          user_id: user.id,
          vehicle_id: formData.vehicle_id,
          route_data: routeData,
          route_from_en: formData.route_from.name,
          route_from_bn: formData.route_from.name, // Will be translated later if needed
          route_to_en: formData.route_to.name,
          route_to_bn: formData.route_to.name, // Will be translated later if needed
          distance_km: formData.distance_km,
          permit_days: formData.permit_days,
          reason_document_url: formData.reason_document,
          reason_description_en: formData.reason_description_en,
          reason_description_bn: formData.reason_description_bn,
          base_fee: feeBreakdown.base_fee,
          distance_fee: feeBreakdown.distance_fee,
          total_fee: feeBreakdown.total_fee,
          payment_id: payment.id,
          payment_status: 'pending',
          status: 'pending'
        }])
        .select()
        .single();

      if (permitInsertError) throw permitInsertError;

      // Send notification
      await supabase.rpc('create_dual_notification', {
        p_user_id: user.id,
        p_title_en: 'Route Permit Application Submitted',
        p_title_bn: 'রুট পারমিট আবেদন জমা দেওয়া হয়েছে',
        p_message_en: `Your route permit application ${permitNumber} from ${formData.route_from.name} to ${formData.route_to.name} has been submitted and is pending payment.`,
        p_message_bn: `আপনার রুট পারমিট আবেদন ${permitNumber} ${formData.route_from.name} থেকে ${formData.route_to.name} জমা দেওয়া হয়েছে এবং পেমেন্ট মুলতুবি আছে।`,
        p_type: 'route_permit_application',
        p_application_id: null,
        p_action_url: null,
        p_admin_title_en: 'New Route Permit Application',
        p_admin_title_bn: 'নতুন রুট পারমিট আবেদন',
        p_admin_message_en: `Route permit ${permitNumber} submitted by user. Route: ${formData.route_from.name} → ${formData.route_to.name} (${formData.distance_km} km, ${formData.permit_days} days). Fee: ৳${feeBreakdown.total_fee}`,
        p_admin_message_bn: `ব্যবহারকারী দ্বারা রুট পারমিট ${permitNumber} জমা দেওয়া হয়েছে। রুট: ${formData.route_from.name} → ${formData.route_to.name} (${formData.distance_km} কিমি, ${formData.permit_days} দিন)। ফি: ৳${feeBreakdown.total_fee}`
      });

      // Initiate payment
      await initiatePayment(payment.id, feeBreakdown.total_fee, permitNumber);

      toast.success(isEnglish 
        ? 'Route permit application created! Redirecting to payment...' 
        : 'রুট পারমিট আবেদন তৈরি হয়েছে! পেমেন্টে রিডাইরেক্ট হচ্ছে...');
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Route permit submission error:', error);
      toast.error(isEnglish ? 'Failed to submit application' : 'আবেদন জমা দিতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async (paymentId, amount, permitNumber) => {
    try {
      const frontendUrl = window.location.origin;
      const backendUrl = `${window.location.protocol}//${window.location.hostname}:5000`;

      const response = await axios.post(`${backendUrl}/api/payment/route-permit`, {
        payment_id: paymentId,
        amount: amount,
        permit_number: permitNumber,
        user_name: selectedVehicle?.owner_name_en || 'User',
        user_email: user?.email || 'user@example.com',
        frontend_url: frontendUrl
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error(isEnglish ? 'Failed to initiate payment' : 'পেমেন্ট শুরু করতে ব্যর্থ');
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      vehicle_id: '',
      route_from: null,
      route_to: null,
      distance_km: 0,
      permit_days: 7,
      reason_description_en: '',
      reason_description_bn: '',
      reason_document: null,
    });
    setSelectedVehicle(null);
    setFeeBreakdown(null);
    setMarkerMode(null);
  };

  const text = {
    title: isEnglish ? 'Apply for Route Permit' : 'রুট পারমিটের জন্য আবেদন করুন',
    step1: isEnglish ? 'Select Vehicle' : 'যানবাহন নির্বাচন করুন',
    step2: isEnglish ? 'Select Route' : 'রুট নির্বাচন করুন',
    step3: isEnglish ? 'Details & Document' : 'বিবরণ এবং ডকুমেন্ট',
    selectVehicle: isEnglish ? 'Select a vehicle for route permit' : 'রুট পারমিটের জন্য একটি যানবাহন নির্বাচন করুন',
    noVehicles: isEnglish ? 'No registered vehicles found' : 'কোনো নিবন্ধিত যানবাহন পাওয়া যায়নি',
    vehicleDetails: isEnglish ? 'Vehicle Details' : 'যানবাহনের বিবরণ',
    routeInstructions: isEnglish ? 'Click on the map to set starting and ending points' : 'শুরু এবং শেষ পয়েন্ট সেট করতে মানচিত্রে ক্লিক করুন',
    setStartPoint: isEnglish ? 'Set Start Point' : 'শুরু পয়েন্ট সেট করুন',
    setEndPoint: isEnglish ? 'Set End Point' : 'শেষ পয়েন্ট সেট করুন',
    from: isEnglish ? 'From' : 'থেকে',
    to: isEnglish ? 'To' : 'পর্যন্ত',
    distance: isEnglish ? 'Distance' : 'দূরত্ব',
    permitDays: isEnglish ? 'Permit Duration (Days)' : 'পারমিট সময়কাল (দিন)',
    reasonDocument: isEnglish ? 'Reason Document (PDF/Image)' : 'কারণ ডকুমেন্ট (PDF/ছবি)',
    uploadDocument: isEnglish ? 'Upload Document' : 'ডকুমেন্ট আপলোড করুন',
    reasonDescriptionEn: isEnglish ? 'Reason (English)' : 'কারণ (ইংরেজি)',
    reasonDescriptionBn: isEnglish ? 'Reason (Bengali)' : 'কারণ (বাংলা)',
    feeBreakdown: isEnglish ? 'Fee Breakdown' : 'ফি বিবরণ',
    baseFee: isEnglish ? 'Base Fee' : 'মূল ফি',
    distanceFee: isEnglish ? 'Distance Fee' : 'দূরত্ব ফি',
    totalFee: isEnglish ? 'Total Fee' : 'মোট ফি',
    next: isEnglish ? 'Next' : 'পরবর্তী',
    previous: isEnglish ? 'Previous' : 'পূর্ববর্তী',
    submit: isEnglish ? 'Proceed to Payment' : 'পেমেন্টে যান',
    cancel: isEnglish ? 'Cancel' : 'বাতিল',
    perDay: isEnglish ? '/day' : '/দিন',
    km: isEnglish ? 'km' : 'কিমি',
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-green-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin size={32} weight="duotone" />
                <div>
                  <h2 className="text-2xl font-bold">{text.title}</h2>
                  <p className="text-sm opacity-90">
                    {step === 1 && text.step1}
                    {step === 2 && text.step2}
                    {step === 3 && text.step3}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`h-2 rounded-full flex-1 ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">{text.selectVehicle}</p>

                {loadingVehicles ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <Car size={64} weight="duotone" className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">{text.noVehicles}</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {vehicles.map((vehicle) => (
                      <motion.div
                        key={vehicle.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleVehicleSelect(vehicle)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedVehicle?.id === vehicle.id
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Car size={40} weight="duotone" className="text-primary" />
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-white">
                              {vehicle.vehicle_name} {vehicle.model}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {isEnglish ? vehicle.registration_plate.en : vehicle.registration_plate.bn}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {vehicle.vehicle_type} • {vehicle.engine_cc} CC
                            </p>
                          </div>
                          {selectedVehicle?.id === vehicle.id && (
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <Info size={20} />
                  {text.routeInstructions}
                </p>

                {/* Map Selection Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setMarkerMode('from')}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                      markerMode === 'from'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100'
                    }`}
                  >
                    {text.setStartPoint}
                  </button>
                  <button
                    onClick={() => setMarkerMode('to')}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                      markerMode === 'to'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100'
                    }`}
                  >
                    {text.setEndPoint}
                  </button>
                </div>

                {/* Map Container */}
                <div className="h-96 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                  <MapContainer
                    center={mapCenter}
                    zoom={7}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {markerMode && (
                      <MapClickHandler onMapClick={handleMapClick} markerType={markerMode} />
                    )}
                    {formData.route_from && (
                      <Marker position={[formData.route_from.lat, formData.route_from.lng]} icon={startIcon}>
                        <Popup>{formData.route_from.name}</Popup>
                      </Marker>
                    )}
                    {formData.route_to && (
                      <Marker position={[formData.route_to.lat, formData.route_to.lng]} icon={endIcon}>
                        <Popup>{formData.route_to.name}</Popup>
                      </Marker>
                    )}
                    {mapCenter && <MapCenter center={mapCenter} />}
                  </MapContainer>
                </div>

                {/* Route Summary */}
                {(formData.route_from || formData.route_to) && (
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    {formData.route_from && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{text.from}</p>
                        <p className="font-bold text-gray-800 dark:text-white">{formData.route_from.name}</p>
                      </div>
                    )}
                    {formData.route_to && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{text.to}</p>
                        <p className="font-bold text-gray-800 dark:text-white">{formData.route_to.name}</p>
                      </div>
                    )}
                    {formData.distance_km > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{text.distance}</p>
                        <p className="font-bold text-gray-800 dark:text-white">
                          {formData.distance_km} {text.km}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {/* Permit Days */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.permitDays}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.permit_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, permit_days: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Document Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.reasonDocument}
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleDocumentUpload}
                      disabled={uploadingDocument}
                      className="hidden"
                      id="document-upload"
                    />
                    <label
                      htmlFor="document-upload"
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary cursor-pointer transition-all bg-gray-50 dark:bg-gray-900"
                    >
                      <Upload size={24} weight="duotone" className="text-primary" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {uploadingDocument ? (isEnglish ? 'Uploading...' : 'আপলোড হচ্ছে...') : text.uploadDocument}
                      </span>
                    </label>
                    {formData.reason_document && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        ✓ {isEnglish ? 'Document uploaded' : 'ডকুমেন্ট আপলোড হয়েছে'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reason English */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.reasonDescriptionEn}
                  </label>
                  <textarea
                    value={formData.reason_description_en}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason_description_en: e.target.value }))}
                    rows="3"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:outline-none resize-none"
                    placeholder="E.g., Business trip for company work"
                  />
                </div>

                {/* Reason Bengali */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {text.reasonDescriptionBn}
                  </label>
                  <textarea
                    value={formData.reason_description_bn}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason_description_bn: e.target.value }))}
                    rows="3"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:outline-none resize-none"
                    placeholder="যেমন, কোম্পানির কাজের জন্য ব্যবসায়িক ভ্রমণ"
                  />
                </div>

                {/* Fee Breakdown */}
                {feeBreakdown && (
                  <div className="bg-gradient-to-r from-primary/10 to-green-500/10 p-6 rounded-xl border-2 border-primary/20">
                    <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                      <CurrencyDollar size={24} weight="duotone" className="text-primary" />
                      {text.feeBreakdown}
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">
                          {text.baseFee} ({feeBreakdown.base_fee_per_day} {text.perDay} × {formData.permit_days} days)
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          ৳ {feeBreakdown.base_fee.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">
                          {text.distanceFee} ({feeBreakdown.distance_fee_per_day} {text.perDay} × {formData.permit_days} days)
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          ৳ {feeBreakdown.distance_fee.toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-3 border-t-2 border-primary/20 flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-800 dark:text-white">{text.totalFee}</span>
                        <span className="text-2xl font-bold text-primary">
                          ৳ {feeBreakdown.total_fee.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-between">
            <button
              onClick={step === 1 ? onClose : () => setStep(step - 1)}
              className="px-6 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {step === 1 ? text.cancel : text.previous}
            </button>

            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !selectedVehicle) {
                    toast.error(isEnglish ? 'Please select a vehicle' : 'একটি যানবাহন নির্বাচন করুন');
                    return;
                  }
                  if (step === 2 && (!formData.route_from || !formData.route_to)) {
                    toast.error(isEnglish ? 'Please set both points on map' : 'মানচিত্রে উভয় পয়েন্ট সেট করুন');
                    return;
                  }
                  setStep(step + 1);
                }}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-green-600 hover:from-primary/90 hover:to-green-600/90 transition-all shadow-lg"
              >
                {text.next}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-green-600 hover:from-primary/90 hover:to-green-600/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {isEnglish ? 'Processing...' : 'প্রক্রিয়াকরণ...'}
                  </>
                ) : (
                  text.submit
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
