import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarBlank,
  MapPin,
  Users,
  CheckCircle,
  Download,
  Eye,
  X,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const AdminSlots = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [testCenters, setTestCenters] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailedBookings, setDetailedBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTestCenters();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchBookingsForDate();
    }
  }, [selectedDate]);

  const fetchTestCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('test_centers')
        .select('*')
        .eq('is_active', true)
        .order('center_name_en');

      if (error) throw error;
      setTestCenters(data || []);
    } catch (error) {
      console.error('Error fetching test centers:', error);
      toast.error('Failed to load test centers');
    }
  };

  const fetchBookingsForDate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('physical_exam_bookings')
        .select(`
          id,
          test_center_id,
          exam_date,
          license_applications(
            id,
            application_number,
            full_name_en,
            full_name_bn,
            nid_number
          )
        `)
        .eq('exam_date', selectedDate)
        .eq('status', 'scheduled');

      if (error) throw error;
      setBookingsData(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getCenterStats = (centerId) => {
    const center = testCenters.find(c => c.id === centerId);
    const centerCapacity = center?.daily_capacity || 50;
    const bookings = bookingsData.filter(b => b.test_center_id === centerId);
    const booked = bookings.length;
    const available = centerCapacity - booked;
    const rushLevel = booked / centerCapacity;

    return {
      total: centerCapacity,
      booked,
      available,
      rushLevel,
      bookings,
      percentageFilled: ((booked / centerCapacity) * 100).toFixed(1),
      isFull: available === 0
    };
  };

  const getRushColor = (rushLevel) => {
    if (rushLevel >= 0.8) return 'from-red-500 to-red-600';
    if (rushLevel >= 0.5) return 'from-yellow-500 to-yellow-600';
    return 'from-primary to-green-600';
  };

  const getRushLabel = (rushLevel) => {
    if (rushLevel >= 0.8) return language === 'en' ? 'High Rush' : 'উচ্চ চাপ';
    if (rushLevel >= 0.5) return language === 'en' ? 'Medium Rush' : 'মধ্যম চাপ';
    return language === 'en' ? 'Low Rush' : 'কম চাপ';
  };

  const handleViewDetails = async (center) => {
    setSelectedCenter(center);
    const stats = getCenterStats(center.id);
    
    // Fetch detailed booking info
    try {
      const { data, error } = await supabase
        .from('physical_exam_bookings')
        .select(`
          id,
          exam_date,
          created_at,
          license_applications(
            application_number,
            full_name_en,
            full_name_bn,
            nid_number,
            date_of_birth
          )
        `)
        .eq('test_center_id', center.id)
        .eq('exam_date', selectedDate)
        .eq('status', 'scheduled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDetailedBookings(data || []);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching detailed bookings:', error);
      toast.error('Failed to load booking details');
    }
  };

  const handleExportCSV = () => {
    if (!detailedBookings.length) return;
    
    const csv = [
      ['Application No', 'Name (EN)', 'Name (BN)', 'NID', 'DOB', 'Booking Date'],
      ...detailedBookings.map(b => [
        b.license_applications?.application_number || 'N/A',
        b.license_applications?.full_name_en || 'N/A',
        b.license_applications?.full_name_bn || 'N/A',
        b.license_applications?.nid_number || 'N/A',
        b.license_applications?.date_of_birth || 'N/A',
        new Date(b.created_at).toLocaleDateString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCenter?.center_name_en}_${selectedDate}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const filteredBookings = detailedBookings.filter(b => {
    const search = searchTerm.toLowerCase();
    return (
      b.license_applications?.application_number?.toLowerCase().includes(search) ||
      b.license_applications?.full_name_en?.toLowerCase().includes(search) ||
      b.license_applications?.full_name_bn?.includes(search) ||
      b.license_applications?.nid_number?.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {language === 'en' ? 'Physical Exam Slots' : 'শারীরিক পরীক্ষা স্লট'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'en' ? 'View bookings by date and test center' : 'তারিখ এবং পরীক্ষা কেন্দ্র অনুযায়ী বুকিং দেখুন'}
              </p>
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => changeDate(-1)}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <CaretLeft size={20} weight="bold" />
              </motion.button>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg">
                <CalendarBlank size={20} weight="bold" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-white font-bold cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => changeDate(1)}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <CaretRight size={20} weight="bold" />
              </motion.button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testCenters.map((center, index) => {
                const stats = getCenterStats(center.id);
                const rushLevel = stats.rushLevel;

                return (
                  <motion.div
                    key={center.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-2xl transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin size={20} weight="fill" className="text-primary" />
                          <h4 className="font-bold text-lg text-gray-800 dark:text-white line-clamp-1">
                            {language === 'en' ? center.center_name_en : center.center_name_bn}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {language === 'en' ? center.address_en : center.address_bn}
                        </p>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users size={24} weight="duotone" className="text-primary" />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {language === 'en' ? 'Capacity' : 'ধারণক্ষমতা'}
                        </span>
                        <span className="font-bold text-lg text-gray-800 dark:text-white">
                          {stats.booked}/{stats.total}
                          {stats.isFull && (
                            <span className="ml-2 text-xs px-2 py-1 bg-red-500 text-white rounded-full">
                              {language === 'en' ? 'FULL' : 'পূর্ণ'}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {language === 'en' ? 'Booked' : 'বুক করা হয়েছে'}
                        </span>
                        <span className="font-bold text-lg text-yellow-600 dark:text-yellow-400">{stats.booked}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {language === 'en' ? 'Available' : 'উপলব্ধ'}
                        </span>
                        <span className={`font-bold text-lg ${stats.isFull ? 'text-red-600' : 'text-success dark:text-green-400'}`}>
                          {stats.available}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <span>{getRushLabel(rushLevel)}</span>
                        <span>{stats.percentageFilled}%</span>
                      </div>
                      <div className="relative bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rushLevel * 100}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className={`h-full rounded-full bg-gradient-to-r ${getRushColor(rushLevel)}`}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleViewDetails(center)}
                      disabled={stats.booked === 0}
                      className="w-full px-4 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Eye size={18} weight="bold" />
                      {language === 'en' ? `View Details (${stats.booked})` : `বিস্তারিত দেখুন (${stats.booked})`}
                    </motion.button>

                    {/* Alert for high rush or full */}
                    {stats.isFull ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                      >
                        <p className="text-xs text-red-700 dark:text-red-400 font-semibold text-center">
                          {language === 'en' ? '🚫 FULLY BOOKED - No slots available' : '🚫 সম্পূর্ণ বুক - কোন স্লট নেই'}
                        </p>
                      </motion.div>
                    ) : rushLevel >= 0.8 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                      >
                        <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold text-center">
                          {language === 'en' ? '⚠️ High Rush - Nearly Full' : '⚠️ উচ্চ চাপ - প্রায় পূর্ণ'}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedCenter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-green-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">
                      {language === 'en' ? selectedCenter.center_name_en : selectedCenter.center_name_bn}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {language === 'en' ? `Bookings for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : `${new Date(selectedDate).toLocaleDateString('bn-BD')} এর বুকিং`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleExportCSV}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <Download size={20} weight="bold" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowDetailsModal(false)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <X size={20} weight="bold" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={language === 'en' ? 'Search by name, NID, or application number...' : 'নাম, NID, বা আবেদন নম্বর দিয়ে খুঁজুন...'}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Bookings List */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm ? (language === 'en' ? 'No matching bookings found' : 'কোন মিল পাওয়া যায়নি') : (language === 'en' ? 'No bookings for this date' : 'এই তারিখের কোন বুকিং নেই')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBookings.map((booking, idx) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {language === 'en' ? 'Application No' : 'আবেদন নং'}
                              </p>
                              <p className="font-bold text-gray-800 dark:text-white">
                                {booking.license_applications?.application_number || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {language === 'en' ? 'Name' : 'নাম'}
                              </p>
                              <p className="font-semibold text-gray-800 dark:text-white">
                                {language === 'en' ? booking.license_applications?.full_name_en : booking.license_applications?.full_name_bn || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">NID</p>
                              <p className="font-semibold text-gray-800 dark:text-white">
                                {booking.license_applications?.nid_number || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {language === 'en' ? 'Booked On' : 'বুক করা হয়েছে'}
                              </p>
                              <p className="font-semibold text-gray-800 dark:text-white">
                                {new Date(booking.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="ml-4">
                            <CheckCircle size={24} weight="fill" className="text-green-500" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'en' ? `Showing ${filteredBookings.length} of ${detailedBookings.length} bookings` : `${detailedBookings.length} টির মধ্যে ${filteredBookings.length} টি দেখানো হচ্ছে`}
                  </p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {language === 'en' ? 'Exam Time: 9:00 AM' : 'পরীক্ষার সময়: সকাল ৯:০০'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(AdminSlots);
