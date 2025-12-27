import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CheckCircle,
  XCircle,
  Trash,
  Warning,
  Lightbulb,
  Clock,
  Eye,
  Calendar,
  MapPin,
  Image as ImageIcon,
  X,
  PencilSimple,
  Check
} from 'phosphor-react';
import { useLanguage } from '../../contexts/AppContext';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AdminCommunityModeration = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language] || translations.en;
  const tc = t.community;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending', 'all', 'approved', 'rejected'
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve'|'reject'|'delete', report, reason? }

  useEffect(() => {
    fetchReports();

    // Subscribe to real-time updates for all community reports
    const channel = supabase
      .channel('admin-community-reports', {
        config: {
          broadcast: { self: true },
          presence: { key: 'admin' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_reports'
        },
        (payload) => {
          console.log('✅ Admin - Report change detected:', payload);
          // Refetch reports when any change occurs
          fetchReports();
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin Community Reports subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to admin community reports');
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from admin community reports');
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_reports')
        .select(`
          *,
          report_attachments (*)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching community reports:', error);
      toast.error(language === 'en' ? 'Failed to load reports' : 'রিপোর্ট লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (report) => {
    setConfirmAction(null);
    setActionLoading(true);
    try {
      // Only publish dalal reports, suggestions stay admin-only
      const shouldPublish = report.report_type === 'dalal';
      
      const { error } = await supabase
        .from('community_reports')
        .update({
          status: 'approved',
          is_published: shouldPublish,
          published_at: shouldPublish ? new Date().toISOString() : null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', report.id);

      if (error) throw error;

      // Send notification to user
      const isPublic = report.report_type === 'dalal';
      await supabase.from('notifications').insert({
        user_id: report.user_id,
        recipient_type: 'user',
        title_en: `Your ${report.report_type === 'dalal' ? 'Dalal Report' : 'Suggestion'} Approved`,
        title_bn: `আপনার ${report.report_type === 'dalal' ? 'দালাল রিপোর্ট' : 'পরামর্শ'} অনুমোদিত হয়েছে`,
        message_en: `Your report "${language === 'en' ? report.title_en : report.title_bn}" has been reviewed and approved.${isPublic ? ' It is now visible to the public.' : ''}`,
        message_bn: `আপনার রিপোর্ট "${language === 'en' ? report.title_en : report.title_bn}" পর্যালোচনা করা হয়েছে এবং অনুমোদিত হয়েছে।${isPublic ? ' এটি এখন সর্বজনীনভাবে দৃশ্যমান।' : ''}`,
        notification_type: 'general',
        priority: 'normal'
      });

      toast.success(language === 'en' ? 'Report approved and published!' : 'রিপোর্ট অনুমোদিত এবং প্রকাশিত!');
      fetchReports();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error approving report:', error);
      toast.error(language === 'en' ? 'Failed to approve report' : 'রিপোর্ট অনুমোদন করতে ব্যর্থ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (report) => {
    const reason = confirmAction?.reason;
    setConfirmAction(null);
    
    if (!reason || reason.trim() === '') {
      toast.error(language === 'en' ? 'Rejection reason is required' : 'প্রত্যাখ্যানের কারণ প্রয়োজন');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('community_reports')
        .update({
          status: 'rejected',
          is_published: false,
          rejection_reason: reason || 'No reason provided',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', report.id);

      if (error) throw error;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: report.user_id,
        recipient_type: 'user',
        title_en: `Your ${report.report_type === 'dalal' ? 'Dalal Report' : 'Suggestion'} Rejected`,
        title_bn: `আপনার ${report.report_type === 'dalal' ? 'দালাল রিপোর্ট' : 'পরামর্শ'} প্রত্যাখ্যান করা হয়েছে`,
        message_en: `Your report "${language === 'en' ? report.title_en : report.title_bn}" has been rejected. Reason: ${reason || 'Not specified'}`,
        message_bn: `আপনার রিপোর্ট "${language === 'en' ? report.title_en : report.title_bn}" প্রত্যাখ্যান করা হয়েছে। কারণ: ${reason || 'উল্লেখ করা হয়নি'}`,
        notification_type: 'general',
        priority: 'normal'
      });

      toast.success(language === 'en' ? 'Report rejected' : 'রিপোর্ট প্রত্যাখ্যান করা হয়েছে');
      fetchReports();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error rejecting report:', error);
      toast.error(language === 'en' ? 'Failed to reject report' : 'রিপোর্ট প্রত্যাখ্যান করতে ব্যর্থ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (report) => {
    setConfirmAction(null);
    setActionLoading(true);
    try {
      // Delete attachments first
      if (report.report_attachments && report.report_attachments.length > 0) {
        const filePaths = report.report_attachments.map(att => {
          const url = new URL(att.file_url);
          return url.pathname.split('/community-reports/')[1];
        });

        await Promise.all(
          filePaths.map(path => 
            supabase.storage.from('community-reports').remove([path])
          )
        );
      }

      // Delete report
      const { error } = await supabase
        .from('community_reports')
        .delete()
        .eq('id', report.id);

      if (error) throw error;

      toast.success(language === 'en' ? 'Report deleted' : 'রিপোর্ট মুছে ফেলা হয়েছে');
      fetchReports();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error(language === 'en' ? 'Failed to delete report' : 'রিপোর্ট মুছতে ব্যর্থ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddResponse = async (report, responseEn, responseBn) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('community_reports')
        .update({
          admin_response_en: responseEn,
          admin_response_bn: responseBn
        })
        .eq('id', report.id);

      if (error) throw error;

      toast.success(language === 'en' ? 'Response added!' : 'প্রতিক্রিয়া যোগ করা হয়েছে!');
      fetchReports();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error(language === 'en' ? 'Failed to add response' : 'প্রতিক্রিয়া যোগ করতে ব্যর্থ');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return { icon: <Clock size={16} weight="fill" />, text: tc.status.pending, className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' };
      case 'approved':
        return { icon: <CheckCircle size={16} weight="fill" />, text: tc.status.approved, className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
      case 'rejected':
        return { icon: <XCircle size={16} weight="fill" />, text: tc.status.rejected, className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={32} weight="duotone" className="text-primary dark:text-green-400" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{tc.adminPanel}</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
        {['pending', 'approved', 'rejected', 'all'].map((status) => (
          <motion.button
            key={status}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterStatus(status)}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              filterStatus === status
                ? 'bg-primary dark:bg-green-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tc.status[status] || (language === 'en' ? 'All Reports' : 'সব রিপোর্ট')}
          </motion.button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
          <Clock size={32} weight="fill" className="text-yellow-600 mx-auto mb-2" />
          <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
            {reports.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-500">{tc.pendingReviews}</div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
          <CheckCircle size={32} weight="fill" className="text-green-600 mx-auto mb-2" />
          <div className="text-3xl font-bold text-green-700 dark:text-green-400">
            {reports.filter(r => r.status === 'approved').length}
          </div>
          <div className="text-sm text-green-600 dark:text-green-500">{tc.status.approved}</div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <Warning size={32} weight="fill" className="text-red-600 mx-auto mb-2" />
          <div className="text-3xl font-bold text-red-700 dark:text-red-400">
            {reports.filter(r => r.report_type === 'dalal').length}
          </div>
          <div className="text-sm text-red-600 dark:text-red-500">{tc.dalalReports}</div>
        </div>

        <div className="bg-primary/10 dark:bg-green-900/20 border-2 border-primary/30 dark:border-green-800 rounded-xl p-6 text-center">
          <Lightbulb size={32} weight="fill" className="text-primary dark:text-green-400 mx-auto mb-2" />
          <div className="text-3xl font-bold text-primary dark:text-green-400">
            {reports.filter(r => r.report_type === 'suggestion').length}
          </div>
          <div className="text-sm text-primary dark:text-green-500">{tc.suggestions}</div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-lg">
          <Users size={64} weight="duotone" className="text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 dark:text-gray-400">{tc.noReports}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <AdminReportCard
              key={report.id}
              report={report}
              language={language}
              tc={tc}
              onViewDetails={(r) => {
                setSelectedReport(r);
                setShowDetailModal(true);
              }}
              formatDate={formatDate}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <AdminReportDetailModal
            report={selectedReport}
            language={language}
            tc={tc}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedReport(null);
            }}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
            onAddResponse={handleAddResponse}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            actionLoading={actionLoading}
            setConfirmAction={setConfirmAction}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <ConfirmationModal
            action={confirmAction}
            onConfirm={(action) => {
              if (action.type === 'approve') handleApprove(action.report);
              else if (action.type === 'reject') handleReject(action.report);
              else if (action.type === 'delete') handleDelete(action.report);
            }}
            onCancel={() => setConfirmAction(null)}
            language={language}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Admin Report Card Component
const AdminReportCard = ({ report, language, tc, onViewDetails, formatDate, getStatusBadge }) => {
  const isDalal = report.report_type === 'dalal';
  const title = language === 'en' ? report.title_en : report.title_bn;
  const statusBadge = getStatusBadge(report.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700"
      onClick={() => onViewDetails(report)}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
            isDalal ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
          }`}>
            {isDalal ? <Warning size={16} weight="fill" /> : <Lightbulb size={16} weight="fill" />}
            {tc.types[report.report_type]}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${statusBadge.className}`}>
            {statusBadge.icon}
            {statusBadge.text}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">{title}</h3>
        
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Users size={14} weight="fill" />
            <span>{report.reporter_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} weight="fill" />
            <span>{formatDate(report.created_at)}</span>
          </div>
        </div>

        <button className="mt-4 w-full bg-primary dark:bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-primary-dark dark:hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
          <Eye size={18} weight="fill" />
          {tc.viewDetails}
        </button>
      </div>
    </motion.div>
  );
};

// Admin Report Detail Modal with Actions
const AdminReportDetailModal = ({ 
  report, language, tc, onClose, onApprove, onReject, onDelete, onAddResponse, 
  formatDate, getStatusBadge, actionLoading, setConfirmAction
}) => {
  const isDalal = report.report_type === 'dalal';
  const title = language === 'en' ? report.title_en : report.title_bn;
  const description = language === 'en' ? report.description_en : report.description_bn;
  const statusBadge = getStatusBadge(report.status);
  
  const [rejectionReason, setRejectionReason] = useState('');
  const [responseEn, setResponseEn] = useState(report.admin_response_en || '');
  const [responseBn, setResponseBn] = useState(report.admin_response_bn || '');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {isDalal ? <Warning size={32} weight="fill" className="text-danger" /> : <Lightbulb size={32} weight="fill" className="text-primary dark:text-green-400" />}
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusBadge.className}`}>
              {statusBadge.icon}
              {statusBadge.text}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-800">
          <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>

          {/* Reporter */}
          <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Users size={16} weight="fill" />
              <span className="font-semibold">{tc.reportedBy}:</span>
              <span>{report.reporter_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-2 text-gray-700 dark:text-gray-300">
              <Calendar size={16} weight="fill" />
              <span>{formatDate(report.created_at)}</span>
            </div>
          </div>

          {/* Images */}
          {report.report_attachments && report.report_attachments.length > 0 && (
            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <ImageIcon size={20} weight="fill" />
                {tc.images} ({report.report_attachments.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {report.report_attachments.map((attachment) => (
                  <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-xl overflow-hidden">
                    <img src={attachment.file_url} alt="Evidence" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">{tc.description}</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{description}</p>
          </div>

          {/* Admin Response Form */}
          {report.status === 'approved' && (
            <div>
              <button
                onClick={() => setShowResponseForm(!showResponseForm)}
                className="flex items-center gap-2 text-primary dark:text-green-400 font-bold hover:underline mb-3"
              >
                <PencilSimple size={20} weight="bold" />
                {tc.addResponse}
              </button>
              {showResponseForm && (
                <div className="space-y-4">
                  <textarea
                    value={responseEn}
                    onChange={(e) => setResponseEn(e.target.value)}
                    placeholder={`${tc.responsePlaceholder} (English)`}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:border-primary"
                  />
                  <textarea
                    value={responseBn}
                    onChange={(e) => setResponseBn(e.target.value)}
                    placeholder={`${tc.responsePlaceholder} (বাংলা)`}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => onAddResponse(report, responseEn, responseBn)}
                    disabled={actionLoading}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {language === 'en' ? 'Save Response' : 'প্রতিক্রিয়া সংরক্ষণ করুন'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {report.status === 'pending' && (
            <div className="flex gap-4">
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => setConfirmAction({ type: 'approve', report }), 100);
                }}
                disabled={actionLoading}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} weight="fill" />
                {tc.approveReport}
              </button>
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => setConfirmAction({ type: 'reject', report }), 100);
                }}
                disabled={actionLoading}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle size={20} weight="fill" />
                {tc.rejectReport}
              </button>
            </div>
          )}

          {showRejectForm && (
            <div className="space-y-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={tc.rejectionReasonPlaceholder}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:border-danger"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => onReject(report, rejectionReason)}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {tc.rejectReport}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {tc.cancel}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              onClose();
              setTimeout(() => setConfirmAction({ type: 'delete', report }), 100);
            }}
            disabled={actionLoading}
            className="w-full bg-red-100 dark:bg-red-900/20 text-danger py-3 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash size={20} weight="fill" />
            {tc.deleteReport}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Confirmation Modal Component
const ConfirmationModal = ({ action, onConfirm, onCancel, language }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  
  if (!action) return null;
  
  const { type, report } = action;
  const isReject = type === 'reject';
  
  const titles = {
    approve: language === 'en' ? 'Approve Report' : 'রিপোর্ট অনুমোদন করুন',
    reject: language === 'en' ? 'Reject Report' : 'রিপোর্ট প্রত্যাখ্যান করুন',
    delete: language === 'en' ? 'Delete Report' : 'রিপোর্ট মুছুন'
  };
  
  const messages = {
    approve: language === 'en' 
      ? `Are you sure you want to approve this ${report.report_type === 'dalal' ? 'dalal report' : 'suggestion'}?${report.report_type === 'dalal' ? ' It will be published to the public community page.' : ' It will remain admin-only.'}` 
      : `আপনি কি নিশ্চিত যে আপনি এই ${report.report_type === 'dalal' ? 'দালাল রিপোর্ট' : 'পরামর্শ'} অনুমোদন করতে চান?${report.report_type === 'dalal' ? ' এটি সর্বজনীন কমিউনিটি পৃষ্ঠায় প্রকাশিত হবে।' : ' এটি শুধুমাত্র অ্যাডমিনদের জন্য থাকবে।'}`,
    reject: language === 'en' 
      ? 'Please provide a reason for rejecting this report:' 
      : 'এই রিপোর্ট প্রত্যাখ্যান করার একটি কারণ প্রদান করুন:',
    delete: language === 'en' 
      ? 'Are you sure you want to permanently delete this report? This action cannot be undone.' 
      : 'আপনি কি নিশ্চিত যে আপনি এই রিপোর্টটি স্থায়ীভাবে মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।'
  };
  
  const icons = {
    approve: <CheckCircle size={24} weight="duotone" className="text-green-600 dark:text-green-400" />,
    reject: <XCircle size={24} weight="duotone" className="text-yellow-600 dark:text-yellow-400" />,
    delete: <Trash size={24} weight="duotone" className="text-red-600 dark:text-red-400" />
  };
  
  const buttonColors = {
    approve: 'from-green-500 to-green-600',
    reject: 'from-yellow-500 to-yellow-600',
    delete: 'from-red-500 to-red-600'
  };
  
  const handleConfirm = () => {
    if (isReject) {
      if (!rejectionReason.trim()) {
        toast.error(language === 'en' ? 'Please provide a rejection reason' : 'প্রত্যাখ্যানের কারণ প্রদান করুন');
        return;
      }
      onConfirm({ ...action, reason: rejectionReason });
    } else {
      onConfirm(action);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-full ${
            type === 'approve' ? 'bg-green-100 dark:bg-green-900/20' :
            type === 'reject' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
            'bg-red-100 dark:bg-red-900/20'
          }`}>
            {icons[type]}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{titles[type]}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {type === 'delete' ? (language === 'en' ? 'This action cannot be undone' : 'এটি পূর্বাবস্থায় ফেরানো যাবে না') : ''}
            </p>
          </div>
        </div>
        
        {isReject ? (
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-3">{messages[type]}</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={language === 'en' ? 'Enter rejection reason...' : 'প্রত্যাখ্যানের কারণ লিখুন...'}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:border-yellow-500"
              autoFocus
            />
          </div>
        ) : (
          <p className="text-gray-700 dark:text-gray-300 mb-6">{messages[type]}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {language === 'en' ? 'Cancel' : 'বাতিল'}
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            className={`flex-1 px-4 py-3 bg-gradient-to-r ${buttonColors[type]} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2`}
          >
            {icons[type]}
            {language === 'en' ? type.charAt(0).toUpperCase() + type.slice(1) : 
              type === 'approve' ? 'অনুমোদন' : 
              type === 'reject' ? 'প্রত্যাখ্যান' : 'মুছুন'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminCommunityModeration;
