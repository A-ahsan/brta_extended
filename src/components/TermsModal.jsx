import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'phosphor-react';

const TermsModal = ({ isOpen, onClose, language = 'en' }) => {
  if (!isOpen) return null;

  const terms = {
    en: {
      title: 'Terms & Conditions',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By accessing and using the BRTA Smart Transport Portal, you accept and agree to be bound by the terms and provision of this agreement.'
        },
        {
          title: '2. Use License',
          content: 'Permission is granted to temporarily access the BRTA services for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.'
        },
        {
          title: '3. User Account',
          content: 'You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.'
        },
        {
          title: '4. Privacy Policy',
          content: 'Your personal information will be handled in accordance with Bangladesh government data protection regulations. We will not share your personal information with third parties without your consent.'
        },
        {
          title: '5. Service Availability',
          content: 'We strive to provide uninterrupted service but cannot guarantee 100% uptime. We reserve the right to modify or discontinue services with or without notice.'
        },
        {
          title: '6. Payment Terms',
          content: 'All payments made through this portal are subject to verification. Transaction fees may apply. Refunds will be processed as per government policy.'
        },
        {
          title: '7. Prohibited Activities',
          content: 'Users must not: provide false information, attempt to hack the system, misuse services, or violate any applicable laws.'
        },
        {
          title: '8. Limitation of Liability',
          content: 'BRTA shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use the service.'
        },
        {
          title: '9. Changes to Terms',
          content: 'We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the modified terms.'
        },
        {
          title: '10. Governing Law',
          content: 'These terms shall be governed by and construed in accordance with the laws of Bangladesh, and you submit to the exclusive jurisdiction of the courts of Bangladesh.'
        }
      ],
      understand: 'I Understand',
      close: 'Close'
    },
    bn: {
      title: 'শর্তাবলী',
      sections: [
        {
          title: '১. শর্তাবলী গ্রহণ',
          content: 'BRTA স্মার্ট ট্রান্সপোর্ট পোর্টাল অ্যাক্সেস এবং ব্যবহার করে, আপনি এই চুক্তির শর্ত এবং বিধান দ্বারা আবদ্ধ হতে স্বীকার করেন এবং সম্মত হন।'
        },
        {
          title: '২. ব্যবহারের লাইসেন্স',
          content: 'ব্যক্তিগত, অ-বাণিজ্যিক ক্ষণস্থায়ী দেখার জন্য শুধুমাত্র BRTA সেবাগুলিতে অস্থায়ীভাবে অ্যাক্সেসের অনুমতি দেওয়া হয়েছে। এটি একটি লাইসেন্স প্রদান, শিরোনাম স্থানান্তর নয়।'
        },
        {
          title: '৩. ব্যবহারকারী অ্যাকাউন্ট',
          content: 'আপনার অ্যাকাউন্ট এবং পাসওয়ার্ডের গোপনীয়তা বজায় রাখার জন্য আপনি দায়ী। আপনার অ্যাকাউন্টের অধীনে ঘটতে থাকা সমস্ত কার্যকলাপের জন্য দায়িত্ব গ্রহণ করতে আপনি সম্মত হন।'
        },
        {
          title: '৪. গোপনীয়তা নীতি',
          content: 'আপনার ব্যক্তিগত তথ্য বাংলাদেশ সরকারের ডেটা সুরক্ষা নিয়মাবলী অনুযায়ী পরিচালনা করা হবে। আমরা আপনার সম্মতি ছাড়া তৃতীয় পক্ষের সাথে আপনার ব্যক্তিগত তথ্য শেয়ার করব না।'
        },
        {
          title: '৫. সেবার প্রাপ্যতা',
          content: 'আমরা নিরবচ্ছিন্ন সেবা প্রদান করার চেষ্টা করি কিন্তু ১০০% আপটাইম নিশ্চিত করতে পারি না। নোটিশ সহ বা ছাড়াই সেবা পরিবর্তন বা বন্ধ করার অধিকার আমরা সংরক্ষণ করি।'
        },
        {
          title: '৬. পেমেন্ট শর্তাবলী',
          content: 'এই পোর্টালের মাধ্যমে করা সমস্ত পেমেন্ট যাচাইয়ের সাপেক্ষে। লেনদেন ফি প্রযোজ্য হতে পারে। সরকারি নীতি অনুযায়ী রিফান্ড প্রক্রিয়া করা হবে।'
        },
        {
          title: '৭. নিষিদ্ধ কার্যকলাপ',
          content: 'ব্যবহারকারীদের অবশ্যই: মিথ্যা তথ্য প্রদান করা, সিস্টেম হ্যাক করার চেষ্টা, সেবার অপব্যবহার, বা প্রযোজ্য কোনো আইন লঙ্ঘন করা থেকে বিরত থাকতে হবে।'
        },
        {
          title: '৮. দায়বদ্ধতার সীমাবদ্ধতা',
          content: 'আপনার সেবা ব্যবহার বা ব্যবহারে অক্ষমতার ফলে সৃষ্ট কোনো পরোক্ষ, আনুষঙ্গিক, বিশেষ, ফলস্বরূপ বা শাস্তিমূলক ক্ষতির জন্য BRTA দায়বদ্ধ থাকবে না।'
        },
        {
          title: '৯. শর্তাবলীর পরিবর্তন',
          content: 'আমরা যেকোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার সংরক্ষণ করি। পরিবর্তনের পরে সেবার ক্রমাগত ব্যবহার পরিবর্তিত শর্তাবলী গ্রহণের গঠন করে।'
        },
        {
          title: '১০. প্রযোজ্য আইন',
          content: 'এই শর্তাবলী বাংলাদেশের আইন দ্বারা পরিচালিত এবং ব্যাখ্যা করা হবে, এবং আপনি বাংলাদেশের আদালতের একচেটিয়া এখতিয়ারে জমা দেন।'
        }
      ],
      understand: 'আমি বুঝেছি',
      close: 'বন্ধ করুন'
    }
  };

  const t = terms[language];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {t.sections.map((section, index) => (
              <div key={index} className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-primary to-green-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              {t.understand}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              {t.close}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TermsModal;
