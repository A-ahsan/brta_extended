import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Warning,
  FunnelSimple,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const PoliceRecords = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleRecords, setVehicleRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicleRecords();
  }, []);

  const fetchVehicleRecords = async () => {
    try {
      setLoading(true);
      // Fetch registered vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('registered_vehicles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (vehiclesError) throw vehiclesError;

      // Fetch all licenses
      const { data: allLicenses } = await supabase
        .from('licenses')
        .select('user_id, expiry_date, expired');

      // Fetch all violations
      const { data: allViolations } = await supabase
        .from('traffic_violations')
        .select('vehicle_id, payment_status');

      // Fetch all user profiles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, full_name_bn');

      const data = vehicles;
      let error = null;

      if (error) throw error;

      const processedRecords = (data || []).map(vehicle => {
        // Find user's license
        const userLicense = allLicenses?.find(l => l.user_id === vehicle.user_id);
        // Find vehicle violations
        const vehicleViolations = allViolations?.filter(v => v.vehicle_id === vehicle.id && v.payment_status === 'Unpaid') || [];
        const unpaidFines = vehicleViolations.length;
        // Find owner profile
        const ownerProfile = allProfiles?.find(p => p.id === vehicle.user_id);
        
        let status = 'Valid';
        if (unpaidFines > 0) status = 'Fined';
        else if (userLicense && (new Date(userLicense.expiry_date) < new Date() || userLicense.expired === 1)) status = 'Expired';
        else if (!userLicense) status = 'Expired';

        return {
          id: vehicle.id,
          plate: language === 'en' ? vehicle.registration_plate?.en : vehicle.registration_plate?.bn,
          model: `${vehicle.vehicle_name} ${vehicle.model}`,
          owner: ownerProfile ? (language === 'bn' ? ownerProfile.full_name_bn : ownerProfile.full_name) : vehicle.owner_name_en,
          status: status,
          licenseExpiry: userLicense?.expiry_date || 'N/A',
          fines: unpaidFines,
          insurance: 'Active', // Placeholder since we don't have insurance data
        };
      });

      setVehicleRecords(processedRecords);
    } catch (error) {
      console.error('Error fetching vehicle records:', error);
      toast.error(language === 'en' ? 'Failed to load records' : 'রেকর্ড লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Valid':
        return <CheckCircle size={20} weight="fill" className="text-success" />;
      case 'Expired':
        return <XCircle size={20} weight="fill" className="text-danger" />;
      case 'Fined':
        return <Warning size={20} weight="fill" className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Valid':
        return 'bg-success/20 text-success border-success';
      case 'Expired':
        return 'bg-danger/20 text-danger border-danger';
      case 'Fined':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500';
    }
  };

  const filteredRecords = vehicleRecords.filter(vehicle => {
    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
    const matchesSearch = vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          vehicle.owner.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {language === 'en' ? 'Vehicle Records Database' : 'যানবাহন রেকর্ড ডাটাবেস'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'en' ? 'Search and filter vehicle records across Bangladesh' : 'বাংলাদেশ জুড়ে যানবাহনের রেকর্ড অনুসন্ধান এবং ফিল্টার করুন'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Total Records' : 'মোট রেকর্ড'}</p>
              <p className="text-3xl font-bold text-primary">{vehicleRecords.length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'en' ? 'Search by plate, model, or owner...' : 'প্লেট, মডেল বা মালিক দ্বারা অনুসন্ধান করুন...'}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelSimple size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all appearance-none cursor-pointer"
              >
                <option value="all">{language === 'en' ? 'All Status' : 'সকল অবস্থা'}</option>
                <option value="Valid">{language === 'en' ? 'Valid' : 'বৈধ'}</option>
                <option value="Expired">{language === 'en' ? 'Expired' : 'মেয়াদ শেষ'}</option>
                <option value="Fined">{language === 'en' ? 'Fined' : 'জরিমানাকৃত'}</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'en' ? 'Showing' : 'দেখানো হচ্ছে'} <span className="font-bold text-primary">{filteredRecords.length}</span> {language === 'en' ? 'of' : 'এর মধ্যে'} <span className="font-bold">{vehicleRecords.length}</span> {language === 'en' ? 'records' : 'রেকর্ড'}
            </p>
            {(searchTerm || filterStatus !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                className="text-sm text-primary hover:text-primary-dark font-semibold transition-colors"
              >
                {language === 'en' ? 'Clear Filters' : 'ফিল্টার সাফ করুন'}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-gray-200 dark:border-gray-700">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {language === 'en' ? 'Plate Number' : 'প্লেট নম্বর'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {language === 'en' ? 'Model' : 'মডেল'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {language === 'en' ? 'Owner' : 'মালিক'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {language === 'en' ? 'Expiry' : 'মেয়াদ'}
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {language === 'en' ? 'Status' : 'অবস্থা'}
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {language === 'en' ? 'Fines' : 'জরিমানা'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                          {language === 'en' ? 'No records found' : 'কোনো রেকর্ড পাওয়া যায়নি'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((vehicle, index) => (
                      <motion.tr
                        key={vehicle.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800 dark:text-white">{vehicle.plate}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-700 dark:text-gray-300">{vehicle.model}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600 dark:text-gray-400">{vehicle.owner}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.licenseExpiry}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {getStatusIcon(vehicle.status)}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(vehicle.status)}`}>
                              {t[vehicle.status.toLowerCase()] || vehicle.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${vehicle.fines > 0 ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                            {vehicle.fines}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(PoliceRecords);
