import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bicycle,
  Car,
  Plus,
  User,
  IdentificationCard,
  SignOut,
  Bell,
  X,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  List as ListIcon,
} from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabaseClient';
import ThemeLanguageToggler from '../components/ThemeLanguageToggler';
import toast from 'react-hot-toast';
// import axios from 'axios'; // Not needed - using direct Supabase queries like admin dashboard

const VehicleAdderDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { signOut, user } = useAuth();
  const t = translations[language] || translations.en;

  const [activeTab, setActiveTab] = useState('add');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // License holders
  const [licenseHolders, setLicenseHolders] = useState([]);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add vehicle form
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_name: '',
    model: '',
    engine_number: '',
    engine_cc: '',
    owner_id: '',
    license_id: '',
    vehicle_type: 'Bike',
  });
  const [selectedHolder, setSelectedHolder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vehicles list
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchLicenseHolders();
    fetchVehicles();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchLicenseHolders = async () => {
    setLoadingHolders(true);
    try {
      // Fetch license holders directly from Supabase (like admin dashboard does)
      const { data, error } = await supabase
        .from('licenses')
        .select('id, user_id, license_number, license_type, license_category, full_name_en, full_name_bn')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLicenseHolders(data || []);
    } catch (error) {
      console.error('Error fetching license holders:', error);
      toast.error(language === 'en' ? 'Failed to load license holders' : 'লাইসেন্স ধারক লোড ব্যর্থ');
    } finally {
      setLoadingHolders(false);
    }
  };

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          licenses:license_id (
            license_number,
            full_name_en,
            full_name_bn,
            license_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error(language === 'en' ? 'Failed to load vehicles' : 'যানবাহন লোড ব্যর্থ');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleSelectHolder = (holder) => {
    setSelectedHolder(holder);
    setVehicleForm({
      ...vehicleForm,
      owner_id: holder.user_id,
      license_id: holder.id,
    });
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    
    if (!selectedHolder) {
      toast.error(language === 'en' ? 'Please select a license holder' : 'লাইসেন্স ধারক নির্বাচন করুন');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if engine number already exists
      const { data: existingVehicle, error: checkError } = await supabase
        .from('vehicles')
        .select('engine_number')
        .eq('engine_number', vehicleForm.engine_number)
        .single();

      if (existingVehicle) {
        toast.error(language === 'en' 
          ? 'This engine number already exists! Each vehicle must be unique.' 
          : 'এই ইঞ্জিন নম্বর ইতিমধ্যে বিদ্যমান! প্রতিটি যানবাহন অনন্য হতে হবে।');
        setIsSubmitting(false);
        return;
      }

      // Add vehicle directly to Supabase (like admin dashboard does)
      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          vehicle_name: vehicleForm.vehicle_name,
          model: vehicleForm.model,
          engine_number: vehicleForm.engine_number,
          engine_cc: parseInt(vehicleForm.engine_cc),
          owner_id: vehicleForm.owner_id,
          license_id: vehicleForm.license_id,
          vehicle_type: vehicleForm.vehicle_type
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notification to user
      const { error: userNotifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: vehicleForm.owner_id,
          recipient_type: 'user',
          title_en: 'Vehicle Added to Your Profile',
          title_bn: 'আপনার প্রোফাইলে যানবাহন যুক্ত হয়েছে',
          message_en: `Your ${vehicleForm.vehicle_type} (${vehicleForm.vehicle_name} ${vehicleForm.model}) has been added to your profile. Engine: ${vehicleForm.engine_number}, CC: ${vehicleForm.engine_cc}`,
          message_bn: `আপনার ${vehicleForm.vehicle_type} (${vehicleForm.vehicle_name} ${vehicleForm.model}) প্রোফাইলে যুক্ত হয়েছে। ইঞ্জিন: ${vehicleForm.engine_number}, সিসি: ${vehicleForm.engine_cc}`,
          notification_type: 'vehicle_added',
          priority: 'normal'
        }]);

      if (userNotifError) {
        console.error('User notification error:', userNotifError);
      } else {
        console.log('✅ User notification sent successfully');
      }

      // Send notification to all admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        console.log(`Sending notifications to ${admins.length} admin(s)`);
        const adminNotifications = admins.map(admin => ({
          user_id: admin.id,
          recipient_type: 'admin',
          title_en: 'New Vehicle Added by Vehicle Adder',
          title_bn: 'যানবাহন সংযোজক দ্বারা নতুন যানবাহন যুক্ত',
          message_en: `A ${vehicleForm.vehicle_type} (${vehicleForm.vehicle_name} ${vehicleForm.model}) has been added. Engine: ${vehicleForm.engine_number}, CC: ${vehicleForm.engine_cc}`,
          message_bn: `একটি ${vehicleForm.vehicle_type} (${vehicleForm.vehicle_name} ${vehicleForm.model}) যুক্ত হয়েছে। ইঞ্জিন: ${vehicleForm.engine_number}, সিসি: ${vehicleForm.engine_cc}`,
          notification_type: 'admin_vehicle_alert',
          priority: 'normal'
        }));
        
        const { error: adminNotifError } = await supabase
          .from('notifications')
          .insert(adminNotifications);

        if (adminNotifError) {
          console.error('Admin notification error:', adminNotifError);
        } else {
          console.log('✅ Admin notifications sent successfully');
        }
      } else {
        console.log('⚠️ No admins found');
      }

      toast.success(language === 'en' ? 'Vehicle added successfully!' : 'যানবাহন সফলভাবে যুক্ত হয়েছে!');
      
      // Reset form
      setVehicleForm({
        vehicle_name: '',
        model: '',
        engine_number: '',
        engine_cc: '',
        owner_id: '',
        license_id: '',
        vehicle_type: 'Bike',
      });
      setSelectedHolder(null);
      setSearchTerm('');
      fetchVehicles(); // Refresh vehicle list
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error(language === 'en' ? 'Failed to add vehicle' : 'যানবাহন যুক্ত করতে ব্যর্থ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    toast.custom((t) => (
      <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => toast.dismiss(t.id)} />
        {/* Dialog */}
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-2xl pointer-events-auto flex flex-col border-2 border-red-500 dark:border-red-600 relative`}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <SignOut size={24} weight="bold" className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {language === 'en' ? 'Confirm Logout' : 'লগআউট নিশ্চিত করুন'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {language === 'en' 
                  ? 'Are you sure you want to logout?' 
                  : 'আপনি কি নিশ্চিত লগআউট করতে চান?'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
              }}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all"
            >
              {language === 'en' ? 'Cancel' : 'বাতিল'}
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const { error } = await signOut();
                if (!error) {
                  toast.success(language === 'en' ? 'Logged out successfully' : 'সফলভাবে লগআউট হয়েছে');
                  navigate('/vehicle-adder-login');
                }
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all"
            >
              {language === 'en' ? 'Logout' : 'লগআউট'}
            </button>
          </div>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const filteredHolders = licenseHolders.filter(holder => 
    (holder.full_name_en?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (holder.full_name_bn?.includes(searchTerm)) ||
    (holder.license_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (holder.license_type?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canAddVehicleType = (vehicleType) => {
    if (!selectedHolder) return false;
    const licenseType = selectedHolder.license_type;
    
    if (vehicleType === 'Bike') {
      return ['Light', 'Light+Motor'].includes(licenseType);
    }
    if (vehicleType === 'Car') {
      return ['Motor', 'Light+Motor'].includes(licenseType);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <img src="/brta.png" alt="BRTA Logo" className="h-12 w-12" />
            <div>
              <h1 className="text-lg font-bold text-primary dark:text-green-400">BRTA 2.0</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'en' ? 'Vehicle Adder' : 'যানবাহন সংযোজক'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('add')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'add'
                ? 'bg-gradient-to-r from-primary to-green-600 text-white shadow-lg'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Plus size={22} weight="duotone" />
            <span className="font-semibold">{language === 'en' ? 'Add Vehicle' : 'যানবাহন যুক্ত করুন'}</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'list'
                ? 'bg-gradient-to-r from-primary to-green-600 text-white shadow-lg'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ListIcon size={22} weight="duotone" />
            <span className="font-semibold">{language === 'en' ? 'Vehicle List' : 'যানবাহন তালিকা'}</span>
          </button>

          <button
            onClick={() => setActiveTab('holders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'holders'
                ? 'bg-gradient-to-r from-primary to-green-600 text-white shadow-lg'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <User size={22} weight="duotone" />
            <span className="font-semibold">{language === 'en' ? 'License Holders' : 'লাইসেন্স ধারক'}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <SignOut size={22} weight="duotone" />
            <span className="font-semibold">{language === 'en' ? 'Logout' : 'লগআউট'}</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-sm sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ListIcon size={24} className="text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex items-center gap-4">
              <ThemeLanguageToggler />
              
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Bell size={24} className="text-gray-600 dark:text-gray-300" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {notifications.filter(n => !n.is_read).length > 99 ? '99+' : notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6">
          <AnimatePresence mode="wait">
            
            {/* Add Vehicle Tab */}
            {activeTab === 'add' && (
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
                  {language === 'en' ? 'Add New Vehicle' : 'নতুন যানবাহন যুক্ত করুন'}
                </h2>

                <form onSubmit={handleAddVehicle} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
                  
                  {/* Select License Holder */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      {language === 'en' ? 'Select License Holder (Owner)' : 'লাইসেন্স ধারক (মালিক) নির্বাচন করুন'}
                    </label>
                    
                    {/* Search Box */}
                    <div className="relative mb-4">
                      <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={language === 'en' ? 'Search by name, license number, or type...' : 'নাম, লাইসেন্স নম্বর, বা ধরন দ্বারা অনুসন্ধান করুন...'}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:text-white"
                      />
                    </div>

                    {/* Holders Grid */}
                    <div className="max-h-64 overflow-y-auto border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gray-50 dark:bg-gray-700/50">
                      {loadingHolders ? (
                        <div className="text-center py-8">
                          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredHolders.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                          {language === 'en' ? 'No license holders found' : 'কোনো লাইসেন্স ধারক পাওয়া যায়নি'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredHolders.map((holder) => (
                            <button
                              key={holder.id}
                              type="button"
                              onClick={() => handleSelectHolder(holder)}
                              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                selectedHolder?.id === holder.id
                                  ? 'border-primary bg-green-50 dark:bg-green-900/20'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-800 dark:text-white">
                                    {language === 'en' ? holder.full_name_en : holder.full_name_bn}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {holder.license_number} • {holder.license_type}
                                  </p>
                                </div>
                                {selectedHolder?.id === holder.id && (
                                  <CheckCircle size={24} weight="fill" className="text-primary" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedHolder && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                          <CheckCircle size={20} weight="fill" />
                          {language === 'en' ? 'Selected:' : 'নির্বাচিত:'} {language === 'en' ? selectedHolder.full_name_en : selectedHolder.full_name_bn}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {language === 'en' ? 'License Type:' : 'লাইসেন্সের ধরন:'} {selectedHolder.license_type}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      {language === 'en' ? 'Vehicle Type' : 'যানবাহনের ধরন'}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setVehicleForm({ ...vehicleForm, vehicle_type: 'Bike' })}
                        disabled={!canAddVehicleType('Bike')}
                        className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                          vehicleForm.vehicle_type === 'Bike'
                            ? 'border-primary bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600'
                        } ${!canAddVehicleType('Bike') ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}
                      >
                        <Bicycle size={48} weight="duotone" className={vehicleForm.vehicle_type === 'Bike' ? 'text-primary' : 'text-gray-400'} />
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {language === 'en' ? 'Bike' : 'বাইক'}
                        </span>
                        {!canAddVehicleType('Bike') && selectedHolder && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {language === 'en' ? 'License not valid for bikes' : 'বাইকের জন্য লাইসেন্স বৈধ নয়'}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setVehicleForm({ ...vehicleForm, vehicle_type: 'Car' })}
                        disabled={!canAddVehicleType('Car')}
                        className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                          vehicleForm.vehicle_type === 'Car'
                            ? 'border-primary bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600'
                        } ${!canAddVehicleType('Car') ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}
                      >
                        <Car size={48} weight="duotone" className={vehicleForm.vehicle_type === 'Car' ? 'text-primary' : 'text-gray-400'} />
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {language === 'en' ? 'Car' : 'গাড়ি'}
                        </span>
                        {!canAddVehicleType('Car') && selectedHolder && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {language === 'en' ? 'License not valid for cars' : 'গাড়ির জন্য লাইসেন্স বৈধ নয়'}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Vehicle Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'en' ? 'Vehicle Name/Brand' : 'যানবাহনের নাম/ব্র্যান্ড'}
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.vehicle_name}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_name: e.target.value })}
                      placeholder={language === 'en' ? 'e.g., Honda, Toyota, Yamaha' : 'যেমন, Honda, Toyota, Yamaha'}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-white"
                      required
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'en' ? 'Model' : 'মডেল'}
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.model}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                      placeholder={language === 'en' ? 'e.g., Civic 2022, CBR 150R' : 'যেমন, Civic 2022, CBR 150R'}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-white"
                      required
                    />
                  </div>

                  {/* Engine Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'en' ? 'Engine Number' : 'ইঞ্জিন নম্বর'}
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.engine_number}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, engine_number: e.target.value.toUpperCase() })}
                      placeholder={language === 'en' ? 'Unique engine number' : 'অনন্য ইঞ্জিন নম্বর'}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-white font-mono"
                      required
                    />
                  </div>

                  {/* Engine CC */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'en' ? 'Engine CC (Cubic Capacity)' : 'ইঞ্জিন CC (ঘন ক্ষমতা)'}
                    </label>
                    <input
                      type="number"
                      value={vehicleForm.engine_cc}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, engine_cc: e.target.value })}
                      placeholder={language === 'en' ? 'e.g., 150, 1500, 2000' : 'যেমন, 150, 1500, 2000'}
                      min="50"
                      max="10000"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-white"
                      required
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {language === 'en' 
                        ? '💡 Bikes: Usually 50-400 CC | Cars: Usually 800-5000 CC' 
                        : '💡 বাইক: সাধারণত ৫০-৪০০ CC | গাড়ি: সাধারণত ৮০০-৫০০০ CC'}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedHolder}
                    className="w-full bg-gradient-to-r from-primary to-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {language === 'en' ? 'Adding Vehicle...' : 'যানবাহন যুক্ত হচ্ছে...'}
                      </>
                    ) : (
                      <>
                        <Plus size={24} weight="bold" />
                        {language === 'en' ? 'Add Vehicle' : 'যানবাহন যুক্ত করুন'}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Vehicle List Tab */}
            {activeTab === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
                  {language === 'en' ? 'All Vehicles' : 'সকল যানবাহন'}
                </h2>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                  {loadingVehicles ? (
                    <div className="text-center py-12">
                      <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div className="text-center py-12">
                      <WarningCircle size={64} className="mx-auto text-gray-400 mb-4" weight="duotone" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {language === 'en' ? 'No vehicles added yet' : 'এখনও কোনো যানবাহন যুক্ত করা হয়নি'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              {language === 'en' ? 'Vehicle' : 'যানবাহন'}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              {language === 'en' ? 'Model' : 'মডেল'}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              {language === 'en' ? 'Engine No.' : 'ইঞ্জিন নং'}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              {language === 'en' ? 'CC' : 'সিসি'}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              {language === 'en' ? 'Owner' : 'মালিক'}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              {language === 'en' ? 'Type' : 'ধরন'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {vehicles.map((vehicle) => (
                            <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-800 dark:text-white">{vehicle.vehicle_name}</p>
                              </td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{vehicle.model}</td>
                              <td className="px-6 py-4">
                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-white">
                                  {vehicle.engine_number}
                                </code>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary rounded font-semibold text-sm">
                                  {vehicle.engine_cc || 'N/A'} CC
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-gray-800 dark:text-white">
                                  {language === 'en' ? vehicle.licenses?.full_name_en : vehicle.licenses?.full_name_bn}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{vehicle.licenses?.license_number}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                                  vehicle.vehicle_type === 'Bike'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                }`}>
                                  {vehicle.vehicle_type === 'Bike' ? (
                                    <Bicycle size={16} weight="duotone" />
                                  ) : (
                                    <Car size={16} weight="duotone" />
                                  )}
                                  {vehicle.vehicle_type}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* License Holders Tab */}
            {activeTab === 'holders' && (
              <motion.div
                key="holders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
                  {language === 'en' ? 'All License Holders' : 'সকল লাইসেন্স ধারক'}
                </h2>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <div className="mb-4">
                    <div className="relative">
                      <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={language === 'en' ? 'Search license holders...' : 'লাইসেন্স ধারক অনুসন্ধান করুন...'}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHolders.map((holder) => (
                      <div key={holder.id} className="p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-primary dark:hover:border-primary/70 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-xl flex items-center justify-center">
                            <IdentificationCard size={24} weight="duotone" className="text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {language === 'en' ? holder.full_name_en : holder.full_name_bn}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{holder.license_number}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-semibold">{language === 'en' ? 'Type:' : 'ধরন:'}</span> {holder.license_type}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-semibold">{language === 'en' ? 'Category:' : 'শ্রেণী:'}</span> {holder.license_category}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  {language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}
                </h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={24} className="text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {language === 'en' ? 'No notifications' : 'কোনো বিজ্ঞপ্তি নেই'}
                  </p>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-xl border-2 ${
                        notification.is_read
                          ? 'border-gray-200 dark:border-gray-700'
                          : 'border-primary/30 dark:border-primary/50 bg-green-50 dark:bg-green-900/20'
                      }`}
                    >
                      <h4 className="font-semibold text-gray-800 dark:text-white mb-1">
                        {language === 'en' ? notification.title_en : notification.title_bn}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'en' ? notification.message_en : notification.message_bn}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VehicleAdderDashboard;
