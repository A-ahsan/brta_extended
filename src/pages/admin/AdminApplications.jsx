import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  FunnelSimple,
  Eye,
  X,
  Calendar,
  User,
  IdentificationCard,
  MapPin,
  Phone,
  Heart,
  GenderMale,
  GenderFemale,
  Check,
  Clock,
  CreditCard,
  UserCircle,
  Car,
  FileText,
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
  const [activeTab, setActiveTab] = useState('all');
  const [physicalExamBookings, setPhysicalExamBookings] = useState([]);
  const [remarksModal, setRemarksModal] = useState({ open: false, booking: null, result: '', remarks: '' });
  const [examSearchTerm, setExamSearchTerm] = useState('');
  const [examDateFilter, setExamDateFilter] = useState('');
  const [detailsModal, setDetailsModal] = useState({ open: false, application: null });

  useEffect(() => {
    fetchApplications();
    if (activeTab === 'physical_exam') {
      fetchPhysicalExamBookings();
    }

    // Subscribe to realtime updates for applications
    const applicationsChannel = supabase
      .channel('admin-applications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'license_applications'
        },
        (payload) => {
          console.log('📋 Admin applications update:', payload);
          fetchApplications();
        }
      )
      .subscribe((status) => {
        console.log('Admin applications subscription status:', status);
      });

    // Subscribe to realtime updates for physical exam bookings
    const bookingsChannel = supabase
      .channel('admin-exam-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'physical_exam_bookings'
        },
        (payload) => {
          console.log('🚗 Admin exam bookings update:', payload);
          if (activeTab === 'physical_exam') {
            fetchPhysicalExamBookings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(bookingsChannel);
    };
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
            license_category,
            user_id
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

  const handlePhysicalExamResult = async (booking, result, remarks = '') => {
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
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Update application status
      const updateData = {
        physical_exam: result === 'passed' ? 1 : 0,
        status: result === 'passed' ? 'physical_exam_passed' : 'physical_exam_pending',
      };

      if (result === 'passed') {
        updateData.physical_exam_completed_at = new Date().toISOString();
      }

      const { error: appError } = await supabase
        .from('license_applications')
        .update(updateData)
        .eq('id', booking.application_id);

      if (appError) throw appError;

      // Bilingual notification messages for user (no DL info)
      const userTitleEn = result === 'passed' ? 'Physical Exam Passed ✅' : 'Physical Exam Failed ❌';
      const userTitleBn = result === 'passed' ? ' পরীক্ষা উত্তীর্ণ ✅' : ' পরীক্ষা ব্যর্থ ❌';
      const userMsgEn = result === 'passed'
        ? `Congratulations! You have passed the physical driving exam.${remarks ? ' Remarks: ' + remarks : ''}`
        : `Unfortunately, you did not pass the physical driving exam. Please book again.${remarks ? ' Remarks: ' + remarks : ''}`;
      const userMsgBn = result === 'passed'
        ? `অভিনন্দন! আপনি  ড্রাইভিং পরীক্ষায় উত্তীর্ণ হয়েছেন।${remarks ? ' মন্তব্য: ' + remarks : ''}`
        : `দুঃখিত, আপনি  ড্রাইভিং পরীক্ষায় উত্তীর্ণ হননি। অনুগ্রহ করে আবার বুক করুন।${remarks ? ' মন্তব্য: ' + remarks : ''}`;

      // Admin notification with DL info
      const dlInfo = `DL: ${booking.license_applications.application_number} (${booking.license_applications.license_type} - ${booking.license_applications.license_category})`;
      const adminTitleEn = 'Physical Exam Evaluated 📋';
      const adminTitleBn = ' পরীক্ষা মূল্যায়ন 📋';
      const adminMsgEn = `Physical exam ${result} for ${booking.license_applications.full_name_en}. ${dlInfo}`;
      const adminMsgBn = `${booking.license_applications.full_name_bn} এর  পরীক্ষা ${result === 'passed' ? 'উত্তীর্ণ' : 'ব্যর্থ'}। ${dlInfo}`;

      // Send bilingual notifications
      await supabase.rpc('create_dual_notification', {
        p_user_id: booking.license_applications.user_id,
        p_title_en: userTitleEn,
        p_title_bn: userTitleBn,
        p_message_en: userMsgEn,
        p_message_bn: userMsgBn,
        p_type: 'exam',
        p_application_id: booking.application_id,
        p_action_url: null,
        p_admin_title_en: adminTitleEn,
        p_admin_title_bn: adminTitleBn,
        p_admin_message_en: adminMsgEn,
        p_admin_message_bn: adminMsgBn
      });

      toast.success(language === 'en' ? `Exam marked as ${result}` : `পরীক্ষা ${result === 'passed' ? 'উত্তীর্ণ' : 'ব্যর্থ'} হিসাবে চিহ্নিত`);
      fetchPhysicalExamBookings();
      setRemarksModal({ open: false, booking: null, result: '', remarks: '' });
    } catch (error) {
      console.error('Error updating exam result:', error);
      toast.error(language === 'en' ? 'Failed to update result' : 'ফলাফল আপডেট করতে ব্যর্থ');
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesType = filterType === 'all' || app.license_type === filterType;
    const matchesSearch = (app.full_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.full_name_bn?.includes(searchTerm) ||
                          app.application_number?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const filteredExamBookings = physicalExamBookings.filter(booking => {
    const nameMatch = (booking.license_applications.full_name_en?.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
      booking.license_applications.full_name_bn?.includes(examSearchTerm) ||
      booking.license_applications.application_number?.toLowerCase().includes(examSearchTerm.toLowerCase()));
    const dateMatch = !examDateFilter || booking.exam_date === examDateFilter;
    return nameMatch && dateMatch;
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
                {language === 'en' 
                  ? 'Monitor automated license applications and approve physical driving test results' 
                  : 'স্বয়ংক্রিয় লাইসেন্স আবেদন পর্যবেক্ষণ করুন এবং  ড্রাইভিং পরীক্ষার ফলাফল অনুমোদন করুন'}
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
                🚗 {language === 'en' ? 'Physical Exams' : 'ড্রাইভিং পরীক্ষা'} 
                {physicalExamBookings.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {physicalExamBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filters for All Applications */}
          {activeTab === 'all' && (
            <div className="grid md:grid-cols-2 gap-4 mb-6">
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

          {/* Filters for Physical Exams */}
          {activeTab === 'physical_exam' && (
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={examSearchTerm}
                  onChange={(e) => setExamSearchTerm(e.target.value)}
                  placeholder={language === 'en' ? 'Search by name or app no...' : 'নাম বা আবেদন নম্বর দিয়ে অনুসন্ধান করুন...'}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={examDateFilter}
                  onChange={e => setExamDateFilter(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white transition-all"
                />
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
                  {filteredExamBookings.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                          {language === 'en' ? 'No scheduled physical exams' : 'কোনো নির্ধারিত ড্রাইভিং পরীক্ষা নেই'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredExamBookings.map((booking) => (
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
                              onClick={() => setRemarksModal({ open: true, booking, result: 'passed', remarks: '' })}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                              title={language === 'en' ? 'Mark as Passed' : 'উত্তীর্ণ হিসাবে চিহ্নিত করুন'}
                            >
                              <CheckCircle size={20} weight="bold" />
                              {language === 'en' ? 'Pass' : 'উত্তীর্ণ'}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setRemarksModal({ open: true, booking, result: 'failed', remarks: '' })}
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

          {/* Results Count for All Applications */}
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

          {/* All Applications Table */}
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
                      {language === 'en' ? 'Status' : 'স্ট্যাটাস'}
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
                          <div className="flex flex-col gap-1">
                            {/* Status Badge */}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 w-fit ${
                              app.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              app.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              app.status === 'physical_exam_passed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              app.status === 'online_exam_passed' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                              app.status === 'face_verified' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' :
                              'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            }`}>
                              {app.status === 'approved' && <CheckCircle size={14} weight="fill" />}
                              {app.status === 'rejected' && <XCircle size={14} weight="fill" />}
                              {app.status === 'physical_exam_passed' && <Car size={14} weight="fill" />}
                              {app.status === 'online_exam_passed' && <FileText size={14} weight="fill" />}
                              {app.status === 'face_verified' && <UserCircle size={14} weight="fill" />}
                              {!['approved', 'rejected', 'physical_exam_passed', 'online_exam_passed', 'face_verified'].includes(app.status) && <Clock size={14} weight="fill" />}
                              {language === 'en' ? app.status.replace(/_/g, ' ').toUpperCase() : 
                                app.status === 'pending' ? 'অপেক্ষমান' :
                                app.status === 'face_verified' ? 'মুখ যাচাই সম্পন্ন' :
                                app.status === 'online_exam_passed' ? 'অনলাইন পরীক্ষা উত্তীর্ণ' :
                                app.status === 'physical_exam_passed' ? 'ড্রাইভিং পরীক্ষা উত্তীর্ণ' :
                                app.status === 'approved' ? 'অনুমোদিত' :
                                app.status === 'rejected' ? 'প্রত্যাখ্যাত' : app.status
                              }
                            </span>
                            {/* Progress Indicators */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`flex items-center gap-0.5 ${app.face_verification === 1 ? 'text-green-600' : 'text-gray-400'}`} title="Face Verification">
                                <UserCircle size={16} weight={app.face_verification === 1 ? 'fill' : 'regular'} />
                                {app.face_verification === 1 ? <Check size={12} weight="bold" /> : <Clock size={12} />}
                              </span>
                              <span className={`flex items-center gap-0.5 ${app.online_exam === 1 ? 'text-green-600' : 'text-gray-400'}`} title="Online Exam">
                                <FileText size={16} weight={app.online_exam === 1 ? 'fill' : 'regular'} />
                                {app.online_exam === 1 ? <Check size={12} weight="bold" /> : <Clock size={12} />}
                              </span>
                              <span className={`flex items-center gap-0.5 ${app.physical_exam === 1 ? 'text-green-600' : 'text-gray-400'}`} title="Physical Exam">
                                <Car size={16} weight={app.physical_exam === 1 ? 'fill' : 'regular'} />
                                {app.physical_exam === 1 ? <Check size={12} weight="bold" /> : <Clock size={12} />}
                              </span>
                              <span className={`flex items-center gap-0.5 ${app.payment === 1 ? 'text-green-600' : 'text-gray-400'}`} title="Payment">
                                <CreditCard size={16} weight={app.payment === 1 ? 'fill' : 'regular'} />
                                {app.payment === 1 ? <Check size={12} weight="bold" /> : <Clock size={12} />}
                              </span>
                            </div>
                          </div>
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
                              onClick={() => setDetailsModal({ open: true, application: app })}
                              className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                              title={language === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'}
                            >
                              <Eye size={20} weight="bold" />
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

      {/* Remarks Modal - Rendered at Root Level */}
      <Modal
        isOpen={remarksModal.open}
        onRequestClose={() => setRemarksModal({ open: false, booking: null, result: '', remarks: '' })}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
        ariaHideApp={false}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto"
        >
          <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
            {remarksModal.result === 'passed' ? '✅' : '❌'}
            {remarksModal.result === 'passed'
              ? (language === 'en' ? 'Add Remarks (Optional)' : 'মন্তব্য যোগ করুন (ঐচ্ছিক)')
              : (language === 'en' ? 'Add Remarks (Required)' : 'মন্তব্য যোগ করুন (প্রয়োজনীয়)')}
          </h3>
          <textarea
            className="w-full h-32 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white mb-6 resize-none"
            placeholder={language === 'en' ? 'Enter your remarks here...' : 'এখানে আপনার মন্তব্য লিখুন...'}
            value={remarksModal.remarks}
            onChange={e => setRemarksModal({ ...remarksModal, remarks: e.target.value })}
          />
          <div className="flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              onClick={() => setRemarksModal({ open: false, booking: null, result: '', remarks: '' })}
            >
              {language === 'en' ? 'Cancel' : 'বাতিল'}
            </motion.button>
            <motion.button
              whileHover={{ scale: remarksModal.result === 'failed' && !remarksModal.remarks.trim() ? 1 : 1.05 }}
              whileTap={{ scale: remarksModal.result === 'failed' && !remarksModal.remarks.trim() ? 1 : 0.95 }}
              className={`px-6 py-2.5 rounded-lg font-semibold transition ${
                remarksModal.result === 'failed' && !remarksModal.remarks.trim() 
                  ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed' 
                  : 'bg-primary text-white hover:bg-primary-dark shadow-lg'
              }`}
              disabled={remarksModal.result === 'failed' && !remarksModal.remarks.trim()}
              onClick={() => handlePhysicalExamResult(remarksModal.booking, remarksModal.result, remarksModal.remarks)}
            >
              {language === 'en' ? 'Submit' : 'জমা দিন'}
            </motion.button>
          </div>
        </motion.div>
      </Modal>

      {/* Application Details Modal */}
      <Modal
        isOpen={detailsModal.open}
        onRequestClose={() => setDetailsModal({ open: false, application: null })}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
        ariaHideApp={false}
      >
        {detailsModal.application && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl mx-auto max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-primary to-green-600 p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IdentificationCard size={32} weight="duotone" className="text-white" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {language === 'en' ? 'Application Details' : 'আবেদনের বিস্তারিত'}
                    </h3>
                    <p className="text-white/80 font-mono text-sm">{detailsModal.application.application_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailsModal({ open: false, application: null })}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} weight="bold" className="text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {/* Progress Timeline */}
              <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-8 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <Clock size={28} weight="duotone" className="text-primary" />
                  {language === 'en' ? 'Application Progress' : 'আবেদনের অগ্রগতি'}
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className={`p-6 rounded-lg text-center transition-all ${
                    detailsModal.application.face_verification === 1 
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                  }`}>
                    <User size={40} weight="duotone" className={`mx-auto mb-3 ${
                      detailsModal.application.face_verification === 1 ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="font-semibold text-base mb-2">
                      {language === 'en' ? 'Face Verify' : 'মুখ যাচাই'}
                    </div>
                    <div className="text-xs mt-2">
                      {detailsModal.application.face_verification === 1 
                        ? <Check size={24} weight="bold" className="text-green-600 mx-auto" />
                        : <Clock size={24} className="text-gray-400 mx-auto" />}
                    </div>
                  </div>
                  <div className={`p-6 rounded-lg text-center transition-all ${
                    detailsModal.application.online_exam === 1 
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                  }`}>
                    <CheckCircle size={40} weight="duotone" className={`mx-auto mb-3 ${
                      detailsModal.application.online_exam === 1 ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="font-semibold text-base mb-2">
                      {language === 'en' ? 'Online Exam' : 'অনলাইন পরীক্ষা'}
                    </div>
                    <div className="text-xs mt-2">
                      {detailsModal.application.online_exam === 1 
                        ? <Check size={24} weight="bold" className="text-green-600 mx-auto" />
                        : <Clock size={24} className="text-gray-400 mx-auto" />}
                    </div>
                  </div>
                  <div className={`p-6 rounded-lg text-center transition-all ${
                    detailsModal.application.physical_exam === 1 
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                  }`}>
                    <IdentificationCard size={40} weight="duotone" className={`mx-auto mb-3 ${
                      detailsModal.application.physical_exam === 1 ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="font-semibold text-base mb-2">
                      {language === 'en' ? 'Physical Test' : 'ড্রাইভিং পরীক্ষা'}
                    </div>
                    <div className="text-xs mt-2">
                      {detailsModal.application.physical_exam === 1 
                        ? <Check size={24} weight="bold" className="text-green-600 mx-auto" />
                        : <Clock size={24} className="text-gray-400 mx-auto" />}
                    </div>
                  </div>
                  <div className={`p-6 rounded-lg text-center transition-all ${
                    detailsModal.application.payment === 1 
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                  }`}>
                    <CheckCircle size={40} weight="duotone" className={`mx-auto mb-3 ${
                      detailsModal.application.payment === 1 ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="font-semibold text-base mb-2">
                      {language === 'en' ? 'Payment' : 'পেমেন্ট'}
                    </div>
                    <div className="text-xs mt-2">
                      {detailsModal.application.payment === 1 
                        ? <Check size={24} weight="bold" className="text-green-600 mx-auto" />
                        : <Clock size={24} className="text-gray-400 mx-auto" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-8 rounded-xl">
                <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <User size={28} weight="duotone" className="text-primary" />
                  {language === 'en' ? 'Personal Information' : 'ব্যক্তিগত তথ্য'}
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {language === 'en' ? 'Full Name (English)' : 'পুরো নাম (ইংরেজি)'}
                    </label>
                    <p className="font-bold text-gray-800 dark:text-white text-lg">{detailsModal.application.full_name_en}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {language === 'en' ? 'Full Name (Bengali)' : 'পুরো নাম (বাংলা)'}
                    </label>
                    <p className="font-bold text-gray-800 dark:text-white text-lg">{detailsModal.application.full_name_bn}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {language === 'en' ? 'Father\'s Name' : 'পিতার নাম'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white">{detailsModal.application.father_name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {language === 'en' ? 'Mother\'s Name' : 'মাতার নাম'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white">{detailsModal.application.mother_name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 tracking-wide">
                      <Calendar size={14} /> {language === 'en' ? 'Date of Birth' : 'জন্ম তারিখ'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {new Date(detailsModal.application.date_of_birth).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 tracking-wide">
                      {detailsModal.application.gender === 'Male' ? <GenderMale size={14} /> : <GenderFemale size={14} />}
                      {language === 'en' ? 'Gender' : 'লিঙ্গ'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white">{detailsModal.application.gender}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 tracking-wide">
                      <Heart size={14} /> {language === 'en' ? 'Blood Group' : 'রক্তের গ্রুপ'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white">{detailsModal.application.blood_group}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 tracking-wide">
                      <IdentificationCard size={14} /> {language === 'en' ? 'NID Number' : 'এনআইডি নম্বর'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white font-mono">{detailsModal.application.nid_number}</p>
                  </div>
                </div>
              </div>

              {/* License Information */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border-2 border-yellow-200 dark:border-yellow-800">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                  {language === 'en' ? 'License Information' : 'লাইসেন্স তথ্য'}
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {language === 'en' ? 'License Type' : 'লাইসেন্সের ধরন'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white text-lg">{detailsModal.application.license_type}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {language === 'en' ? 'Category' : 'ক্যাটাগরি'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white text-lg">{detailsModal.application.license_category}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin size={24} weight="duotone" className="text-primary" />
                  {language === 'en' ? 'Address' : 'ঠিকানা'}
                </h4>
                <div className="grid md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {language === 'en' ? 'Division' : 'বিভাগ'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white">{detailsModal.application.division}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {language === 'en' ? 'District' : 'জেলা'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white">{detailsModal.application.district}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {language === 'en' ? 'Upazila' : 'উপজেলা'}
                    </label>
                    <p className="font-semibold text-gray-800 dark:text-white">{detailsModal.application.upazila}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'en' ? 'Full Address' : 'সম্পূর্ণ ঠিকানা'}
                  </label>
                  <p className="font-semibold text-gray-800 dark:text-white">{detailsModal.application.address}</p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar size={24} weight="duotone" className="text-primary" />
                  {language === 'en' ? 'Timeline' : 'সময়রেখা'}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      {language === 'en' ? 'Submitted:' : 'জমা দেওয়া:'}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {new Date(detailsModal.application.submitted_at).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')}
                    </span>
                  </div>
                  {detailsModal.application.face_verified_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Face Verified:' : 'মুখ যাচাই:'}
                      </span>
                      <span className="font-semibold text-green-600">
                        {new Date(detailsModal.application.face_verified_at).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')}
                      </span>
                    </div>
                  )}
                  {detailsModal.application.online_exam_completed_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Online Exam:' : 'অনলাইন পরীক্ষা:'}
                      </span>
                      <span className="font-semibold text-green-600">
                        {new Date(detailsModal.application.online_exam_completed_at).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')}
                      </span>
                    </div>
                  )}
                  {detailsModal.application.physical_exam_completed_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Physical Exam:' : 'শারীরিক পরীক্ষা:'}
                      </span>
                      <span className="font-semibold text-green-600">
                        {new Date(detailsModal.application.physical_exam_completed_at).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')}
                      </span>
                    </div>
                  )}
                  {detailsModal.application.payment_completed_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Payment:' : 'পেমেন্ট:'}
                      </span>
                      <span className="font-semibold text-green-600">
                        {new Date(detailsModal.application.payment_completed_at).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDetailsModal({ open: false, application: null })}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {language === 'en' ? 'Close' : 'বন্ধ করুন'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </Modal>
    </div>
  );
};

export default React.memo(AdminApplications);
