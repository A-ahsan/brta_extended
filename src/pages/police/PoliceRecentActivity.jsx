import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Warning,
  User,
  Clock,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';

const PoliceRecentActivity = () => {
  const { language } = useLanguage();
  const t = translations[language];

  const recentChecks = [
    { id: 1, plate: 'ঢাকা মেট্রো-গ-১২৩৪৫৬', model: 'Toyota Corolla', status: 'Valid', time: '10:30 AM', officer: 'Officer Rahman', location: 'Uttara Checkpoint' },
    { id: 2, plate: 'ঢাকা মেট্রো-খ-৭৮৯০১২', model: 'Honda Civic', status: 'Expired', time: '10:25 AM', officer: 'Officer Karim', location: 'Mohakhali Flyover' },
    { id: 3, plate: 'চট্টগ্রাম-ক-৫৬৭৮৯০', model: 'Suzuki Alto', status: 'Fined', time: '10:20 AM', officer: 'Officer Sultana', location: 'Gulshan-2 Circle' },
    { id: 4, plate: 'সিলেট-গ-২৩৪৫৬৭', model: 'Nissan X-Trail', status: 'Valid', time: '10:15 AM', officer: 'Officer Haque', location: 'Banani Checkpoint' },
    { id: 5, plate: 'রাজশাহী-খ-৩৪৫৬৭৮', model: 'Mitsubishi Pajero', status: 'Valid', time: '10:10 AM', officer: 'Officer Ahmed', location: 'Mirpur-10' },
    { id: 6, plate: 'খুলনা-গ-৪৫৬৭৮৯', model: 'Toyota Axio', status: 'Fined', time: '10:05 AM', officer: 'Officer Begum', location: 'Dhanmondi 27' },
    { id: 7, plate: 'বরিশাল-ক-৫৬৭৮৯০', model: 'Honda CR-V', status: 'Valid', time: '10:00 AM', officer: 'Officer Khan', location: 'Karwan Bazar' },
    { id: 8, plate: 'রংপুর-খ-৬৭৮৯০১', model: 'Suzuki Vitara', status: 'Expired', time: '9:55 AM', officer: 'Officer Nasrin', location: 'Tejgaon Link Road' },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Valid':
        return <CheckCircle size={24} weight="fill" className="text-success" />;
      case 'Expired':
        return <XCircle size={24} weight="fill" className="text-danger" />;
      case 'Fined':
        return <Warning size={24} weight="fill" className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Valid':
        return 'bg-success/20 text-success border-success';
      case 'Expired':
        return 'bg-danger/20 text-danger border-danger';
      case 'Fined':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {language === 'en' ? 'Recent Activity' : 'সাম্প্রতিক কার্যকলাপ'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'en' ? 'Live feed of vehicle verification checks across all checkpoints' : 'সমস্ত চেকপয়েন্ট জুড়ে যানবাহন যাচাইকরণ পরীক্ষার লাইভ ফিড'}
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[21px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-green-500 to-primary-dark"></div>

            <div className="space-y-6">
              {recentChecks.map((check, index) => (
                <motion.div
                  key={check.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex gap-6 group"
                >
                  {/* Timeline Dot */}
                  <div className="relative flex-shrink-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.05 + 0.2 }}
                      className="w-11 h-11 rounded-full bg-white dark:bg-gray-800 border-4 border-primary shadow-lg flex items-center justify-center z-10 group-hover:scale-110 transition-transform"
                    >
                      {getStatusIcon(check.status)}
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
                      className="absolute inset-0 w-11 h-11 rounded-full bg-primary"
                    />
                  </div>

                  {/* Content Card */}
                  <motion.div
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="flex-1 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-md hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-gray-800 dark:text-white">
                            {check.plate}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(check.status)}`}>
                            {t[check.status.toLowerCase()] || check.status}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">{check.model}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                          <Clock size={16} />
                          <span>{check.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2 text-sm">
                        <User size={18} className="text-primary" />
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Officer' : 'অফিসার'}</p>
                          <p className="font-semibold text-gray-700 dark:text-gray-300">{check.officer}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{language === 'en' ? 'Location' : 'অবস্থান'}</p>
                          <p className="font-semibold text-gray-700 dark:text-gray-300">{check.location}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Indicator */}
                    {check.status !== 'Valid' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          check.status === 'Expired' ? 'bg-danger/10 text-danger' : 'bg-yellow-500/10 text-yellow-600'
                        }`}>
                          {check.status === 'Expired' && (language === 'en' ? '⚠️ Action Required: Documents Expired' : '⚠️ পদক্ষেপ প্রয়োজন: নথি মেয়াদ শেষ')}
                          {check.status === 'Fined' && (language === 'en' ? '⚠️ Outstanding Fines Detected' : '⚠️ বকেয়া জরিমানা সনাক্ত')}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Load More */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <button className="px-8 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105">
              {language === 'en' ? 'Load More Activity' : 'আরো কার্যকলাপ লোড করুন'}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(PoliceRecentActivity);
