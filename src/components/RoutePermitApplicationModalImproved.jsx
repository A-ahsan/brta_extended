import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Upload, Car, Calendar, FileText, Info, Trash, Plus, CheckCircle, MagnifyingGlass, NavigationArrow } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
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

const waypointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

// Map click handler for route drawing
function RouteDrawer({ routePoints, setRoutePoints, isDrawing }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        setRoutePoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      }
    },
  });
  return null;
}

// Map component to handle centering
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}

export default function RoutePermitApplicationModalImproved({ isOpen, onClose, user, onSuccess }) {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  const [step, setStep] = useState(1); // 1: Vehicle, 2: Route, 3: Details
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    permit_days: 7,
    reason_description_en: '',
    reason_description_bn: '',
    reason_document: null,
  });

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [routePoints, setRoutePoints] = useState([]); // Array of {lat, lng}
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState(null);
  
  // New states for search and location
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]); // Dhaka center
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchRegisteredVehicles();
      resetForm();
    }
  }, [isOpen, user]);

  useEffect(() => {
    // Calculate estimated fee when vehicle, route, or days change
    if (formData.vehicle_id && routePoints.length >= 2 && formData.permit_days > 0) {
      calculateEstimatedFee();
    }
  }, [formData.vehicle_id, routePoints, formData.permit_days]);

  const fetchRegisteredVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const { data, error } = await supabase
        .from('registered_vehicles')
        .select('*')
        .eq('user_id', user.id)
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

  const resetForm = () => {
    setStep(1);
    setFormData({
      vehicle_id: '',
      permit_days: 7,
      reason_description_en: '',
      reason_description_bn: '',
      reason_document: null,
    });
    setSelectedVehicle(null);
    setRoutePoints([]);
    setIsDrawing(false);
    setEstimatedFee(null);
  };

  const calculateDistance = () => {
    if (routePoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      const R = 6371; // Earth's radius in km
      const dLat = (routePoints[i + 1].lat - routePoints[i].lat) * Math.PI / 180;
      const dLon = (routePoints[i + 1].lng - routePoints[i].lng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(routePoints[i].lat * Math.PI / 180) *
        Math.cos(routePoints[i + 1].lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }
    return totalDistance;
  };

  const calculateEstimatedFee = async () => {
    try {
      const distance = calculateDistance();
      const { data, error} = await supabase
        .rpc('calculate_route_permit_fee', {
          p_vehicle_id: formData.vehicle_id,
          p_distance_km: distance,
          p_permit_days: formData.permit_days
        });

      if (error) throw error;
      setEstimatedFee(data);
    } catch (error) {
      console.error('Error calculating fee:', error);
    }
  };

  const getReverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${isEnglish ? 'en' : 'bn'}`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(isEnglish ? 'File size must be less than 5MB' : 'ফাইলের আকার 5MB এর কম হতে হবে');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(isEnglish ? 'Only PDF and images allowed' : 'শুধুমাত্র PDF এবং ছবি অনুমোদিত');
      return;
    }

    setUploadingDocument(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('route-permit-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('route-permit-documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, reason_document: publicUrl }));
      toast.success(isEnglish ? 'Document uploaded successfully' : 'নথি সফলভাবে আপলোড হয়েছে');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(isEnglish ? 'Failed to upload document' : 'নথি আপলোড করতে ব্যর্থ');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (routePoints.length < 2) {
      toast.error(isEnglish ? 'Please draw a route with at least 2 points' : 'অন্তত ২টি পয়েন্ট সহ একটি রুট আঁকুন');
      return;
    }

    if (!formData.reason_document) {
      toast.error(isEnglish ? 'Please upload a supporting document' : 'একটি সহায়ক নথি আপলোড করুন');
      return;
    }

  // Search location using Nominatim (free OpenStreetMap geocoding)
  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)},Bangladesh&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      toast.error(isEnglish ? 'Search failed' : 'অনুসন্ধান ব্যর্থ');
    } finally {
      setIsSearching(false);
    }
  };

  // Get user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error(isEnglish ? 'Geolocation not supported' : 'জিওলোকেশন সমর্থিত নয়');
      return;
    }

    toast.loading(isEnglish ? 'Getting your location...' : 'আপনার অবস্থান নির্ধারণ করা হচ্ছে...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss();
        const location = [position.coords.latitude, position.coords.longitude];
        setUserLocation(location);
        setMapCenter(location);
        toast.success(isEnglish ? 'Location found!' : 'অবস্থান পাওয়া গেছে!');
      },
      (error) => {
        toast.dismiss();
        console.error('Location error:', error);
        toast.error(isEnglish ? 'Could not get your location' : 'আপনার অবস্থান পাওয়া যায়নি');
      }
    );
  };

    if (!formData.reason_description_en || !formData.reason_description_bn) {
      toast.error(isEnglish ? 'Please provide reason in both languages' : 'উভয় ভাষায় কারণ প্রদান করুন');
      return;
    }

    setLoading(true);
    try {
      const distance = calculateDistance();
      const startName = await getReverseGeocode(routePoints[0].lat, routePoints[0].lng);
      const endName = await getReverseGeocode(routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lng);

      // Generate permit number
      const { data: permitNumber, error: permitError } = await supabase
        .rpc('generate_route_permit_number');

      if (permitError) throw permitError;

      // Calculate fee
      const feeData = await supabase.rpc('calculate_route_permit_fee', {
        p_vehicle_id: formData.vehicle_id,
        p_distance_km: distance,
        p_permit_days: formData.permit_days
      });

      if (feeData.error) throw feeData.error;

      // Create route permit (NO PAYMENT YET - it's FREE to apply!)
      const { data: permit, error: insertError } = await supabase
        .from('route_permits')
        .insert({
          permit_number: permitNumber,
          user_id: user.id,
          vehicle_id: formData.vehicle_id,
          route_data: {
            points: routePoints,
            distance_km: distance
          },
          route_from_en: startName,
          route_from_bn: startName, // Will be same for now
          route_to_en: endName,
          route_to_bn: endName,
          distance_km: distance,
          permit_days: formData.permit_days,
          reason_document_url: formData.reason_document,
          reason_description_en: formData.reason_description_en,
          reason_description_bn: formData.reason_description_bn,
          base_fee: feeData.data.base_fee,
          distance_fee: feeData.data.distance_fee,
          total_fee: feeData.data.total_fee,
          status: 'pending', // Waiting for admin approval
          payment_status: 'pending', // No payment yet
          payment_id: null // No payment record yet
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Notify admin
      await supabase.from('notifications').insert({
        title_en: 'New Route Permit Application',
        title_bn: 'নতুন রুট পারমিট আবেদন',
        message_en: `New route permit application ${permitNumber} from ${selectedVehicle.owner_name_en}. Route: ${startName} → ${endName} (${distance.toFixed(1)} km, ${formData.permit_days} days)`,
        message_bn: `${selectedVehicle.owner_name_bn} থেকে নতুন রুট পারমিট আবেদন ${permitNumber}। রুট: ${startName} → ${endName} (${distance.toFixed(1)} কিমি, ${formData.permit_days} দিন)`,
        notification_type: 'route_permit_application',
        priority: 'normal',
        recipient_type: 'admin'
      });

      toast.success(
        isEnglish 
          ? `Application submitted successfully! Permit: ${permitNumber}. Awaiting admin approval.` 
          : `আবেদন সফলভাবে জমা দেওয়া হয়েছে! পারমিট: ${permitNumber}। অ্যাডমিন অনুমোদনের অপেক্ষায়।`
      );

      onSuccess && onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(isEnglish ? 'Failed to submit application' : 'আবেদন জমা দিতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const text = {
    step1Title: isEnglish ? 'Select Vehicle' : 'যানবাহন নির্বাচন করুন',
    step2Title: isEnglish ? 'Draw Route' : 'রুট আঁকুন',
    step3Title: isEnglish ? 'Permit Details' : 'পারমিট বিবরণ',
    noVehicles: isEnglish ? 'No approved vehicles found. Please register a vehicle first.' : 'কোনো অনুমোদিত যানবাহন পাওয়া যায়নি। প্রথমে একটি যানবাহন নিবন্ধন করুন।',
    selectVehicle: isEnglish ? 'Select a vehicle' : 'একটি যানবাহন নির্বাচন করুন',
    next: isEnglish ? 'Next' : 'পরবর্তী',
    back: isEnglish ? 'Back' : 'পূর্ববর্তী',
    submit: isEnglish ? 'Submit Application (FREE)' : 'আবেদন জমা দিন (বিনামূল্যে)',
    drawRoute: isEnglish ? 'Click on map to draw your route' : 'আপনার রুট আঁকতে মানচিত্রে ক্লিক করুন',
    startDrawing: isEnglish ? 'Start Drawing' : 'অঙ্কন শুরু করুন',
    stopDrawing: isEnglish ? 'Stop Drawing' : 'অঙ্কন বন্ধ করুন',
    clearRoute: isEnglish ? 'Clear Route' : 'রুট মুছুন',
    uploadDoc: isEnglish ? 'Upload Supporting Document' : 'সহায়ক নথি আপলোড করুন',
    reasonEn: isEnglish ? 'Reason (English)' : 'কারণ (ইংরেজি)',
    reasonBn: isEnglish ? 'Reason (Bengali)' : 'কারণ (বাংলা)',
    days: isEnglish ? 'Permit Duration (Days)' : 'পারমিট সময়কাল (দিন)',
    estimatedFee: isEnglish ? 'Estimated Fee (after approval)' : 'আনুমানিক ফি (অনুমোদনের পর)',
    freeApplication: isEnglish ? 'FREE - No payment required now!' : 'বিনামূল্যে - এখন কোনো পেমেন্টের প্রয়োজন নেই!',
    payAfterApproval: isEnglish ? 'You will pay only after admin approves your application' : 'অ্যাডমিন অনুমোদনের পরেই আপনি পেমেন্ট করবেন'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-primary to-green-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin size={32} weight="duotone" />
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isEnglish ? 'Apply for Route Permit' : 'রুট পারমিটের জন্য আবেদন করুন'}
                    </h2>
                    <p className="text-sm opacity-90">
                      {step === 1 && text.step1Title}
                      {step === 2 && text.step2Title}
                      {step === 3 && text.step3Title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} weight="bold" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`h-2 rounded-full flex-1 ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: Select Vehicle */}
              {step === 1 && (
                <div className="space-y-4">
                  {loadingVehicles ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-gray-400">
                        {isEnglish ? 'Loading vehicles...' : 'যানবাহন লোড হচ্ছে...'}
                      </p>
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div className="text-center py-8">
                      <Car size={48} className="mx-auto text-gray-400 mb-4" weight="duotone" />
                      <p className="text-gray-600 dark:text-gray-400">{text.noVehicles}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vehicles.map((vehicle) => (
                        <motion.div
                          key={vehicle.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, vehicle_id: vehicle.id }));
                            setSelectedVehicle(vehicle);
                          }}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            formData.vehicle_id === vehicle.id
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Car size={32} weight="duotone" className="text-primary" />
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-800 dark:text-white">
                                {vehicle.vehicle_name} {vehicle.model}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {vehicle.registration_plate.en}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {vehicle.vehicle_type} • {vehicle.engine_cc} CC
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {formData.vehicle_id && (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep(2)}
                      className="w-full px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary-dark transition-all"
                    >
                      {text.next} →
                    </motion.button>
                  )}
                </div>
              )}

              {/* Step 2: Draw Route */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Info Box - Improved styling */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-300 dark:border-gray-600 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Info size={20} className="text-primary flex-shrink-0" weight="bold" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{text.drawRoute}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {isEnglish 
                            ? 'Click "Start Drawing", then click multiple points on the map to create your route. The more accurate, the better!'
                            : 'Start Drawing ক্লিক করুন, তারপর আপনার রুট তৈরি করতে মানচিত্রে একাধিক পয়েন্ট ক্লিক করুন। যত সঠিক, তত ভাল!'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Search Box */}
                  <div className="relative">
                    <div className="relative">
                      <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" weight="bold" />
                      <input
                        type="text"
                        placeholder={isEnglish ? 'Search location or area...' : 'অবস্থান বা এলাকা অনুসন্ধান করুন...'}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchLocation(e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              const lat = parseFloat(result.lat);
                              const lng = parseFloat(result.lon);
                              setMapCenter([lat, lng]);
                              setSearchQuery(result.display_name);
                              setSearchResults([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                          >
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                              {result.display_name.split(',')[0]}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {result.display_name}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsDrawing(!isDrawing)}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                        isDrawing
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {isDrawing ? text.stopDrawing : text.startDrawing}
                    </button>
                    {routePoints.length > 0 && (
                      <button
                        onClick={() => setRoutePoints([])}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
                      >
                        <Trash size={18} />
                        {text.clearRoute}
                      </button>
                    )}
                  </div>

                  <div className="relative h-96 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                    <MapContainer
                      center={[23.8103, 90.4125]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <MapController center={mapCenter} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <RouteDrawer 
                        routePoints={routePoints} 
                        setRoutePoints={setRoutePoints} 
                        isDrawing={isDrawing} 
                      />
                      {routePoints.length > 0 && (
                        <>
                          <Polyline positions={routePoints.map(p => [p.lat, p.lng])} color="blue" weight={4} />
                          <Marker position={[routePoints[0].lat, routePoints[0].lng]} icon={startIcon}>
                            <Popup>Start Point</Popup>
                          </Marker>
                          {routePoints.length > 2 && routePoints.slice(1, -1).map((point, idx) => (
                            <Marker key={idx} position={[point.lat, point.lng]} icon={waypointIcon}>
                              <Popup>Waypoint {idx + 1}</Popup>
                            </Marker>
                          ))}
                          {routePoints.length > 1 && (
                            <Marker position={[routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lng]} icon={endIcon}>
                              <Popup>End Point</Popup>
                            </Marker>
                          )}
                        </>
                      )}
                      {/* User location marker */}
                      {userLocation && (
                        <Marker position={userLocation}>
                          <Popup>Your Location</Popup>
                        </Marker>
                      )}
                    </MapContainer>

                    {/* My Location Button - Floating overlay */}
                    <button
                      onClick={getUserLocation}
                      className="absolute top-3 right-3 z-[1000] p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group"
                      title={isEnglish ? 'My Location' : 'আমার অবস্থান'}
                    >
                      <NavigationArrow size={22} className="text-primary group-hover:scale-110 transition-transform" weight="bold" />
                    </button>
                  </div>

                  {routePoints.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Points' : 'পয়েন্ট'}</p>
                          <p className="font-bold text-gray-800 dark:text-white">{routePoints.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Distance' : 'দূরত্ব'}</p>
                          <p className="font-bold text-gray-800 dark:text-white">
                            {calculateDistance().toFixed(1)} km
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      ← {text.back}
                    </button>
                    {routePoints.length >= 2 && (
                      <button
                        onClick={() => setStep(3)}
                        className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary-dark transition-all"
                      >
                        {text.next} →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Details */}
              {step === 3 && (
                <div className="space-y-6">
                  {/* FREE Application Notice */}
                  <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-0.5" weight="fill" />
                      <div className="text-sm text-green-800 dark:text-green-200">
                        <p className="font-bold text-lg mb-1">{text.freeApplication}</p>
                        <p className="opacity-90">{text.payAfterApproval}</p>
                      </div>
                    </div>
                  </div>

                  {/* Permit Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar size={18} className="inline mr-2" weight="duotone" />
                      {text.days}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.permit_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, permit_days: parseInt(e.target.value) || 1 }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Document Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <Upload size={18} className="inline mr-2" weight="duotone" />
                      {text.uploadDoc}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleDocumentUpload}
                      disabled={uploadingDocument}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-primary transition-all"
                    />
                    {uploadingDocument && (
                      <p className="text-sm text-primary mt-2">
                        {isEnglish ? 'Uploading...' : 'আপলোড হচ্ছে...'}
                      </p>
                    )}
                    {formData.reason_document && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                        <CheckCircle size={16} weight="fill" />
                        {isEnglish ? 'Document uploaded' : 'নথি আপলোড হয়েছে'}
                      </p>
                    )}
                  </div>

                  {/* Reason (English) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <FileText size={18} className="inline mr-2" weight="duotone" />
                      {text.reasonEn}
                    </label>
                    <textarea
                      value={formData.reason_description_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason_description_en: e.target.value }))}
                      rows="3"
                      placeholder="Enter reason in English..."
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                  </div>

                  {/* Reason (Bengali) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <FileText size={18} className="inline mr-2" weight="duotone" />
                      {text.reasonBn}
                    </label>
                    <textarea
                      value={formData.reason_description_bn}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason_description_bn: e.target.value }))}
                      rows="3"
                      placeholder="বাংলায় কারণ লিখুন..."
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                  </div>

                  {/* Estimated Fee */}
                  {estimatedFee && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                      <h4 className="font-bold text-gray-800 dark:text-white mb-3">{text.estimatedFee}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Base Fee' : 'মূল ফি'}</span>
                          <span className="font-semibold text-gray-800 dark:text-white">
                            ৳ {estimatedFee.base_fee.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{isEnglish ? 'Distance Fee' : 'দূরত্ব ফি'}</span>
                          <span className="font-semibold text-gray-800 dark:text-white">
                            ৳ {estimatedFee.distance_fee.toLocaleString()}
                          </span>
                        </div>
                        <div className="border-t-2 border-yellow-300 dark:border-yellow-700 pt-2 flex justify-between">
                          <span className="font-bold text-gray-800 dark:text-white">{isEnglish ? 'Total' : 'মোট'}</span>
                          <span className="font-bold text-primary text-lg">
                            ৳ {estimatedFee.total_fee.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-center text-yellow-700 dark:text-yellow-300 italic mt-2">
                          {isEnglish ? '* Payable only after admin approval' : '* শুধুমাত্র অ্যাডমিন অনুমোদনের পরে প্রদেয়'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      ← {text.back}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !formData.reason_document || !formData.reason_description_en || !formData.reason_description_bn}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (isEnglish ? 'Submitting...' : 'জমা দেওয়া হচ্ছে...') : text.submit}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
