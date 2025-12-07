import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, MagnifyingGlass, FunnelSimple } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import RoutePermitModal from '../components/RoutePermitModal';
import RoutePermitCard from '../components/RoutePermitCard';

export default function UserRoutePermits() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEnglish = language === 'en';

  const [permits, setPermits] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, pending, rejected, expired
  const [selectedPermit, setSelectedPermit] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchPermits();
    }
  }, [user]);

  const fetchPermits = async () => {
    setLoading(true);
    try {
      // Fetch route permits
      const { data: permitsData, error: permitsError } = await supabase
        .from('route_permits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (permitsError) throw permitsError;

      // Fetch vehicles for permits
      const vehicleIds = [...new Set(permitsData.map(p => p.vehicle_id))];
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('registered_vehicles')
        .select('*')
        .in('id', vehicleIds);

      if (vehiclesError) throw vehiclesError;

      // Create vehicle lookup map
      const vehicleMap = {};
      vehiclesData.forEach(v => {
        vehicleMap[v.id] = v;
      });

      setPermits(permitsData || []);
      setVehicles(vehicleMap);
    } catch (error) {
      console.error('Error fetching permits:', error);
      toast.error(isEnglish ? 'Failed to load permits' : 'পারমিট লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (url) => {
    window.open(url, '_blank');
  };

  const filteredPermits = permits.filter(permit => {
    // Filter by status
    if (filter !== 'all') {
      if (filter === 'active' && permit.status !== 'approved') return false;
      if (filter !== 'active' && permit.status !== filter) return false;
    }

    // Search by permit number or route
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        permit.permit_number.toLowerCase().includes(term) ||
        permit.route_from_en.toLowerCase().includes(term) ||
        permit.route_to_en.toLowerCase().includes(term) ||
        permit.route_from_bn.includes(term) ||
        permit.route_to_bn.includes(term)
      );
    }

    return true;
  });

  const text = {
    title: isEnglish ? 'My Route Permits' : 'আমার রুট পারমিট',
    subtitle: isEnglish ? 'Manage your route permits and applications' : 'আপনার রুট পারমিট এবং আবেদন পরিচালনা করুন',
    applyNew: isEnglish ? 'Apply for Route Permit' : 'রুট পারমিটের জন্য আবেদন করুন',
    search: isEnglish ? 'Search permits...' : 'পারমিট অনুসন্ধান করুন...',
    filterAll: isEnglish ? 'All' : 'সব',
    filterActive: isEnglish ? 'Active' : 'সক্রিয়',
    filterPending: isEnglish ? 'Pending' : 'মুলতুবি',
    filterRejected: isEnglish ? 'Rejected' : 'প্রত্যাখ্যাত',
    filterExpired: isEnglish ? 'Expired' : 'মেয়াদোত্তীর্ণ',
    noPermits: isEnglish ? 'No route permits found' : 'কোনো রুট পারমিট পাওয়া যায়নি',
    noPermitsDesc: isEnglish 
      ? 'You haven\'t applied for any route permits yet. Click the button above to apply for your first permit.'
      : 'আপনি এখনও কোনো রুট পারমিটের জন্য আবেদন করেননি। আপনার প্রথম পারমিটের জন্য আবেদন করতে উপরের বোতামে ক্লিক করুন।',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MapPin size={36} weight="duotone" className="text-primary" />
            {text.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{text.subtitle}</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Plus size={24} weight="bold" />
          {text.applyNew}
        </motion.button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlass
            size={20}
            weight="bold"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder={text.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'pending', 'rejected', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                filter === f
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {text[`filter${f.charAt(0).toUpperCase() + f.slice(1)}`]}
            </button>
          ))}
        </div>
      </div>

      {/* Permits List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      ) : filteredPermits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-2xl"
        >
          <MapPin size={80} weight="duotone" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {text.noPermits}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {text.noPermitsDesc}
          </p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredPermits.map((permit, index) => (
            <motion.div
              key={permit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <RoutePermitCard
                permit={permit}
                vehicle={vehicles[permit.vehicle_id]}
                onViewDocument={handleViewDocument}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Route Permit Application Modal */}
      <RoutePermitModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        user={user}
        onSuccess={() => {
          fetchPermits();
          setShowModal(false);
        }}
      />
    </div>
  );
}
