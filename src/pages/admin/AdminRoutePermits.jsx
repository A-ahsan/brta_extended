import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, MagnifyingGlass, Eye, CheckCircle, XCircle, Clock, FileText, Car } from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

export default function AdminRoutePermits() {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  const [permits, setPermits] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected, expired
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState({ en: '', bn: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPermits();

    // Subscribe to realtime updates for route permits
    const permitSubscription = supabase
      .channel('admin-route-permits-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'route_permits'
        },
        (payload) => {
          console.log('Admin route permit realtime update:', payload);
          fetchPermits(); // Refetch all permits when any change happens
          
          // Show toast for new applications
          if (payload.eventType === 'INSERT') {
            toast.info(isEnglish ? 'New route permit application received!' : 'নতুন রুট পারমিট আবেদন প্রাপ্ত!');
          }
        }
      )
      .subscribe();

    return () => {
      permitSubscription.unsubscribe();
    };
  }, [isEnglish]);

  const fetchPermits = async () => {
    setLoading(true);
    try {
      // Fetch all route permits
      const { data: permitsData, error: permitsError } = await supabase
        .from('route_permits')
        .select('*')
        .order('created_at', { ascending: false });

      if (permitsError) throw permitsError;

      // Fetch vehicles
      const vehicleIds = [...new Set(permitsData.map(p => p.vehicle_id))];
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('registered_vehicles')
        .select('*')
        .in('id', vehicleIds);

      if (vehiclesError) throw vehiclesError;

      // Fetch users
      const userIds = [...new Set(permitsData.map(p => p.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Create lookup maps
      const vehicleMap = {};
      vehiclesData.forEach(v => {
        vehicleMap[v.id] = v;
      });

      const userMap = {};
      usersData.forEach(u => {
        userMap[u.id] = u;
      });

      setPermits(permitsData || []);
      setVehicles(vehicleMap);
      setUsers(userMap);
    } catch (error) {
      console.error('Error fetching permits:', error);
      toast.error(isEnglish ? 'Failed to load permits' : 'পারমিট লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (permit, action) => {
    setSelectedPermit(permit);
    setReviewAction(action);
    setShowReviewModal(true);
    setRejectionReason({ en: '', bn: '' });
  };

  const handleSubmitReview = async () => {
    if (!selectedPermit) return;

    // Validation for rejection
    if (reviewAction === 'reject' && (!rejectionReason.en || !rejectionReason.bn)) {
      toast.error(isEnglish ? 'Please provide rejection reason in both languages' : 'উভয় ভাষায় প্রত্যাখ্যানের কারণ প্রদান করুন');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      if (reviewAction === 'approve') {
        // Calculate issue and expiry dates
        const issueDate = new Date().toISOString().split('T')[0];
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + selectedPermit.permit_days);
        const expiryDateStr = expiryDate.toISOString().split('T')[0];

        // Generate QR code data
        const qrData = {
          permitNumber: selectedPermit.permit_number,
          vehicle: vehicles[selectedPermit.vehicle_id]?.registration_plate,
          route: {
            from: selectedPermit.route_from_en,
            to: selectedPermit.route_to_en
          },
          distance: selectedPermit.distance_km,
          issueDate: issueDate,
          expiryDate: expiryDateStr,
          verifyUrl: `${window.location.origin}/verify-route-permit/${selectedPermit.permit_number}`
        };

        // Update permit
        const { error: updateError } = await supabase
          .from('route_permits')
          .update({
            status: 'approved',
            reviewed_by: adminUser.id,
            review_date: new Date().toISOString(),
            issue_date: issueDate,
            expiry_date: expiryDateStr,
            qr_code_data: qrData
          })
          .eq('id', selectedPermit.id);

        if (updateError) throw updateError;

        // Update payment status to completed
        if (selectedPermit.payment_id) {
          await supabase
            .from('payments')
            .update({ status: 'success' })
            .eq('id', selectedPermit.payment_id);
        }

        // Send notification
        await supabase.rpc('create_dual_notification', {
          p_user_id: selectedPermit.user_id,
          p_title_en: 'Route Permit Approved!',
          p_title_bn: 'রুট পারমিট অনুমোদিত!',
          p_message_en: `Your route permit ${selectedPermit.permit_number} has been approved. Valid from ${issueDate} to ${expiryDateStr}. You can now download your permit.`,
          p_message_bn: `আপনার রুট পারমিট ${selectedPermit.permit_number} অনুমোদিত হয়েছে। ${issueDate} থেকে ${expiryDateStr} পর্যন্ত বৈধ। আপনি এখন আপনার পারমিট ডাউনলোড করতে পারেন।`,
          p_type: 'route_permit_approved',
          p_application_id: null,
          p_action_url: null,
          p_admin_title_en: 'Route Permit Approved',
          p_admin_title_bn: 'রুট পারমিট অনুমোদিত',
          p_admin_message_en: `Admin approved route permit ${selectedPermit.permit_number} for ${users[selectedPermit.user_id]?.full_name || 'User'}`,
          p_admin_message_bn: `অ্যাডমিন ${users[selectedPermit.user_id]?.full_name || 'ব্যবহারকারী'} এর জন্য রুট পারমিট ${selectedPermit.permit_number} অনুমোদন করেছেন`
        });

        toast.success(isEnglish ? 'Permit approved successfully' : 'পারমিট সফলভাবে অনুমোদিত');
      } else {
        // Reject permit
        const { error: updateError } = await supabase
          .from('route_permits')
          .update({
            status: 'rejected',
            reviewed_by: adminUser.id,
            review_date: new Date().toISOString(),
            rejection_reason_en: rejectionReason.en,
            rejection_reason_bn: rejectionReason.bn
          })
          .eq('id', selectedPermit.id);

        if (updateError) throw updateError;

        // Update payment status to failed
        if (selectedPermit.payment_id) {
          await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('id', selectedPermit.payment_id);
        }

        // Send notification
        await supabase.rpc('create_dual_notification', {
          p_user_id: selectedPermit.user_id,
          p_title_en: 'Route Permit Rejected',
          p_title_bn: 'রুট পারমিট প্রত্যাখ্যাত',
          p_message_en: `Your route permit application ${selectedPermit.permit_number} has been rejected. Reason: ${rejectionReason.en}`,
          p_message_bn: `আপনার রুট পারমিট আবেদন ${selectedPermit.permit_number} প্রত্যাখ্যাত হয়েছে। কারণ: ${rejectionReason.bn}`,
          p_type: 'route_permit_rejected',
          p_application_id: null,
          p_action_url: null,
          p_admin_title_en: 'Route Permit Rejected',
          p_admin_title_bn: 'রুট পারমিট প্রত্যাখ্যাত',
          p_admin_message_en: `Admin rejected route permit ${selectedPermit.permit_number} for ${users[selectedPermit.user_id]?.full_name || 'User'}`,
          p_admin_message_bn: `অ্যাডমিন ${users[selectedPermit.user_id]?.full_name || 'ব্যবহারকারী'} এর জন্য রুট পারমিট ${selectedPermit.permit_number} প্রত্যাখ্যান করেছেন`
        });

        toast.success(isEnglish ? 'Permit rejected' : 'পারমিট প্রত্যাখ্যাত');
      }

      fetchPermits();
      setShowReviewModal(false);
      setSelectedPermit(null);
    } catch (error) {
      console.error('Error reviewing permit:', error);
      toast.error(isEnglish ? 'Failed to process review' : 'পর্যালোচনা প্রক্রিয়া করতে ব্যর্থ');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPermits = permits.filter(permit => {
    // Filter by status
    if (filter !== 'all' && permit.status !== filter) return false;

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const vehicle = vehicles[permit.vehicle_id];
      const user = users[permit.user_id];
      
      return (
        permit.permit_number.toLowerCase().includes(term) ||
        permit.route_from_en.toLowerCase().includes(term) ||
        permit.route_to_en.toLowerCase().includes(term) ||
        vehicle?.registration_plate?.en?.toLowerCase().includes(term) ||
        user?.full_name?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
            <CheckCircle size={16} weight="fill" />
            {isEnglish ? 'Approved' : 'অনুমোদিত'}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-semibold">
            <Clock size={16} weight="fill" />
            {isEnglish ? 'Pending' : 'মুলতুবি'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
            <XCircle size={16} weight="fill" />
            {isEnglish ? 'Rejected' : 'প্রত্যাখ্যাত'}
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold">
            <XCircle size={16} weight="fill" />
            {isEnglish ? 'Expired' : 'মেয়াদোত্তীর্ণ'}
          </span>
        );
      default:
        return null;
    }
  };

  const text = {
    title: isEnglish ? 'Route Permit Applications' : 'রুট পারমিট আবেদন',
    subtitle: isEnglish ? 'Review and manage route permit applications' : 'রুট পারমিট আবেদন পর্যালোচনা এবং পরিচালনা করুন',
    search: isEnglish ? 'Search permits...' : 'পারমিট অনুসন্ধান করুন...',
    filterAll: isEnglish ? 'All' : 'সব',
    filterPending: isEnglish ? 'Pending' : 'মুলতুবি',
    filterApproved: isEnglish ? 'Approved' : 'অনুমোদিত',
    filterRejected: isEnglish ? 'Rejected' : 'প্রত্যাখ্যাত',
    filterExpired: isEnglish ? 'Expired' : 'মেয়াদোত্তীর্ণ',
    noPermits: isEnglish ? 'No permits found' : 'কোনো পারমিট পাওয়া যায়নি',
    permitNumber: isEnglish ? 'Permit Number' : 'পারমিট নম্বর',
    applicant: isEnglish ? 'Applicant' : 'আবেদনকারী',
    vehicle: isEnglish ? 'Vehicle' : 'যানবাহন',
    route: isEnglish ? 'Route' : 'রুট',
    distance: isEnglish ? 'Distance' : 'দূরত্ব',
    duration: isEnglish ? 'Duration' : 'সময়কাল',
    fee: isEnglish ? 'Fee' : 'ফি',
    status: isEnglish ? 'Status' : 'অবস্থা',
    actions: isEnglish ? 'Actions' : 'কর্ম',
    approve: isEnglish ? 'Approve' : 'অনুমোদন',
    reject: isEnglish ? 'Reject' : 'প্রত্যাখ্যান',
    viewDocument: isEnglish ? 'View Document' : 'ডকুমেন্ট দেখুন',
    reviewTitle: isEnglish ? 'Review Route Permit' : 'রুট পারমিট পর্যালোচনা',
    rejectionReasonEn: isEnglish ? 'Rejection Reason (English)' : 'প্রত্যাখ্যানের কারণ (ইংরেজি)',
    rejectionReasonBn: isEnglish ? 'Rejection Reason (Bengali)' : 'প্রত্যাখ্যানের কারণ (বাংলা)',
    cancel: isEnglish ? 'Cancel' : 'বাতিল',
    confirm: isEnglish ? 'Confirm' : 'নিশ্চিত করুন',
    days: isEnglish ? 'days' : 'দিন',
    km: isEnglish ? 'km' : 'কিমি',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <MapPin size={36} weight="duotone" className="text-primary" />
          {text.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{text.subtitle}</p>
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
          {['all', 'pending', 'approved', 'rejected', 'expired'].map((f) => (
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

      {/* Permits Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      ) : filteredPermits.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <MapPin size={80} weight="duotone" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{text.noPermits}</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {text.permitNumber}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {text.applicant}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {text.vehicle}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {text.route}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {text.fee}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {text.status}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {text.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPermits.map((permit) => {
                  const vehicle = vehicles[permit.vehicle_id];
                  const user = users[permit.user_id];

                  return (
                    <tr key={permit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 dark:text-white">{permit.permit_number}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(permit.created_at).toLocaleDateString(isEnglish ? 'en-GB' : 'bn-BD')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800 dark:text-white">{user?.full_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{user?.email || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800 dark:text-white">
                          {isEnglish ? vehicle?.registration_plate?.en : vehicle?.registration_plate?.bn}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vehicle?.vehicle_name} {vehicle?.model}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-800 dark:text-white">
                          {isEnglish ? permit.route_from_en : permit.route_from_bn} →{' '}
                          {isEnglish ? permit.route_to_en : permit.route_to_bn}
                        </p>
                        <p className="text-xs text-gray-500">
                          {permit.distance_km} {text.km} • {permit.permit_days} {text.days}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 dark:text-white">
                          ৳ {permit.total_fee.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(permit.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(permit.reason_document_url, '_blank')}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title={text.viewDocument}
                          >
                            <Eye size={20} weight="duotone" className="text-blue-600" />
                          </button>
                          
                          {permit.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleReviewClick(permit, 'approve')}
                                className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title={text.approve}
                              >
                                <CheckCircle size={20} weight="duotone" className="text-green-600" />
                              </button>
                              <button
                                onClick={() => handleReviewClick(permit, 'reject')}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title={text.reject}
                              >
                                <XCircle size={20} weight="duotone" className="text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6"
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                {text.reviewTitle}
              </h3>

              {reviewAction === 'approve' ? (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-xl">
                    <p className="text-green-800 dark:text-green-300">
                      {isEnglish 
                        ? `Are you sure you want to approve permit ${selectedPermit?.permit_number}? The permit will be valid for ${selectedPermit?.permit_days} days.`
                        : `আপনি কি নিশ্চিত যে আপনি পারমিট ${selectedPermit?.permit_number} অনুমোদন করতে চান? পারমিট ${selectedPermit?.permit_days} দিনের জন্য বৈধ হবে।`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {text.rejectionReasonEn}
                    </label>
                    <textarea
                      value={rejectionReason.en}
                      onChange={(e) => setRejectionReason(prev => ({ ...prev, en: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:outline-none resize-none"
                      placeholder="E.g., Invalid route or insufficient documentation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {text.rejectionReasonBn}
                    </label>
                    <textarea
                      value={rejectionReason.bn}
                      onChange={(e) => setRejectionReason(prev => ({ ...prev, bn: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:outline-none resize-none"
                      placeholder="যেমন, অবৈধ রুট বা অপর্যাপ্ত ডকুমেন্টেশন"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowReviewModal(false)}
                  disabled={processing}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {text.cancel}
                </button>

                <button
                  onClick={handleSubmitReview}
                  disabled={processing}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    reviewAction === 'approve'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                  }`}
                >
                  {processing ? (isEnglish ? 'Processing...' : 'প্রক্রিয়াকরণ...') : text.confirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
