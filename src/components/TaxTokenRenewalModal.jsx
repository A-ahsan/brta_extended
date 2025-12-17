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
  Car
} from 'phosphor-react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const TaxTokenRenewalModal = ({ open, onClose, vehicle, language, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [renewalDays, setRenewalDays] = useState(365); // Default 1 year
  const [renewalFee, setRenewalFee] = useState(0);
  const [error, setError] = useState(null);

  const t = {
    en: {
      title: 'Renew Tax Token',
      subtitle: 'Select renewal period for your vehicle tax token',
      vehicleName: 'Vehicle',
      registrationPlate: 'Registration Plate',
      currentStatus: 'Current Status',
      expired: 'Expired',
      active: 'Active',
      renewalPeriod: 'Renewal Period (Days)',
      renewalFee: 'Renewal Fee',
      newExpiryDate: 'New Expiry Date',
      feeCalculation: 'Fee Calculation',
      baseFee: 'Base Fee (Annual)',
      proceedPayment: 'Proceed to Payment',
      processing: 'Processing...',
      cancel: 'Cancel',
      close: 'Close',
      days: 'days',
      perDay: 'per day',
      maxYears: 'Max 10 years'
    },
    bn: {
      title: 'ট্যাক্স টোকেন নবায়ন',
      subtitle: 'আপনার যানবাহন ট্যাক্স টোকেনের জন্য নবায়ন সময়কাল নির্বাচন করুন',
      vehicleName: 'যানবাহন',
      registrationPlate: 'নিবন্ধন প্লেট',
      currentStatus: 'বর্তমান স্ট্যাটাস',
      expired: 'মেয়াদ শেষ',
      active: 'সক্রিয়',
      renewalPeriod: 'নবায়ন সময়কাল (দিন)',
      renewalFee: 'নবায়ন ফি',
      newExpiryDate: 'নতুন মেয়াদ শেষের তারিখ',
      feeCalculation: 'ফি গণনা',
      baseFee: 'বেস ফি (বার্ষিক)',
      proceedPayment: 'পেমেন্টে এগিয়ে যান',
      processing: 'প্রক্রিয়াকরণ...',
      cancel: 'বাতিল',
      close: 'বন্ধ করুন',
      days: 'দিন',
      perDay: 'প্রতি দিন',
      maxYears: 'সর্বোচ্চ ১০ বছর'
    }
  };

  const text = t[language] || t.en;

  // Calculate renewal fee based on vehicle type and days
  useEffect(() => {
    if (vehicle && renewalDays > 0) {
      calculateFee();
    }
  }, [vehicle, renewalDays]);

  const calculateFee = () => {
    // Get base annual fee from vehicle type and engine capacity
    let annualFee = 0;
    
    if (vehicle.vehicle_type === 'Bike') {
      // Bike tax token fees
      if (vehicle.engine_cc < 100) {
        annualFee = 2300; // Below 100cc annual
      } else {
        annualFee = 3450; // Above 100cc annual
      }
    } else if (vehicle.vehicle_type === 'Car') {
      // Car tax token fees based on engine capacity
      if (vehicle.engine_cc <= 1500) annualFee = 15000;
      else if (vehicle.engine_cc <= 2000) annualFee = 30000;
      else if (vehicle.engine_cc <= 2500) annualFee = 60000;
      else if (vehicle.engine_cc <= 3000) annualFee = 100000;
      else if (vehicle.engine_cc <= 3500) annualFee = 200000;
      else annualFee = 300000;
    }

    // Calculate pro-rated fee for the selected days
    const dailyFee = annualFee / 365;
    const totalFee = Math.ceil(dailyFee * renewalDays);
    
    setRenewalFee(totalFee);
  };

  const calculateNewExpiryDate = () => {
    const today = new Date();
    const newExpiry = new Date(today);
    newExpiry.setDate(today.getDate() + parseInt(renewalDays));
    return newExpiry.toLocaleDateString();
  };

  const getAnnualBaseFee = () => {
    if (vehicle.vehicle_type === 'Bike') {
      return vehicle.engine_cc < 100 ? 2300 : 3450;
    } else if (vehicle.vehicle_type === 'Car') {
      if (vehicle.engine_cc <= 1500) return 15000;
      else if (vehicle.engine_cc <= 2000) return 30000;
      else if (vehicle.engine_cc <= 2500) return 60000;
      else if (vehicle.engine_cc <= 3000) return 100000;
      else if (vehicle.engine_cc <= 3500) return 200000;
      else return 300000;
    }
    return 0;
  };

  const handleProceedToPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const tran_id = `TTREN${Date.now()}`;
      const frontendUrl = window.location.origin;
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create payment record
      const initiateResponse = await axios.post(
        `${backendUrl}/api/tax-tokens/renewal/initiate`,
        {
          vehicle_id: vehicle.id,
          user_id: user.id,
          tran_id: tran_id,
          renewal_days: renewalDays,
          renewal_fee: renewalFee,
          frontend_url: frontendUrl
        }
      );

      if (!initiateResponse.data.success) {
        throw new Error('Failed to initiate tax token renewal payment');
      }

      // Initiate payment with SSLCommerz
      const paymentResponse = await axios.post(`${backendUrl}/api/payment/initiate`, {
        amount: renewalFee,
        customerName: vehicle.owner_name_en,
        customerEmail: user?.email || 'user@example.com',
        transactionId: tran_id,
        productCategory: 'Tax Token Renewal',
        productName: `Tax Token Renewal - ${vehicle.registration_plate.en}`,
        successUrl: `${frontendUrl}/payment-success`,
        failUrl: `${frontendUrl}/payment-fail`,
        cancelUrl: `${frontendUrl}/payment-cancel`
      });

      // Backend returns { url: ... }, check for both formats
      const gatewayUrl = paymentResponse.data.url || paymentResponse.data.GatewayPageURL;
      
      if (gatewayUrl) {
        // Redirect to payment gateway
        window.location.href = gatewayUrl;
      } else {
        throw new Error('Failed to get payment gateway URL');
      }

    } catch (err) {
      console.error('Error initiating tax token renewal:', err);
      setError(err.response?.data?.error || err.message || 'Failed to initiate payment');
      toast.error(language === 'en' ? 'Failed to initiate payment' : 'পেমেন্ট শুরু করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !vehicle) return null;

  const baseFee = getAnnualBaseFee();
  const dailyFee = (baseFee / 365).toFixed(2);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 rounded-2xl shadow-2xl text-white max-w-lg w-full relative overflow-hidden max-h-[95vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all z-10"
            >
              <X size={20} />
            </button>

            {/* Background Decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-3">
                  <ArrowsClockwise size={32} weight="duotone" />
                </div>
                <h2 className="text-2xl font-bold mb-1">{text.title}</h2>
                <p className="text-sm opacity-90">{text.subtitle}</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-300 rounded-lg p-3 mb-4 flex items-center gap-2"
                >
                  <Warning size={20} />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              {/* Vehicle Info */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Car size={20} weight="duotone" />
                  <div>
                    <p className="text-xs opacity-80">{text.vehicleName}</p>
                    <p className="font-bold">{vehicle.vehicle_name} {vehicle.model}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs opacity-80">{text.registrationPlate}</p>
                  <p className="font-bold tracking-wider">{language === 'en' ? vehicle.registration_plate.en : vehicle.registration_plate.bn}</p>
                </div>
              </div>

              {/* Renewal Period Selector */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                <label className="block text-sm font-semibold mb-3">
                  {text.renewalPeriod}
                </label>
                
                {/* Quick Select Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[30, 90, 180, 365].map(days => (
                    <button
                      key={days}
                      onClick={() => setRenewalDays(days)}
                      className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                        renewalDays === days
                          ? 'bg-white text-green-600 shadow-lg'
                          : 'bg-white/20 hover:bg-white/30'
                      }`}
                    >
                      {days}
                    </button>
                  ))}
                </div>

                {/* Custom Days Input */}
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={renewalDays}
                  onChange={(e) => setRenewalDays(Math.min(3650, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Enter custom days (1-3650)"
                />
                <p className="text-xs opacity-80 mt-2">{text.maxYears}</p>
              </div>

              {/* Fee Calculation */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CurrencyCircleDollar size={20} weight="duotone" />
                  {text.feeCalculation}
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-80">{text.baseFee}:</span>
                    <span className="font-semibold">৳{baseFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">{text.perDay}:</span>
                    <span className="font-semibold">৳{dailyFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">{renewalDays} {text.days}:</span>
                    <span className="font-semibold">৳{renewalFee.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/30 flex justify-between items-center">
                  <span className="font-semibold">{text.renewalFee}:</span>
                  <span className="text-2xl font-bold text-yellow-300">৳{renewalFee.toLocaleString()}</span>
                </div>
              </div>

              {/* New Expiry Date */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} weight="duotone" />
                    <span className="text-sm font-semibold">{text.newExpiryDate}:</span>
                  </div>
                  <span className="font-bold text-yellow-300">{calculateNewExpiryDate()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {text.cancel}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleProceedToPayment}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-white text-green-600 hover:bg-white/90 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                      {text.processing}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} weight="duotone" />
                      {text.proceedPayment}
                    </>
                  )}
                </motion.button>
              </div>

              <p className="text-xs text-center mt-4 opacity-80">
                {language === 'en' 
                  ? 'Renewing will extend both your vehicle registration and tax token validity'
                  : 'নবায়ন আপনার যানবাহন নিবন্ধন এবং ট্যাক্স টোকেন উভয়ের বৈধতা বাড়াবে'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaxTokenRenewalModal;
