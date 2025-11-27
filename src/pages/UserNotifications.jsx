import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/AppContext';
import { supabase } from '../lib/supabaseClient';
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Info,
  CaretLeft,
  Checks,
  Eye,
  Trash,
  FunnelSimple
} from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function UserNotifications() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEnglish = language === 'en';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('recipient_type', 'user')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error(isEnglish ? 'Failed to load notifications' : 'বিজ্ঞপ্তি লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state with animation
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );

      toast.success(isEnglish ? 'Marked as read' : 'পঠিত হিসাবে চিহ্নিত');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error(isEnglish ? 'Failed to mark as read' : 'পঠিত চিহ্নিত করতে ব্যর্থ');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) {
        toast.info(isEnglish ? 'No unread notifications' : 'কোনো অপঠিত বিজ্ঞপ্তি নেই');
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', unreadIds);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
      );

      toast.success(isEnglish ? `${unreadIds.length} notifications marked as read` : `${unreadIds.length}টি বিজ্ঞপ্তি পঠিত চিহ্নিত`);
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(isEnglish ? 'Failed to mark all as read' : 'সব পঠিত চিহ্নিত করতে ব্যর্থ');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success(isEnglish ? 'Notification deleted' : 'বিজ্ঞপ্তি মুছে ফেলা হয়েছে');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error(isEnglish ? 'Failed to delete' : 'মুছতে ব্যর্থ');
    }
  };

  const getNotificationIcon = (type) => {
    const iconProps = { size: 24, weight: "duotone" };
    switch (type) {
      case 'application':
        return <Bell {...iconProps} className="text-blue-500" />;
      case 'verification':
        return <CheckCircle {...iconProps} className="text-green-500" />;
      case 'exam':
        return <Clock {...iconProps} className="text-purple-500" />;
      case 'payment':
        return <Info {...iconProps} className="text-yellow-500" />;
      case 'approval':
        return <CheckCircle {...iconProps} className="text-green-600" />;
      case 'rejection':
        return <XCircle {...iconProps} className="text-red-500" />;
      default:
        return <Bell {...iconProps} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'normal':
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'border-l-4 border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false;
    if (filter === 'read' && !n.is_read) return false;
    if (typeFilter !== 'all' && n.notification_type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors mb-4"
          >
            <CaretLeft size={20} weight="bold" />
            <span>{isEnglish ? 'Back to Dashboard' : 'ড্যাশবোর্ডে ফিরুন'}</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Bell size={32} weight="duotone" className="text-primary" />
                {isEnglish ? 'Notifications' : 'বিজ্ঞপ্তি'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isEnglish 
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : `${unreadCount}টি অপঠিত বিজ্ঞপ্তি`
                }
              </p>
            </div>

            {unreadCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                <Checks size={20} weight="bold" />
                {isEnglish ? 'Mark All as Read' : 'সব পঠিত চিহ্নিত করুন'}
              </motion.button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FunnelSimple size={16} weight="bold" className="inline mr-1" />
                {isEnglish ? 'Status' : 'অবস্থা'}
              </label>
              <div className="flex gap-2">
                {['all', 'unread', 'read'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filter === f
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {isEnglish 
                      ? f.charAt(0).toUpperCase() + f.slice(1)
                      : f === 'all' ? 'সব' : f === 'unread' ? 'অপঠিত' : 'পঠিত'
                    }
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isEnglish ? 'Type' : 'ধরন'}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              >
                <option value="all">{isEnglish ? 'All Types' : 'সব ধরন'}</option>
                <option value="application">{isEnglish ? 'Application' : 'আবেদন'}</option>
                <option value="verification">{isEnglish ? 'Verification' : 'যাচাইকরণ'}</option>
                <option value="exam">{isEnglish ? 'Exam' : 'পরীক্ষা'}</option>
                <option value="payment">{isEnglish ? 'Payment' : 'পেমেন্ট'}</option>
                <option value="approval">{isEnglish ? 'Approval' : 'অনুমোদন'}</option>
                <option value="rejection">{isEnglish ? 'Rejection' : 'প্রত্যাখ্যান'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center"
          >
            <Bell size={64} weight="duotone" className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {isEnglish ? 'No notifications found' : 'কোনো বিজ্ঞপ্তি পাওয়া যায়নি'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {isEnglish 
                ? 'You\'re all caught up! Check back later for updates.'
                : 'আপনি সব দেখেছেন! আপডেটের জন্য পরে আবার চেক করুন।'
              }
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg ${
                    getPriorityColor(notification.priority)
                  } ${!notification.is_read ? 'ring-2 ring-primary/30' : ''}`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.notification_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {isEnglish ? notification.title_en : notification.title_bn}
                            {!notification.is_read && (
                              <span className="ml-2 inline-block w-2 h-2 bg-primary rounded-full"></span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2">
                            {!notification.is_read && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => markAsRead(notification.id)}
                                className="p-2 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title={isEnglish ? 'Mark as read' : 'পঠিত চিহ্নিত করুন'}
                              >
                                <Eye size={20} className="text-green-600" weight="duotone" />
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => deleteNotification(notification.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={isEnglish ? 'Delete' : 'মুছুন'}
                            >
                              <Trash size={20} className="text-red-600" weight="duotone" />
                            </motion.button>
                          </div>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {isEnglish ? notification.message_en : notification.message_bn}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={16} weight="duotone" />
                            {new Date(notification.created_at).toLocaleDateString(isEnglish ? 'en-US' : 'bn-BD', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium">
                            {notification.notification_type}
                          </span>
                          {notification.priority !== 'normal' && (
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              notification.priority === 'urgent' 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            }`}>
                              {notification.priority.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
