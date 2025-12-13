import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { User, EnvelopeSimple, LockKey, Phone, Eye, EyeSlash, UserPlus, Warning } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import toast from 'react-hot-toast';
import PasswordStrengthMeter, { validatePassword } from '../components/PasswordStrengthMeter';
import { validateEmail } from '../utils/emailValidation';
import TermsModal from '../components/TermsModal';

const Signup = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { signUp } = useAuth();
  const t = translations[language];
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [emailValidation, setEmailValidation] = useState({ isValid: true, message: '' });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agree: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    const emailCheck = validateEmail(formData.email, language);
    if (!emailCheck.isValid) {
      toast.error(emailCheck.message);
      setEmailValidation(emailCheck);
      return;
    }

    // Validate password strength
    if (!validatePassword(formData.password)) {
      toast.error(language === 'en' 
        ? 'Password must meet all requirements' 
        : 'পাসওয়ার্ড সকল প্রয়োজনীয়তা পূরণ করতে হবে'
      );
      return;
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error(language === 'en' ? 'Passwords do not match!' : 'পাসওয়ার্ড মিলছে না!');
      return;
    }

    if (!formData.agree) {
      toast.error(language === 'en' ? 'Please agree to terms and conditions' : 'অনুগ্রহ করে শর্তাবলীতে সম্মত হন');
      return;
    }

    // Request OTP
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://localhost:5000';
      const response = await fetch(`${backendUrl}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, language, skipUserCheck: true }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(language === 'en' 
          ? 'OTP sent to your email!' 
          : 'আপনার ইমেইলে OTP পাঠানো হয়েছে!'
        );
        setShowOtpModal(true);
      } else {
        toast.error(data.message || (language === 'en' ? 'Failed to send OTP' : 'OTP পাঠাতে ব্যর্থ'));
      }
    } catch (error) {
      console.error('Request OTP error:', error);
      toast.error(language === 'en' ? 'Failed to send OTP' : 'OTP পাঠাতে ব্যর্থ');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-focus first OTP input when modal opens
  useEffect(() => {
    if (showOtpModal) {
      setTimeout(() => {
        document.getElementById('otp-0')?.focus();
      }, 100);
    }
  }, [showOtpModal]);

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    const otp = otpCode.join('');
    if (otp.length === 6 && showOtpModal && !otpLoading) {
      handleOtpSubmit();
    }
  }, [otpCode]);

  const handleOtpSubmit = async () => {
    const otp = otpCode.join('');
    if (otp.length !== 6) {
      toast.error(language === 'en' ? 'Please enter complete OTP' : 'সম্পূর্ণ OTP লিখুন');
      return;
    }

    setOtpLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://localhost:5000';
      
      // Verify OTP
      const verifyResponse = await fetch(`${backendUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const verifyData = await verifyResponse.json();
      
      if (verifyResponse.ok) {
        // OTP verified, proceed with signup
        const result = await signUp(formData.email, formData.password, formData.fullName, formData.phone);

        if (result.success) {
          setShowOtpModal(false);
          const userName = result.userName || formData.fullName;
          toast.success(language === 'en' 
            ? `Welcome to BRTA, ${userName}` 
            : `BRTA তে স্বাগতম, ${userName}`
          );
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        }
      } else {
        toast.error(verifyData.message || (language === 'en' ? 'Invalid OTP' : 'ভুল OTP'));
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(language === 'en' ? 'Verification failed' : 'যাচাই ব্যর্থ');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.slice(0, 6).split('');
      const newOtpCode = [...otpCode];
      pastedData.forEach((char, i) => {
        if (i + index < 6) newOtpCode[i + index] = char;
      });
      setOtpCode(newOtpCode);
      
      // Focus on last filled input or next empty
      const nextIndex = Math.min(index + pastedData.length, 5);
      document.getElementById(`otp-${nextIndex}`)?.focus();
      return;
    }

    const newOtpCode = [...otpCode];
    newOtpCode[index] = value;
    setOtpCode(newOtpCode);

    // Auto focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://localhost:5000';
      const response = await fetch(`${backendUrl}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, language, skipUserCheck: true }),
      });

      if (response.ok) {
        setOtpCode(['', '', '', '', '', '']);
        toast.success(language === 'en' ? 'New OTP sent!' : 'নতুন OTP পাঠানো হয়েছে!');
      }
    } catch (error) {
      toast.error(language === 'en' ? 'Failed to resend OTP' : 'OTP পুনরায় পাঠাতে ব্যর্থ');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle email change with validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    
    if (value.length >= 3) {
      const validation = validateEmail(value, language);
      setEmailValidation(validation);
    } else {
      setEmailValidation({ isValid: true, message: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-3">

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block"
        >
          <div className="flex items-center gap-3 mb-4">
            <img src="/brta.png" alt="BRTA Logo" className="h-16 w-16 bg-white rounded-2xl p-2 shadow-lg" />
            <div>
              <h1 className="text-3xl font-extrabold text-primary dark:text-green-400">BRTA 2.0</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">{language === 'en' ? 'Smart Transport Portal' : 'স্মার্ট ট্রান্সপোর্ট পোর্টাল'}</p>
            </div>
          </div>
          
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold mb-3 leading-tight text-gray-800 dark:text-white"
          >
            {t.authTagline}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <p className="text-lg font-bold mb-3 text-danger">{t.noDalalNoDelay}</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                <span className="text-gray-700 dark:text-gray-200">{t.authBenefit1}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                <span className="text-gray-700 dark:text-gray-200">{t.authBenefit2}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span>
                <span className="text-gray-700 dark:text-gray-200">{t.authBenefit3}</span>
              </li>
            </ul>
          </motion.div>
        </motion.div>

        {/* Right Side - Signup Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 max-w-md mx-auto w-full"
        >
          <div className="text-center mb-5">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-gray-800 dark:text-white mb-2"
            >
              {language === 'en' ? 'Create Account' : 'অ্যাকাউন্ট তৈরি করুন'}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {language === 'en' ? 'Join BRTA 2.0 today' : 'আজই BRTA 2.0 এ যোগ দিন'}
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Full Name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {t.fullName}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder-gray-400 transition-all text-base"
                  autoFocus
                  required
                />
              </div>
            </motion.div>

            {/* Email */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {t.emailAddress}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeSimple size={20} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  placeholder={language === 'en' ? 'your@email.com' : 'আপনার@ইমেইল.com'}
                  className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 ${
                    !emailValidation.isValid && formData.email.length >= 3
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : emailValidation.warning && formData.email.length >= 3
                      ? 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500'
                      : 'border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-primary'
                  } rounded-xl focus:ring-2 focus:outline-none focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder-gray-400 transition-all text-base`}
                  required
                />
              </div>
              {!emailValidation.isValid && formData.email.length >= 3 && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Warning size={16} weight="fill" /> {emailValidation.message}
                </p>
              )}
              {emailValidation.warning && emailValidation.suggestion && (
                <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <Warning size={16} weight="fill" /> {emailValidation.message}
                </p>
              )}
            </motion.div>

            {/* Phone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {t.phoneNumber}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={20} className="text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder-gray-400 transition-all text-base"
                  required
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {t.password}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKey size={20} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder-gray-400 transition-all text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeSlash size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </motion.div>

            {/* Password Strength Meter */}
            {formData.password && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <PasswordStrengthMeter password={formData.password} language={language} />
              </motion.div>
            )}

            {/* Confirm Password */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {language === 'en' ? 'Confirm Password' : 'পাসওয়ার্ড নিশ্চিত করুন'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKey size={20} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder-gray-400 transition-all text-base"
                  required
                />
              </div>
            </motion.div>

            {/* Agree to Terms */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-start gap-2"
            >
              <input
                type="checkbox"
                checked={formData.agree}
                onChange={(e) => setFormData({ ...formData, agree: e.target.checked })}
                className="w-4 h-4 mt-1 text-primary border-gray-300 rounded focus:ring-primary"
                required
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {language === 'en' ? 'I agree to the' : 'আমি সম্মত'}{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-primary hover:text-primary-dark font-medium underline"
                >
                  {language === 'en' ? 'Terms & Conditions' : 'শর্তাবলী'}
                </button>
              </span>
            </motion.div>

            {/* Signup Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-green-700 text-white py-2.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {language === 'en' ? 'Creating account...' : 'অ্যাকাউন্ট তৈরি হচ্ছে...'}
                </>
              ) : (
                <>
                  <UserPlus size={22} weight="bold" />
                  {t.signup}
                </>
              )}
            </motion.button>
          </form>

          {/* Login Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 text-center"
          >
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'en' ? 'Already have an account?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}{' '}
              <Link to="/login" className="text-primary hover:text-primary-dark font-bold transition-colors">
                {t.login}
              </Link>
            </p>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-3 text-center"
          >
            <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-green-400 transition-colors">
              ← {language === 'en' ? 'Back to Home' : 'হোম এ ফিরে যান'}
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <TermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          language={language}
        />
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvelopeSimple size={32} weight="duotone" className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {language === 'en' ? 'Verify Your Email' : 'আপনার ইমেইল যাচাই করুন'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'en' 
                  ? `Enter the 6-digit code sent to ${formData.email}` 
                  : `${formData.email} এ পাঠানো ৬-সংখ্যার কোড লিখুন`
                }
              </p>
            </div>

            {/* OTP Input */}
            <div className="flex gap-2 justify-center mb-6">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="6"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOtpSubmit}
                disabled={otpLoading}
                className="w-full bg-gradient-to-r from-primary to-green-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {otpLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {language === 'en' ? 'Verifying...' : 'যাচাই করা হচ্ছে...'}
                  </div>
                ) : (
                  language === 'en' ? 'Verify & Sign Up' : 'যাচাই করুন এবং নিবন্ধন করুন'
                )}
              </motion.button>

              <button
                onClick={handleResendOtp}
                disabled={otpLoading}
                className="w-full text-primary hover:text-primary-dark font-semibold py-2 disabled:opacity-50"
              >
                {language === 'en' ? 'Resend OTP' : 'পুনরায় OTP পাঠান'}
              </button>

              <button
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpCode(['', '', '', '', '', '']);
                }}
                className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-2"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Signup;
