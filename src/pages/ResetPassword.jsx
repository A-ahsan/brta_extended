import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LockKey, Eye, EyeSlash, CheckCircle, XCircle, ShieldCheck, ArrowLeft } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import PasswordStrengthMeter, { validatePassword } from '../components/PasswordStrengthMeter';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone');

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Redirect if no phone provided
  useEffect(() => {
    if (!phone) {
      toast.error(language === 'en' ? 'Invalid reset request' : 'অবৈধ রিসেট অনুরোধ');
      navigate('/forgot-password');
    } else {
      // Auto-focus first OTP input when page loads
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 300);
    }
  }, [phone, language, navigate]);

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Clear error
    if (errors.otp) setErrors({ ...errors, otp: '' });

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = pastedData.split('');
    
    while (newOtp.length < 6) newOtp.push('');
    
    setOtp(newOtp);
    
    // Focus last filled input or first empty
    const lastIndex = pastedData.length - 1;
    if (lastIndex >= 0 && lastIndex < 6) {
      otpRefs[lastIndex].current?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 6 && !otpVerified && !isLoading) {
      handleVerifyOtp();
    }
  }, [otp]);

  // Verify OTP
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setErrors({ ...errors, otp: language === 'en' ? 'Please enter complete OTP' : 'সম্পূর্ণ OTP লিখুন' });
      toast.error(language === 'en' ? 'Please enter 6-digit OTP' : '৬-সংখ্যার OTP লিখুন');
      return;
    }

    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';
      const response = await fetch(`${backendUrl}/api/auth/verify-otp-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, otp: otpCode, language }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpVerified(true);
        toast.success(data.message);
      } else {
        setErrors({ ...errors, otp: data.error });
        toast.error(data.error + (data.attemptsLeft ? ` (${data.attemptsLeft} attempts left)` : ''));
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error(language === 'en' ? 'Network error. Please try again' : 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, newPassword: value });
    if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, confirmPassword: value });
    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
  };

  // Submit new password
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password strength
    if (!validatePassword(formData.newPassword)) {
      setErrors({
        ...errors,
        newPassword: language === 'en' 
          ? 'Password does not meet requirements' 
          : 'পাসওয়ার্ড প্রয়োজনীয়তা পূরণ করেনি'
      });
      toast.error(language === 'en' 
        ? 'Please meet all password requirements' 
        : 'সকল পাসওয়ার্ড প্রয়োজনীয়তা পূরণ করুন'
      );
      return;
    }

    // Check if passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({
        ...errors,
        confirmPassword: language === 'en' 
          ? 'Passwords do not match' 
          : 'পাসওয়ার্ড মিলছে না'
      });
      toast.error(language === 'en' ? 'Passwords do not match' : 'পাসওয়ার্ড মিলছে না');
      return;
    }

    setIsLoading(true);

    try {
      const otpCode = otp.join('');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';
      
      const response = await fetch(`${backendUrl}/api/auth/reset-password-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          otp: otpCode,
          newPassword: formData.newPassword,
          language,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResetSuccess(true);
        toast.success(data.message);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        toast.error(data.error || (language === 'en' ? 'Failed to reset password' : 'পাসওয়ার্ড রিসেট করতে ব্যর্থ'));
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(language === 'en' ? 'Network error. Please try again' : 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন');
    } finally {
      setIsLoading(false);
    }
  };

  // Request new OTP
  const handleResendOtp = async () => {
    setIsLoading(true);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';
      const response = await fetch(`${backendUrl}/api/auth/request-otp-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, language }),
      });

      const data = await response.json();

      if (data.success) {
        setOtp(['', '', '', '', '', '']);
        setOtpVerified(false);
        toast.success(language === 'en' ? 'New OTP sent to your email' : 'নতুন OTP আপনার ইমেইলে পাঠানো হয়েছে');
        otpRefs[0].current?.focus();
      } else {
        toast.error(data.error || (language === 'en' ? 'Failed to send OTP' : 'OTP পাঠাতে ব্যর্থ'));
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(language === 'en' ? 'Network error' : 'নেটওয়ার্ক ত্রুটি');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center"
        >
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
            {language === 'en' ? 'Password Reset Successful!' : 'পাসওয়ার্ড রিসেট সফল!'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {language === 'en' 
              ? 'Your password has been changed successfully. Redirecting to login...' 
              : 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। লগইনে পুনঃনির্দেশিত হচ্ছে...'
            }
          </p>
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
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
          {/* Title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-primary to-green-600 rounded-full">
                <ShieldCheck size={32} weight="bold" className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              {language === 'en' ? 'Reset Password' : 'পাসওয়ার্ড রিসেট করুন'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {language === 'en' 
                ? 'Enter the OTP sent to your email' 
                : 'আপনার ইমেইলে পাঠানো OTP লিখুন'
              }
            </p>
            <p className="text-xs text-primary font-semibold">{phone}</p>
          </div>

          {!otpVerified ? (
            /* OTP Input Section */
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {language === 'en' ? 'Enter 6-Digit OTP' : '৬-সংখ্যার OTP লিখুন'}
                </label>
                
                <div className="flex justify-center gap-2 mb-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={otpRefs[index]}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={`w-12 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700/50 border-2 ${
                        errors.otp 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-primary'
                      } rounded-xl focus:ring-2 focus:outline-none dark:text-white transition-all`}
                    />
                  ))}
                </div>
                
                {errors.otp && (
                  <p className="text-sm text-red-600 dark:text-red-400 text-center flex items-center justify-center gap-1">
                    <XCircle size={16} weight="fill" /> {errors.otp}
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.join('').length !== 6}
                className="w-full bg-gradient-to-r from-primary to-green-700 text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {language === 'en' ? 'Verifying...' : 'যাচাই হচ্ছে...'}
                  </>
                ) : (
                  <>
                    <CheckCircle size={22} weight="bold" />
                    {language === 'en' ? 'Verify OTP' : 'OTP যাচাই করুন'}
                  </>
                )}
              </motion.button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-sm text-primary hover:text-primary-dark font-semibold transition-colors disabled:opacity-50"
                >
                  {language === 'en' ? "Didn't receive OTP? Resend" : 'OTP পাননি? পুনরায় পাঠান'}
                </button>
              </div>
            </div>
          ) : (
            /* Password Reset Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
                <p className="text-sm text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
                  <CheckCircle size={18} weight="fill" />
                  {language === 'en' ? 'OTP verified successfully!' : 'OTP সফলভাবে যাচাই হয়েছে!'}
                </p>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'en' ? 'New Password' : 'নতুন পাসওয়ার্ড'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockKey size={20} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 ${
                      errors.newPassword 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-primary'
                    } rounded-xl focus:ring-2 focus:outline-none focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder-gray-400 transition-all`}
                    autoFocus
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
              </div>

              {/* Password Strength Meter */}
              {formData.newPassword && (
                <PasswordStrengthMeter password={formData.newPassword} language={language} />
              )}

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'en' ? 'Confirm Password' : 'পাসওয়ার্ড নিশ্চিত করুন'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockKey size={20} className="text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 ${
                      errors.confirmPassword 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-primary'
                    } rounded-xl focus:ring-2 focus:outline-none focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder-gray-400 transition-all`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeSlash size={22} /> : <Eye size={22} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <XCircle size={16} weight="fill" /> {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading || !validatePassword(formData.newPassword)}
                className="w-full bg-gradient-to-r from-primary to-green-700 text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {language === 'en' ? 'Resetting...' : 'রিসেট হচ্ছে...'}
                  </>
                ) : (
                  <>
                    <CheckCircle size={22} weight="bold" />
                    {language === 'en' ? 'Reset Password' : 'পাসওয়ার্ড রিসেট করুন'}
                  </>
                )}
              </motion.button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-green-400 transition-colors"
            >
              <ArrowLeft size={18} />
              {language === 'en' ? 'Back to Login' : 'লগইন এ ফিরে যান'}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
