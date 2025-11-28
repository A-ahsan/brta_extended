import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MegaphoneSimple, Plus, Pencil, Trash, Eye, EyeSlash,
  TrendUp, TrendDown, Tag, Calendar, Check, X,
  FloppyDisk, Lightning, Sparkle
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

const AdminNoticesManagement = () => {
  const { language } = useLanguage();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    title_en: '',
    title_bn: '',
    excerpt_en: '',
    excerpt_bn: '',
    content_en: '',
    content_bn: '',
    category: 'general',
    badge: '',
    is_active: true,
    is_trending: false,
    show_in_ticker: true
  });

  const categories = [
    { value: 'general', label: { en: 'General', bn: 'সাধারণ' } },
    { value: 'license', label: { en: 'License', bn: 'লাইসেন্স' } },
    { value: 'vehicle', label: { en: 'Vehicle', bn: 'যানবাহন' } },
    { value: 'tax', label: { en: 'Tax', bn: 'ট্যাক্স' } },
    { value: 'exam', label: { en: 'Exam', bn: 'পরীক্ষা' } },
    { value: 'maintenance', label: { en: 'Maintenance', bn: 'রক্ষণাবেক্ষণ' } }
  ];

  const badges = ['NEW', 'SCHEDULE', 'EXTENDED', 'UPDATE', 'NOTICE', 'URGENT', 'IMPORTANT'];

  // Fetch notices
  const fetchNotices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
  }, []);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingNotice) {
        // Update existing notice
        const { error } = await supabase
          .from('notices')
          .update(formData)
          .eq('id', editingNotice.id);

        if (error) throw error;
        toast.success('Notice updated successfully');
      } else {
        // Create new notice
        const { error } = await supabase
          .from('notices')
          .insert([formData]);

        if (error) throw error;
        toast.success('Notice created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchNotices();
    } catch (error) {
      console.error('Error saving notice:', error);
      toast.error('Failed to save notice');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;
      toast.success('Notice deleted successfully');
      setDeleteConfirm(null);
      fetchNotices();
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast.error('Failed to delete notice');
    }
  };

  // Handle toggle active
  const handleToggleActive = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    
    try {
      const { error } = await supabase
        .from('notices')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state after successful DB update
      setNotices(prev => prev.map(n => 
        n.id === id ? { ...n, is_active: newStatus } : n
      ));
      
      toast.success(`Notice ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling notice:', error);
      toast.error('Failed to update notice');
    }
  };

  // Handle toggle trending
  const handleToggleTrending = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    
    try {
      const { error } = await supabase
        .from('notices')
        .update({ is_trending: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state after successful DB update
      setNotices(prev => prev.map(n => 
        n.id === id ? { ...n, is_trending: newStatus } : n
      ));
      
      toast.success(`Notice ${newStatus ? 'marked as trending' : 'unmarked as trending'}`);
    } catch (error) {
      console.error('Error toggling trending:', error);
      toast.error('Failed to update notice');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title_en: '',
      title_bn: '',
      excerpt_en: '',
      excerpt_bn: '',
      content_en: '',
      content_bn: '',
      category: 'general',
      badge: '',
      is_active: true,
      is_trending: false,
      show_in_ticker: true
    });
    setEditingNotice(null);
  };

  // Edit notice
  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title_en: notice.title_en,
      title_bn: notice.title_bn,
      excerpt_en: notice.excerpt_en,
      excerpt_bn: notice.excerpt_bn,
      content_en: notice.content_en,
      content_bn: notice.content_bn,
      category: notice.category,
      badge: notice.badge || '',
      is_active: notice.is_active,
      is_trending: notice.is_trending,
      show_in_ticker: notice.show_in_ticker
    });
    setShowModal(true);
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      general: 'bg-blue-500',
      license: 'bg-green-500',
      vehicle: 'bg-purple-500',
      tax: 'bg-yellow-500',
      exam: 'bg-red-500',
      maintenance: 'bg-gray-500'
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MegaphoneSimple size={36} weight="duotone" className="text-primary" />
            Manage Notices
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create, edit, and manage all system notices
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition"
        >
          <Plus size={20} weight="bold" />
          Create Notice
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Notices</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{notices.length}</p>
            </div>
            <MegaphoneSimple size={40} className="text-blue-500" weight="duotone" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Active</p>
              <p className="text-3xl font-bold text-green-600">{notices.filter(n => n.is_active).length}</p>
            </div>
            <Eye size={40} className="text-green-500" weight="duotone" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Trending</p>
              <p className="text-3xl font-bold text-red-600">{notices.filter(n => n.is_trending).length}</p>
            </div>
            <TrendUp size={40} className="text-red-500" weight="duotone" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">In Ticker</p>
              <p className="text-3xl font-bold text-purple-600">{notices.filter(n => n.show_in_ticker).length}</p>
            </div>
            <Lightning size={40} className="text-purple-500" weight="duotone" />
          </div>
        </div>
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading notices...</p>
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl">
          <MegaphoneSimple size={64} className="text-gray-400 mx-auto mb-4" weight="duotone" />
          <p className="text-xl text-gray-500 dark:text-gray-400">No notices yet</p>
          <p className="text-gray-400 dark:text-gray-500 mt-2">Create your first notice to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice, index) => (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start gap-4 p-6">
                {/* Category Color Bar */}
                <div className={`w-2 h-full ${getCategoryColor(notice.category)} rounded-full`} />
                
                {/* Content */}
                <div className="flex-1">
                  <div className="mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {notice.title_en}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {notice.badge && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                          {notice.badge}
                        </span>
                      )}
                      {notice.is_trending && (
                        <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded flex items-center gap-1">
                          <TrendUp size={12} weight="bold" />
                          TRENDING
                        </span>
                      )}
                      {!notice.is_active && (
                        <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded">
                          INACTIVE
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{notice.excerpt_en}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                    <div className="flex items-center gap-1">
                      <Tag size={16} weight="duotone" />
                      <span className="capitalize">{notice.category}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} weight="duotone" />
                      <span>{new Date(notice.publish_date).toLocaleDateString()}</span>
                    </div>
                    {notice.show_in_ticker && (
                      <div className="flex items-center gap-1 text-purple-600">
                        <Lightning size={16} weight="fill" />
                        <span>Ticker</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleToggleActive(notice.id, notice.is_active)}
                    className={`p-2 rounded-lg transition ${
                      notice.is_active 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={notice.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {notice.is_active ? <Eye size={20} weight="duotone" /> : <EyeSlash size={20} weight="duotone" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleToggleTrending(notice.id, notice.is_trending)}
                    className={`p-2 rounded-lg transition ${
                      notice.is_trending 
                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={notice.is_trending ? 'Remove from Trending' : 'Mark as Trending'}
                  >
                    {notice.is_trending ? <TrendUp size={20} weight="fill" /> : <TrendDown size={20} weight="duotone" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(notice)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                    title="Edit"
                  >
                    <Pencil size={20} weight="duotone" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDeleteConfirm({ id: notice.id, title: notice.title_en })}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    title="Delete"
                  >
                    <Trash size={20} weight="duotone" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-green-600 p-6 text-white sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {editingNotice ? <Pencil size={28} weight="duotone" /> : <Plus size={28} weight="duotone" />}
                      {editingNotice ? 'Edit Notice' : 'Create New Notice'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <X size={24} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6 space-y-6">
                  {/* English Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Title (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title_en}
                      onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter notice title in English"
                    />
                  </div>

                  {/* Bengali Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Title (Bengali) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title_bn}
                      onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="বাংলায় নোটিশ শিরোনাম লিখুন"
                    />
                  </div>

                  {/* English Excerpt */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Excerpt (English) *
                    </label>
                    <textarea
                      required
                      value={formData.excerpt_en}
                      onChange={(e) => setFormData({ ...formData, excerpt_en: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Brief summary in English"
                    />
                  </div>

                  {/* Bengali Excerpt */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Excerpt (Bengali) *
                    </label>
                    <textarea
                      required
                      value={formData.excerpt_bn}
                      onChange={(e) => setFormData({ ...formData, excerpt_bn: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="বাংলায় সংক্ষিপ্ত বিবরণ"
                    />
                  </div>

                  {/* English Content */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Content (English) *
                    </label>
                    <textarea
                      required
                      value={formData.content_en}
                      onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Full content in English"
                    />
                  </div>

                  {/* Bengali Content */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Content (Bengali) *
                    </label>
                    <textarea
                      required
                      value={formData.content_bn}
                      onChange={(e) => setFormData({ ...formData, content_bn: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="বাংলায় সম্পূর্ণ বিষয়বস্তু"
                    />
                  </div>

                  {/* Category and Badge */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Category *
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label.en}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Badge (Optional)
                      </label>
                      <select
                        value={formData.badge}
                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">No Badge</option>
                        {badges.map(badge => (
                          <option key={badge} value={badge}>{badge}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Active (visible to users)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_trending}
                        onChange={(e) => setFormData({ ...formData, is_trending: e.target.checked })}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Mark as Trending</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_in_ticker}
                        onChange={(e) => setFormData({ ...formData, show_in_ticker: e.target.checked })}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Show in Homepage Ticker</span>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-end gap-3 sticky bottom-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition flex items-center gap-2"
                  >
                    <FloppyDisk size={20} weight="duotone" />
                    {editingNotice ? 'Update Notice' : 'Create Notice'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Trash size={24} className="text-red-600 dark:text-red-400" weight="duotone" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Notice</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete <span className="font-semibold">"{deleteConfirm.title}"</span>?
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
                >
                  <Trash size={20} weight="bold" />
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminNoticesManagement;
