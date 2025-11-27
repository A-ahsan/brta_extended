import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  FunnelSimple,
  Eye,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const AdminApplications = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, physical_exam
  const [physicalExamBookings, setPhysicalExamBookings] = useState([]);

  useEffect(() => {
    fetchApplications();
    if (activeTab === 'physical_exam') {
      fetchPhysicalExamBookings();
    }
  }, [activeTab]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('license_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error(language === 'en' ? 'Failed to load applications' : 'আবেদন লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhysicalExamBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('physical_exam_bookings')
        .select(`
          *,
          license_applications!inner (
            application_number,
            full_name_en,
            full_name_bn,
            license_type,
            license_category
          ),
          test_centers!inner (
            center_name_en,
            center_name_bn,
            address_en
          )
        `)
        .eq('status', 'scheduled')
        .order('exam_date', { ascending: true });

      if (error) throw error;
      setPhysicalExamBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(language === 'en' ? 'Failed to load bookings' : 'বুকিং লোড করতে ব্যর্থ');
    }
  };

  const handlePhysicalExamResult = async (bookingId, applicationId, result, remarks = '') => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Update booking with result
      const { error: bookingError } = await supabase
        .from('physical_exam_bookings')
        .update({
          status: 'completed',
          result: result,
          admin_remarks: remarks,
          evaluated_by: userData.user.id,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // Update application status
      const updateData = {
        physical_exam: result === 'passed' ? 1 : 0,
        status: result === 'passed' ? 'physical_exam_passed' : 'physical_exam_failed',
      };

      if (result === 'passed') {
        updateData.physical_exam_completed_at = new Date().toISOString();
      }

      const { error: appError } = await supabase
        .from('license_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (appError) throw appError;

      // Send notification to user
      const notificationMessage = result === 'passed'
        ? 'Congratulations! You have passed the physical driving exam.'
        : 'Unfortunately, you did not pass the physical driving exam. Please book again.';

      await supabase.rpc('create_dual_notification', {
        p_user_id: (await supabase.from('license_applications').select('user_id').eq('id', applicationId).single()).data.user_id,
        p_title: result === 'passed' ? 'Physical Exam Passed' : 'Physical Exam Failed',
        p_message: notificationMessage + (remarks ? ` Remarks: ${remarks}` : ''),
        p_admin_title: 'Physical Exam Evaluated',
        p_admin_message: `Physical exam evaluated as ${result} for application.`,
      });

      toast.success(language === 'en' ? `Exam marked as ${result}` : `পরীক্ষা ${result} হিসাবে চিহ্নিত`);
      fetchPhysicalExamBookings();
    } catch (error) {
      console.error('Error updating exam result:', error);
      toast.error(language === 'en' ? 'Failed to update result' : 'ফলাফল আপডেট করতে ব্যর্থ');
    }
  };

  const handleStatusUpdate = async (appId, newStatus) => {
    try {
      const { error } = await supabase
        .from('license_applications')
        .update({ 
          status: newStatus,
          [`${newStatus}_completed_at`]: new Date().toISOString()
        })
        .eq('id', appId);

      if (error) throw error;

      toast.success(language === 'en' ? 'Status updated successfully' : 'স্ট্যাটাস সফলভাবে আপডেট হয়েছে');
      fetchApplications();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(language === 'en' ? 'Failed to update status' : 'স্ট্যাটাস আপডেট করতে ব্যর্থ');
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesType = filterType === 'all' || app.license_type === filterType;
    const matchesSearch = (app.full_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.full_name_bn?.includes(searchTerm) ||
                          app.application_number?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
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
                {language === 'en' ? 'Applications Management' : 'আবেদন পরিচালনা'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'en' ? 'Review and manage license applications' : 'লাইসেন্স আবেদন পর্যালোচনা এবং পরিচালনা করুন'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'en' ? 'Total Applications' : 'মোট আবেদন'}</p>
              <p className="text-3xl font-bold text-blue-600">{applications.length}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                  activeTab === 'all'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 {language === 'en' ? 'All Applications' : 'সকল আবেদন'}
              </button>
              <button
                onClick={() => setActiveTab('physical_exam')}
                className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                  activeTab === 'physical_exam'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🚗 {language === 'en' ? 'Physical Exams' : 'শারীরিক পরীক্ষা'} 
                {physicalExamBookings.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {physicalExamBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          {activeTab === 'all' && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'en' ? 'Search by name or application no...' : 'নাম বা আবেদন নম্বর দিয়ে অনুসন্ধান করুন...'}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <FunnelSimple size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all appearance-none cursor-pointer"
              >
                <option value="all">{language === 'en' ? 'All Types' : 'সকল ধরন'}</option>
                <option value="Light">{language === 'en' ? 'Light (Bike)' : 'লাইট (বাইক)'}</option>
                <option value="Motor">{language === 'en' ? 'Motor (Car)' : 'মোটর (গাড়ি)'}</option>
              </select>
            </div>
          </div>
          )}

          {/* Physical Exam Bookings Table */}
          {activeTab === 'physical_exam' && (
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-100 to-green-50 dark:from-blue-900 dark:to-green-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                      {language === 'en' ? 'App No' : 'আবেদন নং'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                      {language === 'en' ? 'Applicant' : 'আবেদনকারী'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                      {language === 'en' ? 'Test Center' : 'পরীক্ষা কেন্দ্র'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                      {language === 'en' ? 'Date & Time' : 'তারিখ ও সময়'}
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                      {language === 'en' ? 'Actions' : 'কার্যক্রম'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {physicalExamBookings.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                          {language === 'en' ? 'No scheduled physical exams' : 'কোনো নির্ধারিত শারীরিক পরীক্ষা নেই'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    physicalExamBookings.map((booking) => (
                      <motion.tr
                        key={booking.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800 dark:text-white font-mono">
                            {booking.license_applications.application_number}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800 dark:text-white">
                            {language === 'en' 
                              ? booking.license_applications.full_name_en 
                              : booking.license_applications.full_name_bn}
                          </p>
                          <p className="text-xs text-gray-500">
                            {booking.license_applications.license_type} - {booking.license_applications.license_category}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-700 dark:text-gray-300">
                            {language === 'en' 
                              ? booking.test_centers.center_name_en 
                              : booking.test_centers.center_name_bn}
                          </p>
                          <p className="text-xs text-gray-500">{booking.test_centers.address_en}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800 dark:text-white">
                            📅 {new Date(booking.exam_date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD')}
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                            ⏰ 9:00 AM
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-3">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                const remarks = prompt(language === 'en' 
                                  ? 'Add remarks (optional):' 
                                  : 'মন্তব্য যোগ করুন (ঐচ্ছিক):');
                                handlePhysicalExamResult(booking.id, booking.application_id, 'passed', remarks || '');
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                              title={language === 'en' ? 'Mark as Passed' : 'উত্তীর্ণ হিসাবে চিহ্নিত করুন'}
                            >
                              <CheckCircle size={20} weight="bold" />
                              {language === 'en' ? 'Pass' : 'উত্তীর্ণ'}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                const remarks = prompt(language === 'en' 
                                  ? 'Add remarks (required):' 
                                  : 'মন্তব্য যোগ করুন (প্রয়োজনীয়):');
                                if (remarks) {
                                  handlePhysicalExamResult(booking.id, booking.application_id, 'failed', remarks);
                                }
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                              title={language === 'en' ? 'Mark as Failed' : 'ব্যর্থ হিসাবে চিহ্নিত করুন'}
                            >
                              <XCircle size={20} weight="bold" />
                              {language === 'en' ? 'Fail' : 'ব্যর্থ'}
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Results Count */}
          {activeTab === 'all' && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'en' ? 'Showing' : 'দেখানো হচ্ছে'} <span className="font-bold text-primary">{filteredApplications.length}</span> {language === 'en' ? 'of' : 'এর মধ্যে'} <span className="font-bold">{applications.length}</span> {language === 'en' ? 'applications' : 'আবেদন'}
            </p>
            {(searchTerm || filterType !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setFilterType('all'); }}
                className="text-sm text-primary hover:text-primary-dark font-semibold transition-colors"
              >
                {language === 'en' ? 'Clear Filters' : 'ফিল্টার সাফ করুন'}
              </button>
            )}
          </div>
          )}

          {/* Table */}
          {activeTab === 'all' && (
          <div className="overflow-x-auto rounded-xl border-2 border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Application No' : 'আবেদন নং'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Applicant Name' : 'আবেদনকারীর নাম'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Type' : 'ধরন'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Date' : 'তারিখ'}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {language === 'en' ? 'Actions' : 'কার্যক্রম'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Loading applications...' : 'আবেদন লোড হচ্ছে...'}
                      </p>
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        {language === 'en' ? 'No applications found' : 'কোনো আবেদন পাওয়া যায়নি'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app, index) => (
                    <motion.tr
                      key={app.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 dark:text-white font-mono">{app.application_number}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800 dark:text-white">{language === 'en' ? app.full_name_en : app.full_name_bn}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-semibold">
                          {app.license_type} - {app.license_category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(app.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                            title={language === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'}
                          >
                            <Eye size={20} weight="bold" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-success/20 text-success rounded-lg hover:bg-success hover:text-white transition-colors"
                            title={language === 'en' ? 'Approve' : 'অনুমোদন'}
                          >
                            <CheckCircle size={20} weight="bold" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-danger/20 text-danger rounded-lg hover:bg-danger hover:text-white transition-colors"
                            title={language === 'en' ? 'Reject' : 'প্রত্যাখ্যান'}
                          >
                            <XCircle size={20} weight="bold" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(AdminApplications);
