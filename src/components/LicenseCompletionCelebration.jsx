import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  ArrowRight,
  CalendarBlank,
  IdentificationCard,
  Plus
} from 'phosphor-react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../contexts/AppContext';

const LicenseCompletionCelebration = ({ application, license, onViewLicense, showAnimation = false }) => {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  useEffect(() => {
    // Only trigger confetti if showAnimation is true (for latest license)
    if (!showAnimation) return;

    // Trigger confetti celebration
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from different positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, [showAnimation]);

  const expiryDate = license?.expiry_date 
    ? new Date(license.expiry_date).toLocaleDateString(isEnglish ? 'en-US' : 'bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Success Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 360, 360]
          }}
          transition={{ 
            duration: 0.6,
            times: [0, 0.5, 1]
          }}
          className="inline-block"
        >
          <CheckCircle 
            size={80} 
            weight="fill" 
            className="text-green-500 drop-shadow-lg"
          />
        </motion.div>

        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
          {isEnglish ? 'Congratulations!' : 'অভিনন্দন!'}
        </h2>
        
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {isEnglish 
            ? 'Your driving license has been generated successfully!' 
            : 'আপনার ড্রাইভিং লাইসেন্স সফলভাবে তৈরি হয়েছে!'}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700 dark:text-green-300 font-semibold">
          <IdentificationCard size={20} weight="duotone" />
          <span>{license?.license_number || application?.application_number}</span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-2xl p-6 shadow-xl border-2 border-green-200 dark:border-green-800"
      >
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span>{isEnglish ? 'Quick Actions' : 'দ্রুত কাজ'}</span>
        </h3>

        <div className="flex justify-center">
          {/* View License */}
          <motion.button
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={onViewLicense}
            className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <IdentificationCard size={28} weight="duotone" />
            <div className="text-left">
              <div className="text-lg font-semibold">
                {isEnglish ? 'View Full License' : 'সম্পূর্ণ লাইসেন্স দেখুন'}
              </div>
              <div className="text-sm opacity-90">
                {isEnglish ? 'See details & download' : 'বিবরণ দেখুন ও ডাউনলোড'}
              </div>
            </div>
            <ArrowRight size={24} className="ml-auto" />
          </motion.button>
        </div>
      </motion.div>

      {/* What's Next Section */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
      >
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          {isEnglish ? "What's Next?" : 'পরবর্তী কি?'}
        </h3>

        <div className="space-y-4">
          {/* Renewal Info */}
          <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-l-4 border-amber-500">
            <CalendarBlank size={24} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" weight="duotone" />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white">
                {isEnglish ? 'License Renewal' : 'লাইসেন্স নবায়ন'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {isEnglish 
                  ? `Your license expires on ${expiryDate}. You can renew it before expiry.`
                  : `আপনার লাইসেন্স ${expiryDate} তারিখে মেয়াদ শেষ হবে। মেয়াদ শেষ হওয়ার আগে নবায়ন করতে পারবেন।`}
              </p>
            </div>
          </div>

          {/* Additional License */}
          <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-l-4 border-blue-500">
            <Plus size={24} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" weight="duotone" />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white">
                {isEnglish ? 'Apply for Additional License' : 'অতিরিক্ত লাইসেন্সের জন্য আবেদন'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {isEnglish 
                  ? 'You can apply for other license types (Light/Motor) or categories (Professional/Non-Professional).'
                  : 'আপনি অন্যান্য লাইসেন্স ধরন (Light/Motor) বা ক্যাটাগরি (Professional/Non-Professional) এর জন্য আবেদন করতে পারেন।'}
              </p>
            </div>
          </div>

          {/* How to Use */}
          <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-green-500">
            <IdentificationCard size={24} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-1" weight="duotone" />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white">
                {isEnglish ? 'How to Use Your License' : 'আপনার লাইসেন্স কিভাবে ব্যবহার করবেন'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {isEnglish 
                  ? 'View your license in the Profile section. Download the PDF for physical copy. Keep it with you while driving.'
                  : 'প্রোফাইল সেকশনে আপনার লাইসেন্স দেখুন। ফিজিক্যাল কপির জন্য PDF ডাউনলোড করুন। গাড়ি চালানোর সময় সাথে রাখুন।'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LicenseCompletionCelebration;
