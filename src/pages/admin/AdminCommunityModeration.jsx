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
  PencilSimple
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

  useEffect(() => {
    fetchReports();

    // Subscribe to real-time updates for all community reports
    const subscription = supabase
      .channel('admin-community-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_reports'
        },
        (payload) => {
          console.log('Admin - Report change:', payload);
          // Refetch reports when any change occurs
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
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
    if (!window.confirm(tc.confirmApprove)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('community_reports')
        .update({
          status: 'approved',
          is_published: true,
          published_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', report.id);

      if (error) throw error;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: report.user_id,
        recipient_type: 'user',
        title_en: `Your ${report.report_type === 'dalal' ? 'Dalal Report' : 'Suggestion'} Approved`,
        title_bn: `আপনার ${report.report_type === 'dalal' ? 'দালাল রিপোর্ট' : 'পরামর্শ'} অনুমোদিত হয়েছে`,
        message_en: `Your report "${language === 'en' ? report.title_en : report.title_bn}" has been reviewed and approved. It is now visible to the public.`,
        message_bn: `আপনার রিপোর্ট "${language === 'en' ? report.title_en : report.title_bn}" পর্যালোচনা করা হয়েছে এবং অনুমোদিত হয়েছে। এটি এখন সর্বজনীনভাবে দৃশ্যমান।`,
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

  const handleReject = async (report, reason) => {
    if (!window.confirm(tc.confirmReject)) return;

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
    if (!window.confirm(tc.confirmDelete)) return;

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
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden cursor-pointer"
      onClick={() => onViewDetails(report)}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
            isDalal ? 'bg-red-100 dark:bg-red-900/30 text-danger' : 'bg-green-100 dark:bg-green-900/30 text-primary dark:text-green-400'
          }`}>
            {isDalal ? <Warning size={16} weight="fill" /> : <Lightbulb size={16} weight="fill" />}
            {tc.types[report.report_type]}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${statusBadge.className}`}>
            {statusBadge.icon}
            {statusBadge.text}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 line-clamp-2">{title}</h3>
        
        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Users size={14} weight="fill" />
            <span>{report.reporter_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} weight="fill" />
            <span>{formatDate(report.created_at)}</span>
          </div>
        </div>

        <button className="mt-4 w-full bg-primary dark:bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
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
  formatDate, getStatusBadge, actionLoading 
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
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
        <div className="p-6 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{title}</h2>

          {/* Reporter */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm">
              <Users size={16} weight="fill" />
              <span className="font-semibold">{tc.reportedBy}:</span>
              <span>{report.reporter_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-2">
              <Calendar size={16} weight="fill" />
              <span>{formatDate(report.created_at)}</span>
            </div>
          </div>

          {/* Images */}
          {report.report_attachments && report.report_attachments.length > 0 && (
            <div>
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
          <div>
            <h3 className="text-lg font-bold mb-3">{tc.description}</h3>
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
                onClick={() => onApprove(report)}
                disabled={actionLoading}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} weight="fill" />
                {tc.approveReport}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
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
            onClick={() => onDelete(report)}
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

export default AdminCommunityModeration;
