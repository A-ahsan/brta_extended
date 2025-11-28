import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MegaphoneSimple, X, Sparkle, CalendarBlank, CurrencyDollar, DeviceMobile, Lightning } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const NoticesTicker = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [tickerNotices, setTickerNotices] = useState([]);

  // Fetch ticker notices from database
  useEffect(() => {
    const fetchTickerNotices = async () => {
      try {
        const { data, error } = await supabase
          .from('notices')
          .select('title_en, title_bn, badge')
          .eq('is_active', true)
          .eq('show_in_ticker', true)
          .order('publish_date', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setTickerNotices(data.map(notice => ({
            en: notice.badge ? `${notice.badge}: ${notice.title_en}` : notice.title_en,
            bn: notice.badge ? `${notice.badge}: ${notice.title_bn}` : notice.title_bn,
            badge: notice.badge
          })));
        }
      } catch (error) {
        console.error('Error fetching ticker notices:', error);
      }
    };

    fetchTickerNotices();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('ticker_notices_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notices' },
        () => {
          fetchTickerNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Format notices with professional badges
  const formatNotice = (notice) => {
    const text = language === 'en' ? notice.en : notice.bn;
    return text;
  };

  const noticeText = tickerNotices.length > 0 
    ? tickerNotices.map(formatNotice).join('  •  ')
    : (language === 'en' ? 'Welcome to BRTA Digital Services' : 'BRTA ডিজিটাল সেবায় স্বাগতম');

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      transition={{ duration: 0.3 }}
      className="fixed top-20 left-0 right-0 z-40 bg-gradient-to-r from-primary via-green-600 to-primary shadow-lg"
    >
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          {/* Icon */}
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
            className="flex-shrink-0"
          >
            <MegaphoneSimple size={24} className="text-white" weight="duotone" />
          </motion.div>

          {/* Scrolling Text */}
          <div 
            className="flex-1 overflow-hidden cursor-pointer"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={() => navigate('/notices')}
          >
            <motion.div
              className="whitespace-nowrap inline-block"
              animate={{
                x: isPaused ? 0 : ["0%", "-50%"]
              }}
              transition={{
                x: {
                  duration: isPaused ? 0 : 20,
                  repeat: Infinity,
                  ease: "linear",
                  repeatType: "loop"
                }
              }}
            >
              <span className="text-white font-medium text-sm md:text-base">
                {noticeText}  •  {noticeText}
              </span>
            </motion.div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition"
            aria-label="Close notice ticker"
          >
            <X size={20} className="text-white" weight="bold" />
          </button>
        </div>

        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
          animate={{
            x: [-1000, 1000]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    </motion.div>
  );
};

export default NoticesTicker;
