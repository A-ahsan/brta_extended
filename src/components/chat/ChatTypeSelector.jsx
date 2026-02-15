import { motion } from 'framer-motion';
import { Robot, UserCircle, Clock } from 'phosphor-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ChatTypeSelector({ language, onSelectType, onClose }) {
  const [adminOnline, setAdminOnline] = useState(0);
  const [isWorkingHours, setIsWorkingHours] = useState(false);

  useEffect(() => {
    checkAdminAvailability();
    checkWorkingHours();

    // Subscribe to admin presence changes
    const channel = supabase
      .channel('admin-presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_presence'
        },
        () => {
          checkAdminAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_presence')
        .select('admin_id, is_available, current_active_chats, max_concurrent_chats')
        .eq('is_available', true);

      if (error) throw error;

      // Count admins who can take more chats
      const availableCount = data?.filter(
        admin => admin.current_active_chats < admin.max_concurrent_chats
      ).length || 0;

      setAdminOnline(availableCount);
    } catch (error) {
      console.error('Error checking admin availability:', error);
      setAdminOnline(0);
    }
  };

  const checkWorkingHours = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Working hours: 10 AM - 5 PM, Sunday (0) to Thursday (4)
    const isWorking = (day >= 0 && day <= 4) && (hour >= 10 && hour < 17);
    setIsWorkingHours(isWorking);
  };

  const isEnglish = language === 'en';

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-xl w-full">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 overflow-hidden">
          <img src="/bot.png" alt="BRTA" className="w-16 h-16 object-cover rounded-full" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {isEnglish ? 'How would you like assistance?' : 'আপনি কীভাবে সহায়তা চান?'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {isEnglish
            ? 'Choose your preferred method of support'
            : 'আপনার পছন্দের সহায়তা পদ্ধতি বেছে নিন'}
        </p>

        {/* Working Hours Notice */}
        {!isWorkingHours && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2 text-sm"
          >
            <Clock size={20} className="text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
            <p className="text-yellow-800 dark:text-yellow-300 text-left">
              {isEnglish
                ? 'Live chat support: 10 AM - 5 PM (Sun-Thu). Outside hours, you can leave a message.'
                : 'লাইভ চ্যাট সহায়তা: সকাল ১০টা - বিকাল ৫টা (রবি-বৃহঃ)। সময়ের বাইরে আপনি বার্তা রাখতে পারেন।'}
            </p>
          </motion.div>
        )}

        {/* Chat Type Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* AI Chat Option */}
          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectType('ai_chat')}
            className="group relative p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary/30 overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Content */}
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Robot size={32} weight="duotone" className="text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                {isEnglish ? 'AI Assistant' : 'AI সহায়ক'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {isEnglish
                  ? 'Instant automated responses'
                  : 'তাৎক্ষণিক স্বয়ংক্রিয় উত্তর'}
              </p>
              <ul className="text-xs text-left space-y-1 text-gray-500 dark:text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  {isEnglish ? '24/7 Available' : '২৪/৭ উপলব্ধ'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  {isEnglish ? 'Instant replies' : 'তাৎক্ষণিক উত্তর'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  {isEnglish ? 'Smart assistance' : 'স্মার্ট সহায়তা'}
                </li>
              </ul>
            </div>

            {/* Badge */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold">
              {isEnglish ? 'Fast' : 'দ্রুত'}
            </div>
          </motion.button>

          {/* Live Chat Option */}
          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectType('live_chat')}
            className="group relative p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary/30 overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Content */}
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <UserCircle size={32} weight="duotone" className="text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                {isEnglish ? 'Live Chat' : 'লাইভ চ্যাট'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {isEnglish
                  ? 'Talk to a real admin'
                  : 'প্রকৃত প্রশাসকের সাথে কথা বলুন'}
              </p>
              <ul className="text-xs text-left space-y-1 text-gray-500 dark:text-gray-500">
                <li className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${adminOnline > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  {adminOnline > 0
                    ? isEnglish
                      ? `${adminOnline} admin${adminOnline > 1 ? 's' : ''} online`
                      : `${adminOnline} জন প্রশাসক অনলাইন`
                    : isEnglish
                    ? 'Leave a message'
                    : 'বার্তা রাখুন'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  {isEnglish ? 'Human support' : 'মানব সহায়তা'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  {isEnglish ? 'Personalized help' : 'ব্যক্তিগত সহায়তা'}
                </li>
              </ul>
            </div>

            {/* Badge */}
            {adminOnline > 0 && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold animate-pulse">
                {isEnglish ? 'Online' : 'অনলাইন'}
              </div>
            )}
          </motion.button>
        </div>

        {/* Back Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="mt-6 px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
        >
          {isEnglish ? '← Go Back' : '← ফিরে যান'}
        </motion.button>
      </div>
    </div>
  );
}
