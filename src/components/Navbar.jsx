import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Globe, CaretDown } from 'phosphor-react';
import { Bell } from 'phosphor-react';
import { useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import ThemeLanguageToggler from './ThemeLanguageToggler';
import { useTheme, useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabaseClient';
import { playNotificationSound } from '../utils/notificationSound';

const Navbar = () => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const t = translations[language] || translations.en;
  const [showPanel, setShowPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Determine role based on route
  let role = null;
  if (location.pathname.startsWith('/dashboard')) role = 'user';
  else if (location.pathname.startsWith('/admin')) role = 'admin';
  else if (location.pathname.startsWith('/police')) role = 'police';

  // Fetch notifications when user is logged in and on a dashboard page
  useEffect(() => {
    if (!user || !role) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    console.log('Setting up navbar notifications for role:', role, 'user:', user.id);
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`${role}-navbar-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: role === 'user' 
            ? `user_id=eq.${user.id}`
            : `recipient_type=eq.${role}`
        },
        (payload) => {
          console.log('🔔 Navbar notification received:', payload);
          fetchNotifications();
          
          // Play notification sound for new notifications
          if (payload.eventType === 'INSERT') {
            playNotificationSound('default');
          }
        }
      )
      .subscribe((status) => {
        console.log('Navbar notification subscription status:', status);
      });

    return () => {
      console.log('Cleaning up navbar notification subscription');
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  const fetchNotifications = async () => {
    if (!user || !role) return;

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (role === 'user') {
        query = query.eq('user_id', user.id).eq('recipient_type', 'user');
      } else {
        query = query.eq('recipient_type', role);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching navbar notifications:', error);
    }
  };

  const handleNotificationClick = () => {
    setShowPanel(false);
    if (role === 'user') {
      navigate('/dashboard/notifications');
    } else if (role === 'admin') {
      navigate('/admin/notifications');
    } else if (role === 'police') {
      navigate('/police/notifications');
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm"
      style={{ transform: 'translateZ(0)' }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/brta.png" 
              alt="BRTA Logo" 
              className="h-12 w-12 object-contain transition-transform group-hover:scale-110"
            />
            <div>
              <h1 className="text-2xl font-bold text-primary dark:text-green-400">
                BRTA 2.0
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {language === 'en' ? 'Smart Transport Portal' : 'স্মার্ট ট্রান্সপোর্ট পোর্টাল'}
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/notices"
              className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-green-400 transition-colors font-medium"
            >
              {t.notices}
            </Link>
            
            {/* More Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                onBlur={() => setTimeout(() => setShowMoreMenu(false), 200)}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-green-400 transition-colors font-medium"
              >
                {t.more}
                <CaretDown size={16} className={`transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] z-50"
                  >
                    <Link
                      to="/community"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:text-green-400 transition-colors font-semibold"
                    >
                      {language === 'en' ? 'Community' : 'জনগণের রিপোর্ট'}
                    </Link>
                    <Link
                      to="/fee-calculator"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:text-green-400 transition-colors"
                    >
                      {t.feeCalculator}
                    </Link>
                    <Link
                      to="/about"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary dark:hover:text-green-400 transition-colors"
                    >
                      {t.aboutUs}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4 relative">
            <ThemeLanguageToggler />
            {/* Notification Bell only on dashboard pages */}
            {role && user && (
              <>
                <button
                  id="bell-icon"
                  className="relative p-2 rounded-full hover:bg-primary/10 transition"
                  onClick={() => setShowPanel((prev) => !prev)}
                  aria-label="Notifications"
                >
                  <Bell size={28} className="text-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {/* Notification Dropdown Panel */}
                {showPanel && (
                  <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Bell size={22} className="text-primary mr-2" />
                        <span className="font-bold text-lg capitalize">
                          {language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {unreadCount} {language === 'en' ? 'unread' : 'অপঠিত'}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <li className="italic text-gray-400 text-center py-4">
                          {language === 'en' ? 'No notifications' : 'কোন বিজ্ঞপ্তি নেই'}
                        </li>
                      ) : (
                        notifications.map((note) => (
                          <li 
                            key={note.id} 
                            className={`rounded px-3 py-2 shadow-sm border cursor-pointer transition-colors ${
                              note.is_read 
                                ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                                : 'bg-primary/5 border-primary/10'
                            } text-gray-800 dark:text-gray-200 hover:bg-primary/10`}
                          >
                            <div className="font-semibold text-sm">
                              {language === 'en' ? note.title_en : note.title_bn}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {language === 'en' ? note.message_en : note.message_bn}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(note.created_at).toLocaleString()}
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleNotificationClick}
                        className="w-full mt-3 py-2 text-sm text-primary hover:text-primary-dark font-semibold transition-colors"
                      >
                        {language === 'en' ? 'View All Notifications' : 'সকল বিজ্ঞপ্তি দেখুন'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {/* Login Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
            >
              {t.login}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default React.memo(Navbar);
