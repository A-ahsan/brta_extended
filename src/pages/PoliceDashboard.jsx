import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import {
  QrCode,
  CheckCircle,
  XCircle,
  Warning,
  Car,
  SignOut,
  Bell,
  X,
  Database,
  ClockCounterClockwise,
  List,
  Eye,
  ChartBar,
} from 'phosphor-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import StatCard from '../components/StatCard';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import ThemeLanguageToggler from '../components/ThemeLanguageToggler';
import PoliceVerification from './police/PoliceVerification';
import PoliceRecords from './police/PoliceRecords';
import PoliceRecentActivity from './police/PoliceRecentActivity';

const PoliceDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { signOut, user } = useAuth();
  const t = translations[language];
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalFinesPaid: 0,
    violationsToday: 0,
    unpaidViolations: 0,
    totalInspections: 0
  });
  const [violationTypeData, setViolationTypeData] = useState([]);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
    fetchViolationTypes();
  }, [language, user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', 'police')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching police notifications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get total fines paid (from payments with type violation_fine)
      const { data: finePayments, error: finesError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_type', 'violation_fine')
        .eq('status', 'success');

      const totalFinesPaid = finePayments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;

      // Get today's violations count
      const { count: violationsToday } = await supabase
        .from('traffic_violations')
        .select('*', { count: 'exact', head: true })
        .gte('violation_date', todayISO);

      // Get unpaid violations count
      const { count: unpaidViolations } = await supabase
        .from('traffic_violations')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'unpaid')
        .eq('status', 'active');

      // Get total inspections by current officer
      const { count: totalInspections } = await supabase
        .from('police_inspections')
        .select('*', { count: 'exact', head: true })
        .eq('police_user_id', user?.id);

      setStats({
        totalFinesPaid: totalFinesPaid,
        violationsToday: violationsToday || 0,
        unpaidViolations: unpaidViolations || 0,
        totalInspections: totalInspections || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchViolationTypes = async () => {
    try {
      // Fetch all violations grouped by type
      const { data: violations, error: violationsError } = await supabase
        .from('traffic_violations')
        .select('violation_name_en, violation_name_bn');

      if (violationsError) throw violationsError;

      // Fetch all impoundments
      const { count: impoundmentCount, error: impoundmentError } = await supabase
        .from('vehicle_impoundments')
        .select('*', { count: 'exact', head: true });

      if (impoundmentError) throw impoundmentError;

      // Count violations by type
      const violationCounts = {};
      violations?.forEach(v => {
        const name = language === 'en' ? v.violation_name_en : v.violation_name_bn;
        violationCounts[name] = (violationCounts[name] || 0) + 1;
      });

      // Convert to array and add impoundments
      const chartData = Object.entries(violationCounts).map(([name, count]) => ({
        name,
        value: count
      }));

      // Add impoundments
      if (impoundmentCount > 0) {
        chartData.push({
          name: language === 'en' ? 'Vehicle Impoundment' : 'গাড়ি আটক',
          value: impoundmentCount
        });
      }

      // Sort by value and take top 8
      chartData.sort((a, b) => b.value - a.value);
      setViolationTypeData(chartData.slice(0, 8));
    } catch (error) {
      console.error('Error fetching violation types:', error);
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

  const menuItems = [
    { 
      id: 'verification', 
      icon: QrCode, 
      label: language === 'en' ? 'Verification' : 'যাচাইকরণ', 
      path: '/police-dashboard/verification',
      description: language === 'en' ? 'QR & Plate Search' : 'QR ও প্লেট অনুসন্ধান'
    },
    { 
      id: 'records', 
      icon: Database, 
      label: language === 'en' ? 'Records' : 'রেকর্ড', 
      path: '/police-dashboard/records',
      description: language === 'en' ? 'Vehicle Database' : 'যানবাহন ডাটাবেস'
    },
    { 
      id: 'activity', 
      icon: ClockCounterClockwise, 
      label: language === 'en' ? 'Recent Activity' : 'সাম্প্রতিক', 
      path: '/police-dashboard/activity',
      description: language === 'en' ? 'Live Feed' : 'লাইভ ফিড'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Optimized animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ willChange: 'transform' }}>
        <motion.div
          animate={{ 
            x: [0, 50, 0],
            y: [0, -100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", repeatType: "loop" }}
          className="absolute top-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          style={{ transform: 'translateZ(0)' }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <List size={20} className="sm:w-6 sm:h-6" weight="bold" />
            </motion.button>
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/brta.png" alt="BRTA Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
              <div>
                <h1 className="text-sm sm:text-xl font-bold text-primary dark:text-green-400">
                  <span className="hidden sm:inline">BRTA 2.0 - </span>{t.policeDashboard}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="relative p-2 rounded-full hover:bg-primary/10 transition"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
            >
              <Bell size={20} className="sm:w-6 sm:h-6 text-primary" />
              {notifications && notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center">
                  {notifications.filter(n => !n.is_read).length > 99 ? '99+' : notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
            <ThemeLanguageToggler />
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
                className="absolute right-3 sm:right-6 top-16 sm:top-20 w-[calc(100vw-24px)] sm:w-96 max-w-md bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bell size={20} className="text-primary dark:text-blue-400" />
                      <span className="font-bold text-lg text-gray-800 dark:text-white">
                        {language === 'en' ? 'Police Notifications' : 'পুলিশ বিজ্ঞপ্তি'}
                      </span>
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                          {notifications.filter(n => !n.is_read).length > 99 ? '99+' : notifications.filter(n => !n.is_read).length}
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
                        navigate('/police/notifications');
                        setShowNotifications(false);
                      }}
                      className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary dark:text-blue-400 font-semibold rounded-lg transition-colors text-sm"
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
                    notifications.slice(0, 10).map((note) => (
                      <motion.li 
                        key={note.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative rounded-lg px-3 py-3 shadow-sm text-gray-800 dark:text-gray-200 text-sm transition-all group ${
                          note.is_read 
                            ? 'bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 opacity-75'
                            : 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 cursor-pointer" onClick={() => {
                            if (!note.is_read) markNotificationAsRead(note.id);
                            navigate('/police/verification');
                            setShowNotifications(false);
                          }}>
                            <div className="font-semibold text-primary dark:text-blue-400 mb-1 flex items-center gap-2">
                              {language === 'en' ? note.title_en : note.title_bn}
                              {!note.is_read && (
                                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
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

      <div className="flex pt-16 sm:pt-20">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Mobile Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              />
              
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="fixed left-0 top-16 sm:top-20 bottom-0 w-64 sm:w-72 bg-white dark:bg-gray-900 shadow-xl p-4 sm:p-6 overflow-y-auto z-40"
              >
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={20} className="sm:w-6 sm:h-6" weight={isActive ? 'fill' : 'regular'} />
                        <span className="font-semibold text-sm sm:text-base">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Logout Button */}
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-red-50 dark:bg-red-900/20 text-danger hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-semibold transition-all text-sm sm:text-base"
                >
                  <SignOut size={20} className="sm:w-6 sm:h-6" weight="bold" />
                  {t.logout}
                </motion.button>
              </div>
            </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`flex-1 p-3 sm:p-6 lg:p-8 transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
          >
            <StatCard
              icon={<Eye size={48} weight="duotone" />}
              title={language === 'en' ? 'Total Fines Paid' : 'মোট জরিমানা পরিশোধিত'}
              value={`৳ ${(stats.totalFinesPaid / 1000).toFixed(1)}K`}
              color="info"
            />
            <StatCard
              icon={<Warning size={48} weight="duotone" />}
              title={language === 'en' ? 'Violations Today' : 'আজকের লঙ্ঘন'}
              value={stats.violationsToday.toString()}
              color="warning"
            />
            <StatCard
              icon={<XCircle size={48} weight="duotone" />}
              title={language === 'en' ? 'Unpaid Fines' : 'বকেয়া জরিমানা'}
              value={stats.unpaidViolations.toString()}
              color="danger"
            />
            <StatCard
              icon={<CheckCircle size={48} weight="duotone" />}
              title={language === 'en' ? 'Total Inspections' : 'মোট পরিদর্শন'}
              value={stats.totalInspections.toString()}
              color="success"
            />
          </motion.div>

          {/* Violation Types Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 sm:mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-primary to-green-600 rounded-xl">
                <ChartBar size={28} weight="bold" className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  {language === 'en' ? 'Violation Types Distribution' : 'লঙ্ঘনের ধরন বিতরণ'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'en' ? 'Most common violations and impoundments' : 'সবচেয়ে সাধারণ লঙ্ঘন এবং আটক'}
                </p>
              </div>
            </div>
            
            {violationTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={violationTypeData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    label={{ 
                      value: language === 'en' ? 'Number of Cases' : 'মামলার সংখ্যা', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fontSize: 14, fill: '#374151' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E9ECEF',
                      borderRadius: '8px',
                    }}
                    cursor={{ fill: 'rgba(220, 38, 38, 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#DC2626" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={80}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-gray-500 dark:text-gray-400">
                  {language === 'en' ? 'No violation data available' : 'কোনো লঙ্ঘনের তথ্য নেই'}
                </p>
              </div>
            )}
          </motion.div>

          {/* Sub Routes */}
          <Routes>
            <Route path="/verification" element={<PoliceVerification />} />
            <Route path="/records" element={<PoliceRecords />} />
            <Route path="/activity" element={<PoliceRecentActivity />} />
            <Route path="/" element={<PoliceVerification />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default PoliceDashboard;
