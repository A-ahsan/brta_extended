import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowsDownUp,
  MagnifyingGlass,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  CarSimple,
  User,
  FileText,
  DownloadSimple,
  Funnel,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const AdminOwnershipTransfers = () => {
  const { language } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewAction, setReviewAction] = useState(''); // 'approve' or 'reject'
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel('admin-ownership-transfers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ownership_transfer_applications',
        },
        (payload) => {
          console.log('Ownership transfer update:', payload);
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ownership_transfer_applications')
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

  const handleReview = async () => {
    if (!selectedApp || !reviewAction) return;

    try {
      setSubmitting(true);

      const newStatus = reviewAction === 'approve' ? 'approved' : 'rejected';
      const { data: { user } } = await supabase.auth.getUser();

      const updateData = {
        status: newStatus,
        admin_reviewed_by: user.id,
        admin_review_notes: reviewNotes || null,
        reviewed_at: new Date().toISOString(),
      };

      if (reviewAction === 'approve') {
        updateData.approved_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('ownership_transfer_applications')
        .update(updateData)
        .eq('id', selectedApp.id);

      if (updateError) throw updateError;

      // Create notifications for all 3 parties
      const isApproved = reviewAction === 'approve';
      
      await supabase.from('notifications').insert([
        // 1. Current Owner notification
        {
          user_id: selectedApp.current_owner_user_id,
          title_en: `Ownership Transfer ${isApproved ? 'Approved' : 'Rejected'}`,
          title_bn: `মালিকানা হস্তান্তর ${isApproved ? 'অনুমোদিত' : 'প্রত্যাখ্যান'}`,
          message_en: `Your ownership transfer application ${selectedApp.application_number} has been ${isApproved ? 'approved. The new owner can now proceed with payment.' : `rejected. ${reviewNotes ? 'Reason: ' + reviewNotes : ''}`}`,
          message_bn: `আপনার মালিকানা হস্তান্তর আবেদন ${selectedApp.application_number} ${isApproved ? 'অনুমোদিত হয়েছে। নতুন মালিক এখন পেমেন্ট সম্পন্ন করতে পারবেন।' : `প্রত্যাখ্যান করা হয়েছে। ${reviewNotes ? 'কারণ: ' + reviewNotes : ''}`}`,
          notification_type: 'application',
          priority: 'high',
          recipient_type: 'user'
        },
        // 2. New Owner notification
        {
          user_id: selectedApp.new_owner_user_id,
          title_en: `Vehicle Transfer ${isApproved ? 'Approved - Payment Required' : 'Rejected'}`,
          title_bn: `গাড়ি হস্তান্তর ${isApproved ? 'অনুমোদিত - পেমেন্ট প্রয়োজন' : 'প্রত্যাখ্যান'}`,
          message_en: isApproved 
            ? `Transfer application ${selectedApp.application_number} for ${selectedApp.vehicle_name} (${selectedApp.vehicle_registration_number}) has been approved! Please proceed with payment of BDT ${selectedApp.transfer_fee || 5000} to complete the transfer.`
            : `Transfer application ${selectedApp.application_number} for ${selectedApp.vehicle_name} has been rejected.`,
          message_bn: isApproved
            ? `${selectedApp.vehicle_name} (${selectedApp.vehicle_registration_number}) গাড়ির হস্তান্তর আবেদন ${selectedApp.application_number} অনুমোদিত হয়েছে! হস্তান্তর সম্পন্ন করতে BDT ${selectedApp.transfer_fee || 5000} পেমেন্ট করুন।`
            : `${selectedApp.vehicle_name} গাড়ির হস্তান্তর আবেদন ${selectedApp.application_number} প্রত্যাখ্যান করা হয়েছে।`,
          notification_type: 'payment',
          priority: 'high',
          recipient_type: 'user'
        },
        // 3. Admin notification (for record)
        {
          user_id: null,
          title_en: `Ownership Transfer ${isApproved ? 'Approved' : 'Rejected'}`,
          title_bn: `মালিকানা হস্তান্তর ${isApproved ? 'অনুমোদিত' : 'প্রত্যাখ্যান'}`,
          message_en: `Application ${selectedApp.application_number} for vehicle ${selectedApp.vehicle_registration_number} ${isApproved ? 'approved' : 'rejected'} by admin.`,
          message_bn: `গাড়ি ${selectedApp.vehicle_registration_number} এর আবেদন ${selectedApp.application_number} অ্যাডমিন দ্বারা ${isApproved ? 'অনুমোদিত' : 'প্রত্যাখ্যান'} হয়েছে।`,
          notification_type: 'application',
          priority: 'normal',
          recipient_type: 'admin'
        }
      ]);

      toast.success(
        language === 'en'
          ? `Application ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`
          : `আবেদন সফলভাবে ${reviewAction === 'approve' ? 'অনুমোদিত' : 'প্রত্যাখ্যান'}`
      );

      setShowReviewModal(false);
      setSelectedApp(null);
      setReviewAction('');
      setReviewNotes('');
      fetchApplications();
    } catch (error) {
      console.error('Error reviewing application:', error);
      toast.error(language === 'en' ? 'Failed to review application' : 'আবেদন পর্যালোচনা করতে ব্যর্থ');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (app, action) => {
    setSelectedApp(app);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300',
        icon: <Clock size={16} weight="fill" />,
        label: language === 'en' ? 'Pending' : 'অপেক্ষমাণ',
      },
      under_review: {
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300',
        icon: <Eye size={16} weight="fill" />,
        label: language === 'en' ? 'Under Review' : 'পর্যালোচনাধীন',
      },
      approved: {
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300',
        icon: <CheckCircle size={16} weight="fill" />,
        label: language === 'en' ? 'Approved' : 'অনুমোদিত',
      },
      payment_completed: {
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300',
        icon: <CheckCircle size={16} weight="fill" />,
        label: language === 'en' ? 'Payment Done' : 'পেমেন্ট সম্পন্ন',
      },
      completed: {
        color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300',
        icon: <CheckCircle size={16} weight="fill" />,
        label: language === 'en' ? 'Completed' : 'সম্পন্ন',
      },
      rejected: {
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300',
        icon: <XCircle size={16} weight="fill" />,
        label: language === 'en' ? 'Rejected' : 'প্রত্যাখ্যান',
      },
    };
    return badges[status] || badges.pending;
  };

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch =
      app.application_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.vehicle_registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.new_owner_name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.new_owner_name_bn.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <ArrowsDownUp size={32} weight="duotone" className="text-primary" />
            {language === 'en' ? 'Vehicle Ownership Transfers' : 'গাড়ি মালিকানা হস্তান্তর'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Review and manage ownership transfer applications' : 'মালিকানা হস্তান্তর আবেদন পর্যালোচনা ও পরিচালনা করুন'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlass size={20} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'en' ? 'Search by application number, vehicle, or owner...' : 'আবেদন নম্বর, গাড়ি বা মালিক দ্বারা অনুসন্ধান...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Funnel size={20} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="all">{language === 'en' ? 'All Status' : 'সব স্ট্যাটাস'}</option>
            <option value="pending">{language === 'en' ? 'Pending' : 'অপেক্ষমাণ'}</option>
            <option value="under_review">{language === 'en' ? 'Under Review' : 'পর্যালোচনাধীন'}</option>
            <option value="approved">{language === 'en' ? 'Approved' : 'অনুমোদিত'}</option>
            <option value="payment_completed">{language === 'en' ? 'Payment Done' : 'পেমেন্ট সম্পন্ন'}</option>
            <option value="completed">{language === 'en' ? 'Completed' : 'সম্পন্ন'}</option>
            <option value="rejected">{language === 'en' ? 'Rejected' : 'প্রত্যাখ্যান'}</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {language === 'en' ? 'Loading applications...' : 'আবেদন লোড হচ্ছে...'}
          </p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <ArrowsDownUp size={64} className="mx-auto text-gray-400 mb-4" weight="duotone" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {language === 'en' ? 'No ownership transfer applications found' : 'কোনো মালিকানা হস্তান্তর আবেদন পাওয়া যায়নি'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map((app) => {
            const badge = getStatusBadge(app.status);
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
              >
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* Left Section - Application Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {language === 'en' ? 'Application #' : 'আবেদন #'}
                      </span>
                      <span className="font-mono font-bold text-primary">{app.application_number}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badge.color}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      {/* Vehicle Info */}
                      <div className="flex items-start gap-2">
                        <CarSimple size={20} weight="duotone" className="text-primary mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'en' ? 'Vehicle' : 'গাড়ি'}</p>
                          <p className="font-semibold text-gray-800 dark:text-white">{app.vehicle_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{app.vehicle_registration_number}</p>
                        </div>
                      </div>

                      {/* New Owner Info */}
                      <div className="flex items-start gap-2">
                        <User size={20} weight="duotone" className="text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'en' ? 'New Owner' : 'নতুন মালিক'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {app.new_owner_photo_url && (
                              <img
                                src={app.new_owner_photo_url}
                                alt={app.new_owner_name_en}
                                className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-white">
                                {language === 'en' ? app.new_owner_name_en : app.new_owner_name_bn}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">DL: {app.new_owner_dl_number}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Transfer Fee */}
                      <div className="flex items-start gap-2">
                        <FileText size={20} weight="duotone" className="text-primary mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'en' ? 'Transfer Fee' : 'হস্তান্তর ফি'}</p>
                          <p className="font-semibold text-gray-800 dark:text-white">৳ {app.transfer_fee?.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Eligibility */}
                      <div className="flex items-start gap-2">
                        <CheckCircle size={20} weight="duotone" className="text-green-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'en' ? 'Eligibility' : 'যোগ্যতা'}</p>
                          <div className="text-xs space-y-0.5">
                            <p className={app.smart_card_valid ? 'text-green-600' : 'text-red-600'}>
                              {app.smart_card_valid ? '✓' : '✗'} {language === 'en' ? 'Smart Card' : 'স্মার্ট কার্ড'}
                            </p>
                            <p className={app.tax_token_valid ? 'text-green-600' : 'text-red-600'}>
                              {app.tax_token_valid ? '✓' : '✗'} {language === 'en' ? 'Tax Token' : 'ট্যাক্স টোকেন'}
                            </p>
                            <p className={!app.has_unpaid_fines ? 'text-green-600' : 'text-red-600'}>
                              {!app.has_unpaid_fines ? '✓' : '✗'} {language === 'en' ? 'No Fines' : 'জরিমানা নেই'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Deed Document */}
                    {app.deed_document_url && (
                      <div>
                        <a
                          href={app.deed_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:text-green-600 font-semibold transition-colors"
                        >
                          <DownloadSimple size={16} weight="bold" />
                          {language === 'en' ? 'View Deed Document (দলিল)' : 'দলিল দেখুন'}
                        </a>
                      </div>
                    )}

                    {/* Admin Review Notes */}
                    {app.admin_review_notes && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          {language === 'en' ? 'Admin Notes:' : 'প্রশাসক নোট:'}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{app.admin_review_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Section - Actions */}
                  {(app.status === 'pending' || app.status === 'under_review') && (
                    <div className="flex lg:flex-col gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openReviewModal(app, 'approve')}
                        className="flex-1 lg:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle size={20} weight="bold" />
                        {language === 'en' ? 'Approve' : 'অনুমোদন'}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openReviewModal(app, 'reject')}
                        className="flex-1 lg:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <XCircle size={20} weight="bold" />
                        {language === 'en' ? 'Reject' : 'প্রত্যাখ্যান'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && selectedApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                {reviewAction === 'approve' ? (
                  <>
                    <CheckCircle size={28} weight="duotone" className="text-green-600" />
                    {language === 'en' ? 'Approve Application' : 'আবেদন অনুমোদন'}
                  </>
                ) : (
                  <>
                    <XCircle size={28} weight="duotone" className="text-red-600" />
                    {language === 'en' ? 'Reject Application' : 'আবেদন প্রত্যাখ্যান'}
                  </>
                )}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'en' ? 'Application Number:' : 'আবেদন নম্বর:'}
                </p>
                <p className="font-mono font-bold text-primary">{selectedApp.application_number}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'en' ? 'Notes (Optional):' : 'নোট (ঐচ্ছিক):'}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows="4"
                  placeholder={language === 'en' ? 'Add review notes...' : 'পর্যালোচনা নোট যোগ করুন...'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {language === 'en' ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  onClick={handleReview}
                  disabled={submitting}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${
                    reviewAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting
                    ? language === 'en'
                      ? 'Processing...'
                      : 'প্রক্রিয়াকরণ...'
                    : language === 'en'
                    ? 'Confirm'
                    : 'নিশ্চিত করুন'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOwnershipTransfers;
