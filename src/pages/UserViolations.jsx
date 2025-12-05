import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Warning,
  CurrencyCircleDollar,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Car,
  User,
  Sparkle,
  CreditCard,
  Receipt
} from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import axios from 'axios';
import ViolationReceipt from '../components/ViolationReceipt';

const UserViolations = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unpaid, paid
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [payingViolation, setPayingViolation] = useState(null);
  const [receiptViolation, setReceiptViolation] = useState(null);

  useEffect(() => {
    if (user) {
      fetchViolations();
      
      // Check if returning from payment
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment') === 'success') {
        toast.success(language === 'en' ? 'Payment successful! Violation marked as paid.' : 'পেমেন্ট সফল! লঙ্ঘন পরিশোধিত হিসাবে চিহ্নিত।');
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, language]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          registered_vehicles (
            registration_number,
            registration_plate,
            vehicle_name,
            model,
            engine_number
          )
        `)
        .eq('user_id', user.id)
        .order('violation_date', { ascending: false });

      if (error) throw error;
      setViolations(data || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
      toast.error(language === 'en' ? 'Failed to load violations' : 'লঙ্ঘন লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handlePayFine = async (violation) => {
    try {
      setPayingViolation(violation.id);

      // Get current protocol and host
      const protocol = window.location.protocol;
      const host = window.location.host;
      const baseUrl = `${protocol}//${host}`;
      const backendUrl = protocol === 'https:' 
        ? `https://${host.replace('3000', '5000')}`
        : `http://${host.replace('3000', '5000')}`;

      const transactionId = `FINE-${violation.violation_number}-${Date.now()}`;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: violation.total_amount,
          currency: 'BDT',
          tran_id: transactionId,
          status: 'initiated',
          payment_type: 'violation_fine'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update violation with payment_id
      await supabase
        .from('traffic_violations')
        .update({ payment_id: payment.id })
        .eq('id', violation.id);

      // Initiate payment with backend
      const response = await axios.post(`${backendUrl}/api/payment/initiate`, {
        amount: violation.total_amount,
        customerName: user.user_metadata?.full_name || 'User',
        customerEmail: user.email,
        tran_id: transactionId,
        user_id: user.id,
        frontend_url: baseUrl
      });

      const gatewayUrl = response.data.url || response.data.GatewayPageURL;

      if (gatewayUrl) {
        // Redirect to payment gateway
        window.location.href = gatewayUrl;
      } else {
        throw new Error('Failed to get payment gateway URL');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast.error(language === 'en' ? 'Failed to initiate payment' : 'পেমেন্ট শুরু করতে ব্যর্থ');
      setPayingViolation(null);
    }
  };

  const getFilteredViolations = () => {
    switch (filter) {
      case 'unpaid':
        return violations.filter(v => v.payment_status === 'unpaid' && v.status === 'active');
      case 'paid':
        return violations.filter(v => v.payment_status === 'paid');
      default:
        return violations;
    }
  };

  const getSeverityColor = (violationName) => {
    const name = violationName.toLowerCase();
    if (name.includes('drunk') || name.includes('license')) return 'text-red-600 dark:text-red-400';
    if (name.includes('wrong side') || name.includes('rash')) return 'text-orange-600 dark:text-orange-400';
    if (name.includes('speed') || name.includes('signal')) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getStatusBadge = (violation) => {
    if (violation.status === 'waived') {
      return (
        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-bold flex items-center gap-1">
          <Sparkle size={14} weight="fill" />
          {language === 'en' ? 'Waived' : 'মওকুফ'}
        </span>
      );
    }
    
    if (violation.payment_status === 'paid') {
      return (
        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-bold flex items-center gap-1">
          <CheckCircle size={14} weight="fill" />
          {language === 'en' ? 'Paid' : 'পরিশোধিত'}
        </span>
      );
    }
    
    return (
      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-bold flex items-center gap-1">
        <Clock size={14} weight="fill" />
        {language === 'en' ? 'Pending Payment' : 'পেমেন্ট বাকি'}
      </span>
    );
  };

  const filteredViolations = getFilteredViolations();
  const totalPending = violations.filter(v => v.payment_status === 'unpaid' && v.status === 'active')
    .reduce((sum, v) => sum + parseFloat(v.total_amount), 0);
  const totalPaid = violations.filter(v => v.payment_status === 'paid')
    .reduce((sum, v) => sum + parseFloat(v.total_amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'en' ? 'Loading violations...' : 'লঙ্ঘন লোড হচ্ছে...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Warning size={40} weight="bold" />
          <div>
            <h1 className="text-3xl font-bold">
              {language === 'en' ? 'My Violations' : 'আমার লঙ্ঘন'}
            </h1>
            <p className="opacity-90">
              {language === 'en' ? 'Traffic Violations & Fines' : 'ট্রাফিক লঙ্ঘন ও জরিমানা'}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Warning size={20} weight="fill" />
              <span className="text-sm opacity-90">
                {language === 'en' ? 'Total Violations' : 'মোট লঙ্ঘন'}
              </span>
            </div>
            <p className="text-3xl font-bold">{violations.length}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} weight="fill" />
              <span className="text-sm opacity-90">
                {language === 'en' ? 'Pending Payment' : 'বাকি পেমেন্ট'}
              </span>
            </div>
            <p className="text-3xl font-bold">BDT {totalPending.toFixed(2)}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} weight="fill" />
              <span className="text-sm opacity-90">
                {language === 'en' ? 'Total Paid' : 'মোট পরিশোধিত'}
              </span>
            </div>
            <p className="text-3xl font-bold">BDT {totalPaid.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {['all', 'unpaid', 'paid'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-2 rounded-xl font-semibold transition-all ${
              filter === f
                ? 'bg-primary text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {language === 'en' 
              ? f.charAt(0).toUpperCase() + f.slice(1)
              : f === 'all' ? 'সব' : f === 'unpaid' ? 'বাকি' : 'পরিশোধিত'}
          </button>
        ))}
      </div>

      {/* Violations List */}
      {filteredViolations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center"
        >
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" weight="duotone" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {language === 'en' ? 'No Violations Found' : 'কোনো লঙ্ঘন পাওয়া যায়নি'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'unpaid' 
              ? (language === 'en' ? 'All fines have been paid!' : 'সব জরিমানা পরিশোধ করা হয়েছে!')
              : (language === 'en' ? 'Keep driving safely!' : 'নিরাপদে গাড়ি চালিয়ে যান!')}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredViolations.map((violation, index) => (
            <motion.div
              key={violation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Side - Violation Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Warning size={24} weight="fill" className={getSeverityColor(violation.violation_name_en)} />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                          {language === 'en' ? violation.violation_name_en : violation.violation_name_bn}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Violation #' : 'লঙ্ঘন #'}{violation.violation_number}
                      </p>
                    </div>
                    {getStatusBadge(violation)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Car size={18} className="text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'Vehicle' : 'যানবাহন'}
                        </p>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {violation.registered_vehicles?.registration_number}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'Location' : 'অবস্থান'}
                        </p>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {language === 'en' ? violation.location : (violation.location_bn || violation.location)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'Date' : 'তারিখ'}
                        </p>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {new Date(violation.violation_date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User size={18} className="text-gray-400" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'Issued By' : 'জারিকারী'}
                        </p>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {violation.police_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {violation.description && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{violation.description}</p>
                    </div>
                  )}
                </div>

                {/* Right Side - Payment Info */}
                <div className="md:w-64 flex flex-col">
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {language === 'en' ? 'Fine Amount' : 'জরিমানার পরিমাণ'}
                    </p>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                      BDT {violation.total_amount}
                    </div>
                    {violation.additional_charges > 0 && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        ({language === 'en' ? 'Base' : 'মূল'}: {violation.fine_amount} + {language === 'en' ? 'Additional' : 'অতিরিক্ত'}: {violation.additional_charges})
                      </p>
                    )}
                  </div>

                  {violation.payment_status === 'unpaid' && violation.status === 'active' && (
                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePayFine(violation)}
                        disabled={payingViolation === violation.id}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {payingViolation === violation.id ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            {language === 'en' ? 'Processing...' : 'প্রক্রিয়াকরণ...'}
                          </>
                        ) : (
                          <>
                            <CreditCard size={20} weight="bold" />
                            {language === 'en' ? 'Pay Fine' : 'জরিমানা পরিশোধ করুন'}
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setReceiptViolation(violation)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Receipt size={20} weight="bold" />
                        {language === 'en' ? 'View Receipt' : 'রসিদ দেখুন'}
                      </motion.button>
                    </div>
                  )}

                  {violation.payment_status === 'paid' && (
                    <div className="space-y-3">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <CheckCircle size={32} className="text-green-600 dark:text-green-400 mx-auto mb-2" weight="fill" />
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                          {language === 'en' ? 'Paid on' : 'পরিশোধের তারিখ'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(violation.paid_at).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD')}
                        </p>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setReceiptViolation(violation)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Receipt size={20} weight="bold" />
                        {language === 'en' ? 'Download Receipt' : 'রসিদ ডাউনলোড করুন'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Receipt Modal */}
      <ViolationReceipt 
        violation={receiptViolation}
        isOpen={!!receiptViolation}
        onClose={() => setReceiptViolation(null)}
        language={language}
      />
    </div>
  );
};

export default UserViolations;
