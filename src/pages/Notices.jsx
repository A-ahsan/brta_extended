import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MegaphoneSimple, Calendar, Tag, ArrowRight, X, 
  CaretDown, FunnelSimple, TrendUp
} from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { translations } from '../utils/translations';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabaseClient';

const Notices = () => {
  const { language } = useLanguage();
  const t = translations[language].noticesPage;
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch notices from database
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notices')
          .select('*')
          .eq('is_active', true)
          .order('publish_date', { ascending: false });

        if (error) throw error;
        
        if (data) {
          // Transform data to match the expected format
          const transformedNotices = data.map(notice => ({
            id: notice.id,
            title: language === 'en' ? notice.title_en : notice.title_bn,
            category: notice.category,
            date: notice.publish_date,
            excerpt: language === 'en' ? notice.excerpt_en : notice.excerpt_bn,
            content: language === 'en' ? notice.content_en : notice.content_bn,
            trending: notice.is_trending,
            // Store both languages for modal display
            _raw: notice
          }));
          setNotices(transformedNotices);
        }
      } catch (error) {
        console.error('Error fetching notices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notices_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notices' },
        () => {
          fetchNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [language]);

  // Mock notices data (REMOVED - now fetched from database)
  const mockNotices = [];

  const getCategoryColor = (category) => {
    const colors = {
      general: 'from-blue-500 to-blue-600',
      license: 'from-green-500 to-green-600',
      vehicle: 'from-purple-500 to-purple-600',
      tax: 'from-yellow-500 to-yellow-600',
      exam: 'from-red-500 to-red-600',
      maintenance: 'from-gray-500 to-gray-600'
    };
    return colors[category] || colors.general;
  };

  const filteredNotices = filterCategory === 'all' 
    ? notices 
    : notices.filter(n => n.category === filterCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-light via-white to-muted dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements - Optimized */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            x: [0, 150, 0],
            y: [0, -80, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear", repeatType: "reverse" }}
          className="absolute top-10 right-20 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 to-green-600/20 rounded-full blur-3xl"
          style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
        />
        <motion.div
          animate={{ 
            x: [0, -120, 0],
            y: [0, 120, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear", repeatType: "reverse" }}
          className="absolute bottom-10 left-20 w-[450px] h-[450px] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
          style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
        />
        <motion.div
          animate={{ 
            rotate: [0, 360]
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-gradient-to-br from-yellow-400/15 to-orange-500/15 rounded-full blur-3xl"
          style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
        />
      </div>
      
      <Navbar />
      
      <div className="pt-24 pb-16 px-4 relative z-10">
        <div className="container mx-auto max-w-7xl relative">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <div className="p-4 bg-gradient-to-br from-primary to-green-600 rounded-2xl">
                <MegaphoneSimple size={48} className="text-white" weight="duotone" />
              </div>
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
              {t.title}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {t.subtitle}
            </p>
          </motion.div>

          {/* Filter Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-12"
          >
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FunnelSimple size={20} />
              <span className="font-medium">{t.category}:</span>
            </div>
            {['all', 'general', 'license', 'vehicle', 'tax', 'exam', 'maintenance'].map((cat) => (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterCategory === cat
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {cat === 'all' 
                  ? (language === 'en' ? 'All' : 'সব') 
                  : t.categories[cat]
                }
              </motion.button>
            ))}
          </motion.div>

          {/* Notices Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading notices...</p>
            </div>
          ) : (
            <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="wait">
                {filteredNotices.map((notice, index) => (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.03
                  }}
                  whileHover={{ y: -5 }}
                  className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer group"
                  style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
                  onClick={() => setSelectedNotice(notice)}
                >
                  {/* Trending Badge */}
                  {notice.trending && (
                    <motion.div
                      initial={{ x: 100 }}
                      animate={{ x: 0 }}
                      className="absolute top-4 -right-8 bg-red-500 text-white px-10 py-1 transform rotate-45 text-xs font-bold flex items-center gap-1 z-10"
                    >
                      <TrendUp size={14} weight="bold" />
                      {language === 'en' ? 'TRENDING' : 'জনপ্রিয়'}
                    </motion.div>
                  )}

                  {/* Category Badge */}
                  <div className={`h-2 bg-gradient-to-r ${getCategoryColor(notice.category)}`} />
                  
                  <div className="p-6">
                    {/* Category Tag */}
                    <div className="flex items-center gap-2 mb-3">
                      <Tag size={18} className="text-primary" weight="duotone" />
                      <span className="text-sm font-semibold text-primary">
                        {t.categories[notice.category]}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {notice.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {notice.excerpt}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                        <Calendar size={16} weight="duotone" />
                        <span>{new Date(notice.date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                      <motion.div
                        whileHover={{ x: 5 }}
                        className="text-primary font-semibold flex items-center gap-1"
                      >
                        {t.viewDetails}
                        <ArrowRight size={18} weight="bold" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  />
                </motion.div>
              ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* No Results */}
          {!loading && filteredNotices.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <MegaphoneSimple size={64} className="text-gray-400 mx-auto mb-4" weight="duotone" />
              <p className="text-xl text-gray-500 dark:text-gray-400">
                {language === 'en' ? 'No notices found in this category' : 'এই ক্যাটাগরিতে কোন নোটিশ পাওয়া যায়নি'}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal for Notice Details */}
      <AnimatePresence>
        {selectedNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedNotice(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${getCategoryColor(selectedNotice.category)} p-6 text-white relative`}>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                >
                  <X size={24} weight="bold" />
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={20} weight="duotone" />
                  <span className="text-sm font-semibold">
                    {t.categories[selectedNotice.category]}
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-2 pr-12">
                  {selectedNotice.title}
                </h2>
                <div className="flex items-center gap-2 text-white/90">
                  <Calendar size={18} weight="duotone" />
                  <span>{t.publishedOn} {new Date(selectedNotice.date).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {selectedNotice.content}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notices;
