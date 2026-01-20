import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Phone, PaperPlaneRight, ArrowLeft, CheckCircle } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const { language } = useLanguage();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (e) => {
    const value = e.target.value.trim(); // Trim whitespace
    setPhone(value);
    
    // Clear error when typing
    if (phoneError) setPhoneError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clean phone number - remove spaces, dashes, and check format
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Extract digits only
    let phoneDigits = cleanPhone.replace(/\D/g, '');
    
    // Remove country code if present (880 or +880)
    if (phoneDigits.startsWith('880')) {
      phoneDigits = phoneDigits.substring(3);
    }
    
    // Validate: must be exactly 11 digits
    if (phoneDigits.length !== 11) {
      const errorMsg = language === 'en' 
        ? 'Phone number must be 11 digits' 
        : 'ফোন নম্বর অবশ্যই ১১ সংখ্যার হতে হবে';
      setPhoneError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    // Validate: must start with 01
    if (!phoneDigits.startsWith('01')) {
      const errorMsg = language === 'en' 
        ? 'Phone number must start with 01' 
        : 'ফোন নম্বর ০১ দিয়ে শুরু হতে হবে';
      setPhoneError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);
    setPhoneError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';
      console.log('Requesting SMS OTP from:', backendUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const response = await fetch(`${backendUrl}/api/auth/request-otp-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, language }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        setSmsSent(true);
        toast.success(data.message);
        // Navigate to reset password page with phone
        setTimeout(() => {
          window.location.href = `/reset-password?phone=${encodeURIComponent(phone)}`;
        }, 2000);
      } else {
        toast.error(data.error || (language === 'en' ? 'Failed to send OTP. Please try again.' : 'OTP পাঠাতে ব্যর্থ। আবার চেষ্টা করুন।'));
      }
    } catch (error) {
      console.error('Request OTP error:', error);
      if (error.name === 'AbortError') {
        toast.error(language === 'en' 
          ? 'Request timeout. The server is taking too long to respond. Please try again later.' 
          : 'অনুরোধ টাইমআউট। সার্ভার সাড়া দিতে অনেক সময় নিচ্ছে। পরে আবার চেষ্টা করুন।'
        );
      } else {
        toast.error(language === 'en' ? 'Network error. Please try again' : 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <img src="/brta.png" alt="BRTA Logo" className="h-20 w-20 bg-white rounded-2xl p-3 shadow-xl" />
          </div>
          <h1 className="text-3xl font-extrabold text-primary dark:text-green-400 mb-2">BRTA 2.0</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {language === 'en' ? 'Smart Transport Portal' : 'স্মার্ট ট্রান্সপোর্ট পোর্টাল'}
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8"
        >
          {!smsSent ? (
            <>
              {/* Title */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-br from-primary to-green-600 rounded-full">
                    <Phone size={32} weight="bold" className="text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  {language === 'en' ? 'Forgot Password?' : 'পাসওয়ার্ড ভুলে গেছেন?'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'en' 
                    ? "No worries! Enter your phone number and we'll send you a 6-digit OTP code via SMS" 
                    : 'চিন্তা নেই! আপনার ফোন নম্বর লিখুন এবং আমরা SMS এর মাধ্যমে আপনাকে একটি ৬-সংখ্যার OTP কোড পাঠাবো'
                  }
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'Phone Number' : 'ফোন নম্বর'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone size={20} className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder={language === 'en' ? '+880 1XXX-XXXXXX' : '+৮৮০ ১XXX-XXXXXX'}
                      className={`w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 ${
                        phoneError 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-primary'
                      } rounded-xl focus:ring-2 focus:outline-none focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder-gray-400 transition-all`}
                      autoFocus
                      required
                    />
                  </div>
                  {phoneError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span>⚠️</span> {phoneError}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-green-700 text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {language === 'en' ? 'Sending...' : 'পাঠানো হচ্ছে...'}
                    </>
                  ) : (
                    <>
                      <PaperPlaneRight size={22} weight="bold" />
                      {language === 'en' ? 'Send OTP Code' : 'OTP কোড পাঠান'}
                    </>
                  )}
                </motion.button>
              </form>
            </>
          ) : (
            <>
              {/* Success Message */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="flex justify-center mb-6"
                >
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle size={48} weight="fill" className="text-green-600 dark:text-green-400" />
                  </div>
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                  {language === 'en' ? 'Check Your Phone!' : 'আপনার ফোন চেক করুন!'}
                </h2>
                
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'en' 
                    ? 'We sent a 6-digit OTP code via SMS to:' 
                    : 'আমরা SMS এর মাধ্যমে একটি ৬-সংখ্যার OTP কোড পাঠিয়েছি:'
                  }
                </p>
                
                <p className="text-primary font-semibold mb-6">{phone}</p>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {language === 'en' 
                      ? '📱 Check your phone for the OTP SMS. Valid for 5 minutes. Redirecting...' 
                      : '📱 OTP SMS এর জন্য আপনার ফোন চেক করুন। ৫ মিনিটের জন্য বৈধ। পুনঃনির্দেশিত হচ্ছে...'
                    }
                  </p>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {language === 'en' ? "Didn't receive the SMS?" : 'SMS পাননি?'}
                </p>
                
                <button
                  onClick={() => setSmsSent(false)}
                  className="text-primary hover:text-primary-dark font-semibold transition-colors"
                >
                  {language === 'en' ? 'Send again' : 'আবার পাঠান'}
                </button>
              </div>
            </>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-green-400 transition-colors font-medium"
            >
              <ArrowLeft size={18} />
              {language === 'en' ? 'Back to Login' : 'লগইন এ ফিরে যান'}
            </Link>
          </div>
        </motion.div>

        {/* Additional Help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {language === 'en' ? 'Need help?' : 'সাহায্য প্রয়োজন?'}{' '}
            <Link to="/" className="text-primary hover:text-primary-dark font-semibold">
              {language === 'en' ? 'Contact Support' : 'সাপোর্ট যোগাযোগ'}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
