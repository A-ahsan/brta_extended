import React from 'react';
import { motion } from 'framer-motion';
import {
  CalendarBlank,
  MapPin,
  Clock,
  CheckCircle,
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';

const AdminSlots = () => {
  const { language } = useLanguage();
  const t = translations[language];

  const testSlots = [
    { id: 1, center: 'Mirpur Test Center', date: '2025-11-20', time: '10:00 AM', slots: 25, booked: 18, available: 7 },
    { id: 2, center: 'Banani Test Center', date: '2025-11-20', time: '2:00 PM', slots: 20, booked: 15, available: 5 },
    { id: 3, center: 'Uttara Test Center', date: '2025-11-21', time: '10:00 AM', slots: 30, booked: 22, available: 8 },
    { id: 4, center: 'Dhanmondi Test Center', date: '2025-11-21', time: '2:00 PM', slots: 25, booked: 20, available: 5 },
    { id: 5, center: 'Gulshan Test Center', date: '2025-11-22', time: '10:00 AM', slots: 28, booked: 25, available: 3 },
    { id: 6, center: 'Mohakhali Test Center', date: '2025-11-22', time: '2:00 PM', slots: 22, booked: 10, available: 12 },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 p-1 rounded-2xl"
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {t.manageSlots}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'en' ? 'Manage test center schedules and availability' : 'পরীক্ষা কেন্দ্রের সময়সূচী এবং প্রাপ্যতা পরিচালনা করুন'}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <CalendarBlank size={20} weight="bold" />
              {language === 'en' ? 'Add New Slot' : 'নতুন স্লট যোগ করুন'}
            </motion.button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testSlots.map((slot, index) => (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-2xl transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={20} weight="fill" className="text-primary" />
                      <h4 className="font-bold text-lg text-gray-800 dark:text-white">{slot.center}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <CalendarBlank size={16} />
                        {slot.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={16} />
                        {slot.time}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CheckCircle size={24} weight="duotone" className="text-primary" />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {language === 'en' ? 'Total Slots' : 'মোট স্লট'}
                    </span>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">{slot.slots}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {language === 'en' ? 'Booked' : 'বুক করা হয়েছে'}
                    </span>
                    <span className="font-bold text-lg text-yellow-600 dark:text-yellow-400">{slot.booked}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {language === 'en' ? 'Available' : 'উপলব্ধ'}
                    </span>
                    <span className="font-bold text-lg text-success dark:text-green-400">{slot.available}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <span>{language === 'en' ? 'Booking Progress' : 'বুকিং অগ্রগতি'}</span>
                    <span>{Math.round((slot.booked / slot.slots) * 100)}%</span>
                  </div>
                  <div className="relative bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(slot.booked / slot.slots) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={`h-full rounded-full ${
                        (slot.booked / slot.slots) > 0.8 
                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                          : (slot.booked / slot.slots) > 0.5 
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' 
                          : 'bg-gradient-to-r from-primary to-green-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-semibold text-sm transition-all"
                  >
                    {language === 'en' ? 'Edit' : 'সম্পাদনা'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg font-semibold text-sm transition-all"
                  >
                    {language === 'en' ? 'Details' : 'বিস্তারিত'}
                  </motion.button>
                </div>

                {/* Alert for nearly full slots */}
                {(slot.booked / slot.slots) > 0.8 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <p className="text-xs text-red-700 dark:text-red-400 font-semibold text-center">
                      {language === 'en' ? '⚠️ Nearly Full' : '⚠️ প্রায় পূর্ণ'}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(AdminSlots);
