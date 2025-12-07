import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  ArrowsDownUp,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  CreditCard,
  Eye,
  Plus
} from 'phosphor-react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function UserOwnershipTransfers({ user, onOpenModal }) {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [paying, setPaying] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null); // For details modal

  const t = {
    en: {
      title: 'My Ownership Transfer Applications',
      noApplications: 'No transfer applications yet',
      appNumber: 'Application',
      vehicle: 'Vehicle',
      newOwner: 'New Owner',
      status: 'Status',
      date: 'Date',
      action: 'Action',
      viewDetails: 'View Details',
      payNow: 'Pay Now',
      all: 'All',
      pending: 'Pending',
      approved: 'Approved',
      completed: 'Completed',
      rejected: 'Rejected',
      underReview: 'Under Review',
      paymentCompleted: 'Payment Completed',
      waitingApproval: 'Waiting for admin approval',
      waitingPayment: 'Waiting for payment',
      transferFee: 'Transfer Fee',
      closeDetails: 'Close',
      applicationDetails: 'Application Details',
      yourRole: 'Your Role',
      currentOwner: 'Current Owner',
      newOwnerRole: 'New Owner (You will pay)',
      vehicleInfo: 'Vehicle Information',
      deedDocument: 'Deed Document',
      viewDeed: 'View Deed',
      reviewNotes: 'Admin Notes'
    },
    bn: {
      title: 'আমার মালিকানা হস্তান্তর আবেদন',
      noApplications: 'এখনো কোন হস্তান্তর আবেদন নেই',
      appNumber: 'আবেদন',
      vehicle: 'গাড়ি',
      newOwner: 'নতুন মালিক',
      status: 'স্ট্যাটাস',
      date: 'তারিখ',
      action: 'অ্যাকশন',
      viewDetails: 'বিস্তারিত দেখুন',
      payNow: 'পেমেন্ট করুন',
      all: 'সব',
      pending: 'পেন্ডিং',
      approved: 'অনুমোদিত',
      completed: 'সম্পন্ন',
      rejected: 'প্রত্যাখ্যাত',
      underReview: 'পর্যালোচনায়',
      paymentCompleted: 'পেমেন্ট সম্পন্ন',
      waitingApproval: 'অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করছে',
      waitingPayment: 'পেমেন্টের জন্য অপেক্ষা করছে',
      transferFee: 'হস্তান্তর ফি',
      closeDetails: 'বন্ধ করুন',
      applicationDetails: 'আবেদনের বিস্তারিত',
      yourRole: 'আপনার ভূমিকা',
      currentOwner: 'বর্তমান মালিক',
      newOwnerRole: 'নতুন মালিক (আপনি পেমেন্ট করবেন)',
      vehicleInfo: 'গাড়ির তথ্য',
      deedDocument: 'দলিল ডকুমেন্ট',
      viewDeed: 'দলিল দেখুন',
      reviewNotes: 'অ্যাডমিন নোট'
    }
  };

  const text = t[language];

  useEffect(() => {
    fetchApplications();

    // Realtime subscription for both current owner and new owner
    const channel = supabase
      .channel('user-ownership-transfers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ownership_transfer_applications',
          filter: `current_owner_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Ownership transfer update (current owner):', payload);
          fetchApplications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ownership_transfer_applications',
          filter: `new_owner_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Ownership transfer update (new owner):', payload);
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);

      // Get applications where user is EITHER current owner OR new owner
      const { data, error } = await supabase
        .from('ownership_transfer_applications')
        .select('*')
        .or(`current_owner_user_id.eq.${user.id},new_owner_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error(isEnglish ? 'Error loading applications' : 'আবেদন লোড করতে ত্রুটি');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock, text: text.pending },
      under_review: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: Eye, text: text.underReview },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle, text: text.approved },
      payment_completed: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', icon: CreditCard, text: text.paymentCompleted },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle, text: text.completed },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: XCircle, text: text.rejected },
      cancelled: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', icon: XCircle, text: text.rejected }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon size={16} weight="fill" />
        {badge.text}
      </span>
    );
  };

  const filteredApplications = applications.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const handlePayment = async (app) => {
    try {
      setPaying(app.id);

      // Create payment record for NEW OWNER (they pay for the transfer)
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: app.new_owner_user_id, // NEW OWNER PAYS
          amount: app.transfer_fee,
          payment_type: 'ownership_transfer',
          status: 'pending',
          tran_id: `OT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update application with payment_id
      await supabase
        .from('ownership_transfer_applications')
        .update({ payment_id: payment.id })
        .eq('id', app.id);

      // Initiate SSLCommerz payment
      const response = await axios.post('https://localhost:5000/api/payment/ownership-transfer', {
        payment_id: payment.id,
        amount: app.transfer_fee,
        application_number: app.application_number,
        vehicle_registration: app.vehicle_registration_number,
        user_email: user.email,
        frontend_url: window.location.origin
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(isEnglish ? 'Failed to initiate payment' : 'পেমেন্ট শুরু করতে ব্যর্থ');
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ArrowsDownUp size={32} className="text-primary" weight="duotone" />
          {text.title}
        </h2>

        {/* New Application Button */}
        {onOpenModal && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenModal}
            className="px-4 py-2 bg-primary hover:bg-green-700 text-white rounded-lg font-semibold shadow-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} weight="bold" />
            {isEnglish ? 'New Transfer Application' : 'নতুন হস্তান্তর আবেদন'}
          </motion.button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div></div>

        {/* Filter */}
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'completed', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {text[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <ArrowsDownUp size={64} className="mx-auto text-gray-400 mb-4" weight="duotone" />
          <p className="text-gray-600 dark:text-gray-400">{text.noApplications}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Car size={40} className="text-primary" weight="duotone" />
                  <div>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {app.vehicle_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {app.vehicle_registration_number}
                    </p>
                  </div>
                </div>
                {getStatusBadge(app.status)}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{text.appNumber}</p>
                  <p className="font-bold text-gray-900 dark:text-white">{app.application_number}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{text.newOwner}</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {isEnglish ? app.new_owner_name_en : app.new_owner_name_bn}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{text.date}</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {new Date(app.created_at).toLocaleDateString(isEnglish ? 'en-US' : 'bn-BD')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Only NEW OWNER can pay, not current owner! */}
                {app.new_owner_user_id === user.id && app.status === 'approved' && app.payment_status === 'pending' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePayment(app)}
                    disabled={paying === app.id}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paying === app.id ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        {isEnglish ? 'Processing...' : 'প্রক্রিয়াকরণ...'}
                      </>
                    ) : (
                      <>
                        <CreditCard size={20} weight="fill" />
                        {text.payNow} - ৳{app.transfer_fee?.toLocaleString() || '5,000'}
                      </>
                    )}
                  </motion.button>
                )}

                <button
                  onClick={() => setSelectedApp(app)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {text.viewDetails}
                </button>
              </div>

              {/* Status Messages */}
              {app.status === 'pending' && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">{text.waitingApproval}</p>
                </div>
              )}

              {/* Different messages for current owner vs new owner */}
              {app.status === 'approved' && app.payment_status === 'pending' && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  {app.new_owner_user_id === user.id ? (
                    <p className="text-sm text-green-800 dark:text-green-400">
                      {isEnglish ? '✅ Approved! Please complete payment to finalize transfer.' : '✅ অনুমোদিত! হস্তান্তর সম্পন্ন করতে পেমেন্ট করুন।'}
                    </p>
                  ) : (
                    <p className="text-sm text-green-800 dark:text-green-400">
                      {isEnglish ? '✅ Approved! Waiting for new owner to pay.' : '✅ অনুমোদিত! নতুন মালিকের পেমেন্টের অপেক্ষায়।'}
                    </p>
                  )}
                </div>
              )}

              {app.admin_review_notes && app.status === 'rejected' && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-400 font-bold mb-1">
                    {isEnglish ? 'Rejection Reason:' : 'প্রত্যাখ্যানের কারণ:'}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">{app.admin_review_notes}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedApp(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {text.applicationDetails}
              </h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* User Role */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">{text.yourRole}</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
                {selectedApp.current_owner_user_id === user.id ? text.currentOwner : text.newOwnerRole}
              </p>
            </div>

            {/* Application Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{text.appNumber}</p>
                <p className="font-bold text-gray-900 dark:text-white">{selectedApp.application_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{text.status}</p>
                {getStatusBadge(selectedApp.status)}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{text.date}</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {new Date(selectedApp.created_at).toLocaleDateString(isEnglish ? 'en-US' : 'bn-BD')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{text.transferFee}</p>
                <p className="font-bold text-gray-900 dark:text-white">৳{selectedApp.transfer_fee?.toLocaleString() || '5,000'}</p>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">{text.vehicleInfo}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedApp.vehicle_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Registration</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedApp.vehicle_registration_number}</p>
                </div>
              </div>
            </div>

            {/* New Owner Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">{text.newOwner}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {isEnglish ? selectedApp.new_owner_name_en : selectedApp.new_owner_name_bn}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">DL Number</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedApp.new_owner_dl_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">NID</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedApp.new_owner_nid}</p>
                </div>
                {selectedApp.new_owner_photo_url && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Photo</p>
                    <img src={selectedApp.new_owner_photo_url} alt="New Owner" className="w-16 h-16 rounded-lg object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Deed Document */}
            {selectedApp.deed_document_url && (
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">{text.deedDocument}</h4>
                <a
                  href={selectedApp.deed_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Eye size={20} />
                  {text.viewDeed}
                </a>
              </div>
            )}

            {/* Admin Notes */}
            {selectedApp.admin_review_notes && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">{text.reviewNotes}</h4>
                <p className="text-gray-700 dark:text-gray-300">{selectedApp.admin_review_notes}</p>
              </div>
            )}

            {/* Payment Button for New Owner */}
            {selectedApp.new_owner_user_id === user.id && selectedApp.status === 'approved' && selectedApp.payment_status === 'pending' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedApp(null);
                  handlePayment(selectedApp);
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <CreditCard size={20} weight="fill" />
                {text.payNow} - ৳{selectedApp.transfer_fee?.toLocaleString() || '5,000'}
              </motion.button>
            )}

            <button
              onClick={() => setSelectedApp(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {text.closeDetails}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
