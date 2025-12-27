import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Warning,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  MapPin,
  Image as ImageIcon,
  X,
  Plus
} from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabaseClient';
import SubmitReportModal from './SubmitReportModal';
import toast from 'react-hot-toast';

const MyReportsContent = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language] || translations.en;
  const tc = t.community;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyReports();
    }
  }, [user]);

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_reports')
        .select(`
          *,
          report_attachments (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching my reports:', error);
      toast.error(language === 'en' ? 'Failed to load your reports' : 'আপনার রিপোর্ট লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock size={16} weight="fill" />,
          text: tc.status.pending,
          className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
        };
      case 'approved':
        return {
          icon: <CheckCircle size={16} weight="fill" />,
          text: tc.status.approved,
          className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        };
      case 'rejected':
        return {
          icon: <XCircle size={16} weight="fill" />,
          text: tc.status.rejected,
          className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        };
      default:
        return null;
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

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    approved: reports.filter(r => r.status === 'approved').length,
    rejected: reports.filter(r => r.status === 'rejected').length
  };

  return (
    <div className="space-y-6">
      {/* Header with Submit Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {language === 'en' ? 'My Community Reports' : 'আমার কমিউনিটি রিপোর্ট'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Track your submitted reports' : 'আপনার জমা দেওয়া রিপোর্ট ট্র্যাক করুন'}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSubmitModal(true)}
          className="bg-primary text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Plus size={20} weight="bold" />
          {language === 'en' ? 'Submit Report' : 'রিপোর্ট জমা দিন'}
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Eye size={24} weight="duotone" className="text-primary" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{language === 'en' ? 'Total Reports' : 'মোট রিপোর্ট'}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock size={24} weight="duotone" className="text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{tc.status.pending}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.pending}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle size={24} weight="duotone" className="text-green-600" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{tc.status.approved}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.approved}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle size={24} weight="duotone" className="text-red-600" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{tc.status.rejected}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.rejected}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{language === 'en' ? 'Loading...' : 'লোড হচ্ছে...'}</p>
        </div>
      ) : reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700"
        >
          <Lightbulb size={64} weight="duotone" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {language === 'en' ? 'No reports yet' : 'এখনও কোনো রিপোর্ট নেই'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {language === 'en' ? 'Start contributing to your community!' : 'আপনার কমিউনিটিতে অবদান রাখা শুরু করুন!'}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSubmitModal(true)}
            className="bg-primary text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {language === 'en' ? 'Submit Your First Report' : 'আপনার প্রথম রিপোর্ট জমা দিন'}
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report, index) => {
            const statusBadge = getStatusBadge(report.status);
            const isDalal = report.report_type === 'dalal';
            
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
                onClick={() => handleViewDetails(report)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${isDalal ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                        {isDalal ? (
                          <Warning size={24} weight="duotone" className="text-red-600 dark:text-red-400" />
                        ) : (
                          <Lightbulb size={24} weight="duotone" className="text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          isDalal 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {isDalal ? tc.dalalReports : tc.suggestions}
                        </span>
                      </div>
                    </div>
                    <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                      {statusBadge.icon}
                      {statusBadge.text}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {language === 'en' ? report.title_en : report.title_bn}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {language === 'en' ? report.description_en : report.description_bn}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {report.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={16} weight="fill" />
                        {report.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={16} weight="fill" />
                      {formatDate(report.created_at)}
                    </span>
                    {report.report_attachments?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon size={16} weight="fill" />
                        {report.report_attachments.length}
                      </span>
                    )}
                  </div>

                  {report.status === 'approved' && !report.is_published && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                        <Clock size={16} weight="fill" />
                        {language === 'en' ? 'Approved but not yet published publicly' : 'অনুমোদিত কিন্তু এখনও প্রকাশ্যে প্রকাশিত হয়নি'}
                      </p>
                    </div>
                  )}

                  {report.status === 'rejected' && report.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">
                        {language === 'en' ? 'Rejection Reason:' : 'প্রত্যাখ্যানের কারণ:'}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {report.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Submit Report Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <SubmitReportModal
            isOpen={showSubmitModal}
            onClose={() => setShowSubmitModal(false)}
            onSuccess={() => {
              setShowSubmitModal(false);
              fetchMyReports();
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {language === 'en' ? 'Report Details' : 'রিপোর্ট বিস্তারিত'}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={24} weight="bold" className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    selectedReport.report_type === 'dalal'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {selectedReport.report_type === 'dalal' ? tc.dalalReports : tc.suggestions}
                  </span>
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(selectedReport.status).className}`}>
                    {getStatusBadge(selectedReport.status).icon}
                    {getStatusBadge(selectedReport.status).text}
                  </span>
                </div>

                <div>
                  <h4 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {language === 'en' ? selectedReport.title_en : selectedReport.title_bn}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {language === 'en' ? selectedReport.description_en : selectedReport.description_bn}
                  </p>
                </div>

                {selectedReport.location && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin size={20} weight="fill" />
                    <span>{selectedReport.location}</span>
                  </div>
                )}

                {selectedReport.incident_date && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar size={20} weight="fill" />
                    <span>{formatDate(selectedReport.incident_date)}</span>
                  </div>
                )}

                {selectedReport.report_attachments && selectedReport.report_attachments.length > 0 && (
                  <div>
                    <h5 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <ImageIcon size={20} weight="duotone" />
                      {language === 'en' ? 'Attachments' : 'সংযুক্তি'}
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedReport.report_attachments.map((attachment) => (
                        <img
                          key={attachment.id}
                          src={attachment.file_url}
                          alt="Evidence"
                          className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.status === 'rejected' && selectedReport.rejection_reason && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <p className="font-semibold text-red-800 dark:text-red-400 mb-2">
                      {language === 'en' ? 'Rejection Reason:' : 'প্রত্যাখ্যানের কারণ:'}
                    </p>
                    <p className="text-red-700 dark:text-red-400">{selectedReport.rejection_reason}</p>
                  </div>
                )}

                {selectedReport.admin_response_en && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <p className="font-semibold text-green-800 dark:text-green-400 mb-2">
                      {language === 'en' ? 'Admin Response:' : 'অ্যাডমিন প্রতিক্রিয়া:'}
                    </p>
                    <p className="text-green-700 dark:text-green-400">
                      {language === 'en' ? selectedReport.admin_response_en : selectedReport.admin_response_bn}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyReportsContent;
