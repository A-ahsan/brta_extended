import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import {
  CheckCircle,
  CalendarBlank,
  SignOut,
  Bell,
  X,
  List,
  ChartLine,
  BookOpen,
  Eye,
} from 'phosphor-react';
import { useLanguage, useTheme } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import ThemeLanguageToggler from '../components/ThemeLanguageToggler';
import AdminOverview from './admin/AdminOverview';
import AdminApplications from './admin/AdminApplications';
import AdminSlots from './admin/AdminSlots';
import AdminQuestions from './admin/AdminQuestions';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { signOut, user, userProfile } = useAuth();
  const t = translations[language];
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (user && userProfile && userProfile.role !== 'admin') {
      toast.error(language === 'en' ? 'Access denied. Admin only.' : 'প্রবেশাধিকার নেই। শুধুমাত্র প্রশাসক।');
      navigate('/dashboard');
    }
  }, [user, userProfile, navigate, language]);

  useEffect(() => {
    fetchNotifications();
  }, [language]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', 'admin')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      
      toast.success(language === 'en' ? 'Marked as read' : 'পঠিত হিসাবে চিহ্নিত');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) {
        toast.info(language === 'en' ? 'No unread notifications' : 'কোনো অপঠিত বিজ্ঞপ্তি নেই');
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
      );
      
      toast.success(language === 'en' ? 'All notifications marked as read' : 'সব বিজ্ঞপ্তি পঠিত চিহ্নিত');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(language === 'en' ? 'Failed to mark all as read' : 'সব পঠিত চিহ্নিত করতে ব্যর্থ');
    }
  };

  const tabs = [
    { 
      path: '/admin/overview', 
      label: language === 'en' ? 'Overview' : 'সংক্ষিপ্ত বিবরণ',
      icon: ChartLine 
    },
    { 
      path: '/admin/applications', 
      label: language === 'en' ? 'Applications' : 'আবেদনপত্র',
      icon: CheckCircle 
    },
    { 
      path: '/admin/slots', 
      label: language === 'en' ? 'Test Slots' : 'পরীক্ষার স্লট',
      icon: CalendarBlank 
    },
    { 
      path: '/admin/questions', 
      label: language === 'en' ? 'Questions' : 'প্রশ্নসমূহ',
      icon: BookOpen 
    },
  ];

  const monthlyData = [
    { month: 'Jan', applications: 120, approved: 100, rejected: 20 },
    { month: 'Feb', applications: 150, approved: 130, rejected: 20 },
    { month: 'Mar', applications: 180, approved: 160, rejected: 20 },
    { month: 'Apr', applications: 200, approved: 175, rejected: 25 },
    { month: 'May', applications: 220, approved: 190, rejected: 30 },
    { month: 'Jun', applications: 250, approved: 220, rejected: 30 },
  ];

  const testCenterData = [
    { name: 'Mirpur', value: 35 },
    { name: 'Banani', value: 25 },
    { name: 'Uttara', value: 20 },
    { name: 'Dhanmondi', value: 15 },
    { name: 'Others', value: 5 },
  ];

  const COLORS = ['#006A4E', '#28A745', '#FFB020', '#DC3545', '#6C757D'];

  const pendingApplications = [
    { id: 1, name: 'Ahmed Khan', type: 'New License', date: '2025-11-12', applicationNo: 'DL2025010' },
    { id: 2, name: 'Fatima Rahman', type: 'Renewal', date: '2025-11-11', applicationNo: 'DL2025011' },
    { id: 3, name: 'Karim Hossain', type: 'Duplicate', date: '2025-11-10', applicationNo: 'DL2025012' },
    { id: 4, name: 'Ayesha Begum', type: 'New License', date: '2025-11-09', applicationNo: 'DL2025013' },
  ];

  const testSlots = [
    { id: 1, center: 'Mirpur Test Center', date: '2025-11-20', slots: 25, booked: 18, available: 7 },
    { id: 2, center: 'Banani Test Center', date: '2025-11-20', slots: 20, booked: 15, available: 5 },
    { id: 3, center: 'Uttara Test Center', date: '2025-11-21', slots: 30, booked: 22, available: 8 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ willChange: 'transform' }}>
        <motion.div
          animate={{ 
            x: [0, 50, 0],
            y: [0, -100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", repeatType: "loop" }}
          className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          style={{ transform: 'translateZ(0)' }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                aria-label="Toggle Menu"
              >
                <List size={24} className="text-primary dark:text-green-400" />
              </button>
              <img src="/brta.png" alt="BRTA Logo" className="h-10 w-10" />
              <div>
                <h1 className="text-xl font-bold text-primary dark:text-green-400">BRTA 2.0 - {t.adminPanel}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="relative p-2 rounded-full hover:bg-primary/10 transition"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <Bell size={24} className="text-primary" />
                {notifications && notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{notifications.filter(n => !n.is_read).length}</span>
                )}
              </button>
              <ThemeLanguageToggler />
            </div>
          </div>
        </div>

        {/* Notifications Dropdown */}
        <AnimatePresence>
          {showNotifications && (
            <>
              {/* Backdrop to close on click */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute right-6 top-20 w-96 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell size={20} className="text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-lg text-gray-800 dark:text-white">
                      {language === 'en' ? 'Admin Notifications' : 'অ্যাডমিন বিজ্ঞপ্তি'}
                    </span>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                        {notifications.filter(n => !n.is_read).length}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigate('/admin/notifications');
                      setShowNotifications(false);
                    }}
                    className="flex-1 px-3 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 font-semibold rounded-lg transition-colors text-sm"
                  >
                    {language === 'en' ? 'See All' : 'সব দেখুন'}
                  </button>
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="flex-1 px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold rounded-lg transition-colors text-sm"
                    >
                      {language === 'en' ? 'Mark All Read' : 'সব পঠিত করুন'}
                    </button>
                  )}
                </div>
              </div>

              <ul className="space-y-2 max-h-96 overflow-y-auto p-4">
                {notifications.length === 0 ? (
                  <li className="text-center py-8">
                    <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" weight="duotone" />
                    <p className="text-gray-400 dark:text-gray-500">
                      {language === 'en' ? 'No new notifications' : 'কোনো নতুন বিজ্ঞপ্তি নেই'}
                    </p>
                  </li>
                ) : (
                  notifications.map((note) => (
                    <motion.li 
                      key={note.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`relative rounded-lg px-3 py-3 shadow-sm text-gray-800 dark:text-gray-200 text-sm transition-all group ${
                        note.is_read 
                          ? 'bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 opacity-75'
                          : 'bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 cursor-pointer" onClick={() => {
                          if (!note.is_read) markNotificationAsRead(note.id);
                          navigate('/admin/applications');
                          setShowNotifications(false);
                        }}>
                          <div className="font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-2">
                            {language === 'en' ? note.title_en : note.title_bn}
                            {!note.is_read && (
                              <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
                            )}
                          </div>
                          <div className={`line-clamp-2 ${note.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {language === 'en' ? note.message_en : note.message_bn}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(note.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        {!note.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(note.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-all"
                            title={language === 'en' ? 'Mark as read' : 'পঠিত চিহ্নিত করুন'}
                          >
                            <Eye size={16} className="text-green-600" weight="duotone" />
                          </button>
                        )}
                      </div>
                    </motion.li>
                  ))
                )}
              </ul>
            </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-[calc(4rem+1px)] h-[calc(100vh-4rem-1px)] w-64 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl border-r-2 border-gray-200/50 dark:border-gray-700/50 z-40 overflow-y-auto"
            >
              <nav className="p-4 space-y-2">
                {tabs.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-primary to-green-600 text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon 
                          size={24} 
                          weight={isActive ? "fill" : "regular"}
                          className={isActive ? "text-white" : "text-primary dark:text-green-400 group-hover:text-primary dark:group-hover:text-green-400"}
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Logout Button */}
              <div className="absolute bottom-6 left-4 right-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-danger hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-semibold transition-all"
                >
                  <SignOut size={24} weight="bold" />
                  {t.logout}
                </motion.button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="container mx-auto px-6 py-8">
            {/* Sub-pages Content */}
            <Routes>
              <Route path="/overview" element={<AdminOverview />} />
              <Route path="/applications" element={<AdminApplications />} />
              <Route path="/slots" element={<AdminSlots />} />
              <Route path="/questions" element={<AdminQuestions />} />
              <Route path="/" element={<AdminOverview />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
