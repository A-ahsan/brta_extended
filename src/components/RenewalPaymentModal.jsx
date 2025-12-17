import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CreditCard,
  ArrowsClockwise,
  CheckCircle,
  Warning,
  Calendar,
  CurrencyCircleDollar,
  IdentificationCard
} from 'phosphor-react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

const RenewalPaymentModal = ({ open, onClose, license, language, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [renewalInfo, setRenewalInfo] = useState(null);
  const [error, setError] = useState(null);

  const t = {
    en: {
      title: 'Renew Driving License',
      subtitle: 'Your license has expired. Renew it to continue driving legally.',
      licenseNumber: 'License Number',
      category: 'Category',
      expiredOn: 'Expired On',
      currentStatus: 'Current Status',
      expired: 'Expired',
      renewalFee: 'Renewal Fee',
      newValidity: 'New Validity Period',
      years: 'years',
      newExpiryDate: 'New Expiry Date',
      paymentMethod: 'Payment Method',
      sslcommerz: 'SSLCommerz Payment Gateway',
      termsNote: 'By proceeding, you agree to renew your license for',
      proceedPayment: 'Proceed to Payment',
      processing: 'Processing...',
      cancel: 'Cancel',
      loadingInfo: 'Loading renewal information...',
      errorTitle: 'Error',
      tryAgain: 'Try Again',
      close: 'Close'
    },
    bn: {
      title: 'ড্রাইভিং লাইসেন্স নবায়ন',
      subtitle: 'আপনার লাইসেন্স মেয়াদোত্তীর্ণ হয়েছে। আইনগতভাবে গাড়ি চালানো চালিয়ে যেতে এটি নবায়ন করুন।',
      licenseNumber: 'লাইসেন্স নম্বর',
      category: 'শ্রেণী',
      expiredOn: 'মেয়াদোত্তীর্ণ হয়েছে',
      currentStatus: 'বর্তমান অবস্থা',
      expired: 'মেয়াদোত্তীর্ণ',
      renewalFee: 'নবায়ন ফি',
      newValidity: 'নতুন বৈধতার সময়কাল',
      years: 'বছর',
      newExpiryDate: 'নতুন মেয়াদ শেষের তারিখ',
      paymentMethod: 'পেমেন্ট পদ্ধতি',
      sslcommerz: 'SSLCommerz পেমেন্ট গেটওয়ে',
      termsNote: 'এগিয়ে গিয়ে, আপনি আপনার লাইসেন্স নবায়নে সম্মত হচ্ছেন',
      proceedPayment: 'পেমেন্টে এগিয়ে যান',
      processing: 'প্রক্রিয়াকরণ হচ্ছে...',
      cancel: 'বাতিল',
      loadingInfo: 'নবায়ন তথ্য লোড হচ্ছে...',
      errorTitle: 'ত্রুটি',
      tryAgain: 'আবার চেষ্টা করুন',
      close: 'বন্ধ করুন'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    if (open && license) {
      fetchRenewalInfo();
    }
  }, [open, license]);

  const fetchRenewalInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';
      const response = await axios.get(
        `${backendUrl}/api/licenses/${license.id}/renewal-status`
      );

      if (response.data.success) {
        setRenewalInfo(response.data.renewal_status);
      } else {
        setError('Failed to fetch renewal information');
      }
    } catch (err) {
      console.error('Error fetching renewal info:', err);
      setError(err.response?.data?.error || 'Failed to load renewal information');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const tran_id = `REN${Date.now()}`;
      const frontendUrl = window.location.origin;
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';

      // Create payment record
      const initiateResponse = await axios.post(
        `${backendUrl}/api/licenses/renewal/initiate`,
        {
          license_id: license.id,
          user_id: license.user_id,
          tran_id: tran_id,
          frontend_url: frontendUrl
        }
      );

      if (!initiateResponse.data.success) {
        throw new Error('Failed to initiate renewal payment');
      }

      // Get user info from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      // Initiate payment with SSLCommerz
      const paymentResponse = await axios.post(`${backendUrl}/api/payment/initiate`, {
        amount: renewalInfo.renewal_fee,
        customerName: license.full_name_en,
        customerEmail: user?.email || 'user@example.com',
        tran_id: tran_id,
        application_id: null,
        license_id: license.id,
        user_id: license.user_id,
        frontend_url: frontendUrl
      });

      if (paymentResponse.data.url) {
        window.location.href = paymentResponse.data.url;
      } else {
        throw new Error('Failed to get payment URL');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(language === 'en' ? 'en-GB' : 'bn-BD');
  };

  const calculateNewExpiryDate = () => {
    if (!renewalInfo) return '';
    const validityYears = renewalInfo.license_category === 'Professional' ? 5 : 10;
    const newExpiry = new Date();
    newExpiry.setFullYear(newExpiry.getFullYear() + validityYears);
    return formatDate(newExpiry.toISOString());
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-5 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <ArrowsClockwise size={28} weight="bold" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{text.title}</h2>
                <p className="text-sm text-white/90 mt-0.5">{text.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} weight="bold" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading && !renewalInfo ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">{text.loadingInfo}</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Warning size={64} className="text-red-500 mx-auto mb-4" weight="duotone" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{text.errorTitle}</h3>
                <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
                <button
                  onClick={fetchRenewalInfo}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                >
                  {text.tryAgain}
                </button>
              </div>
            ) : renewalInfo ? (
              <div className="space-y-6">
                {/* License Info */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-500">
                  <div className="flex items-center gap-3 mb-4">
                    <IdentificationCard size={28} className="text-orange-500" weight="duotone" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                      {language === 'en' ? 'License Information' : 'লাইসেন্সের তথ্য'}
                    </h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{text.licenseNumber}</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{license.license_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{text.category}</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{license.license_category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{text.expiredOn}</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{formatDate(license.expiry_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{text.currentStatus}</p>
                      <div className="flex items-center gap-2">
                        <Warning size={20} className="text-red-500" weight="fill" />
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{text.expired}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Renewal Details */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 p-5 rounded-xl border-2 border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle size={28} className="text-green-600 dark:text-green-400" weight="duotone" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                      {language === 'en' ? 'Renewal Details' : 'নবায়নের বিবরণ'}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                        <CurrencyCircleDollar size={24} className="text-green-600" weight="duotone" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{text.renewalFee}</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ৳{renewalInfo.renewal_fee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                        <Calendar size={24} className="text-blue-600" weight="duotone" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{text.newValidity}</span>
                      </div>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {renewalInfo.license_category === 'Professional' ? '5' : '10'} {text.years}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={24} className="text-purple-600" weight="duotone" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{text.newExpiryDate}</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {calculateNewExpiryDate()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard size={28} className="text-blue-600 dark:text-blue-400" weight="duotone" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{text.paymentMethod}</h3>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {text.sslcommerz}
                  </p>
                </div>

                {/* Terms Note */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">{language === 'en' ? 'Note:' : 'দ্রষ্টব্য:'}</span> {text.termsNote} {renewalInfo.license_category === 'Professional' ? '5' : '10'} {text.years}.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-6 py-3.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold text-base hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {text.cancel}
                  </button>
                  <button
                    onClick={handleProceedToPayment}
                    disabled={loading}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-base hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        {text.processing}
                      </>
                    ) : (
                      <>
                        <CreditCard size={20} weight="bold" />
                        {text.proceedPayment}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RenewalPaymentModal;
