import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  Warning,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  MapPin,
  Image as ImageIcon,
  X
} from 'phosphor-react';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const MyReports = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language] || translations.en;
  const tc = t.community;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-light via-white to-muted dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      {/* Header */}
      <section className="relative pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <button
            onClick={() => navigate('/community')}
            className="flex items-center gap-2 text-primary dark:text-green-400 hover:underline mb-6 font-semibold"
          >
            <ArrowLeft size={20} weight="bold" />
            {language === 'en' ? 'Back to Community' : 'কমিউনিটিতে ফিরে যান'}
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users size={48} weight="duotone" className="text-primary dark:text-green-400" />
              <h1 className="text-4xl md:text-5xl font-extrabold text-primary dark:text-green-400">
                {tc.myReports}
              </h1>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {language === 'en' 
                ? 'Track the status of your submitted reports and suggestions' 
                : 'আপনার জমাকৃত রিপোর্ট এবং পরামর্শের অবস্থা ট্র্যাক করুন'}
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center"
            >
              <Clock size={32} weight="fill" className="text-yellow-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                {reports.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-500">{tc.status.pending}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 text-center"
            >
              <CheckCircle size={32} weight="fill" className="text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {reports.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-500">{tc.status.approved}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 text-center"
            >
              <XCircle size={32} weight="fill" className="text-red-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                {reports.filter(r => r.status === 'rejected').length}
              </div>
              <div className="text-sm text-red-600 dark:text-red-500">{tc.status.rejected}</div>
            </motion.div>
          </div>

          {/* Reports List */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-lg"
            >
              <Users size={64} weight="duotone" className="text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">{tc.noMyReports}</p>
              <button
                onClick={() => navigate('/community')}
                className="bg-gradient-to-r from-primary to-green-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                {language === 'en' ? 'Submit Your First Report' : 'আপনার প্রথম রিপোর্ট জমা দিন'}
              </button>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <MyReportCard
                  key={report.id}
                  report={report}
                  language={language}
                  tc={tc}
                  onViewDetails={handleViewDetails}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <MyReportDetailModal
            report={selectedReport}
            language={language}
            tc={tc}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedReport(null);
            }}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// My Report Card Component
const MyReportCard = ({ report, language, tc, onViewDetails, formatDate, getStatusBadge }) => {
  const isDalal = report.report_type === 'dalal';
  const title = language === 'en' ? report.title_en : report.title_bn;
  const description = language === 'en' ? report.description_en : report.description_bn;
  const statusBadge = getStatusBadge(report.status);
  const hasImages = report.report_attachments && report.report_attachments.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden cursor-pointer"
      onClick={() => onViewDetails(report)}
    >
      <div className="p-6">
        {/* Type & Status */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
            isDalal
              ? 'bg-red-100 dark:bg-red-900/30 text-danger dark:text-red-400'
              : 'bg-green-100 dark:bg-green-900/30 text-primary dark:text-green-400'
          }`}>
            {isDalal ? <Warning size={16} weight="fill" /> : <Lightbulb size={16} weight="fill" />}
            {tc.types[report.report_type]}
          </span>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${statusBadge.className}`}>
            {statusBadge.icon}
            {statusBadge.text}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
          {description}
        </p>

        {/* Meta */}
        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar size={14} weight="fill" />
            <span>{tc.reportedOn}: {formatDate(report.created_at)}</span>
          </div>

          {hasImages && (
            <div className="flex items-center gap-2">
              <ImageIcon size={14} weight="fill" />
              <span>{report.report_attachments.length} {tc.images}</span>
            </div>
          )}

          {report.is_published && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
              <CheckCircle size={14} weight="fill" />
              <span>{language === 'en' ? 'Published' : 'প্রকাশিত'}</span>
            </div>
          )}
        </div>

        {/* View Button */}
        <button className="mt-4 w-full bg-primary dark:bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-primary-dark dark:hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
          <Eye size={18} weight="fill" />
          {tc.viewDetails}
        </button>
      </div>
    </motion.div>
  );
};

// My Report Detail Modal
const MyReportDetailModal = ({ report, language, tc, onClose, formatDate, getStatusBadge }) => {
  const isDalal = report.report_type === 'dalal';
  const title = language === 'en' ? report.title_en : report.title_bn;
  const description = language === 'en' ? report.description_en : report.description_bn;
  const location = language === 'en' ? report.location_en : report.location_bn;
  const adminResponse = language === 'en' ? report.admin_response_en : report.admin_response_bn;
  const statusBadge = getStatusBadge(report.status);

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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {isDalal ? (
              <Warning size={32} weight="fill" className="text-danger" />
            ) : (
              <Lightbulb size={32} weight="fill" className="text-primary dark:text-green-400" />
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusBadge.className}`}>
              {statusBadge.icon}
              {statusBadge.text}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{title}</h2>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar size={16} weight="fill" />
              <span>{tc.reportedOn}: {formatDate(report.created_at)}</span>
            </div>

            {report.incident_date && (
              <div className="flex items-center gap-2">
                <Calendar size={16} weight="fill" className="text-danger" />
                <span>{tc.incidentOn}: {formatDate(report.incident_date)}</span>
              </div>
            )}

            {location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} weight="fill" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Images */}
          {report.report_attachments && report.report_attachments.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <ImageIcon size={20} weight="fill" />
                {tc.images} ({report.report_attachments.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {report.report_attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={attachment.file_url}
                      alt="Report evidence"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">{tc.description}</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{description}</p>
          </div>

          {/* Admin Response */}
          {adminResponse && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-primary dark:border-green-600 rounded-xl p-6">
              <h3 className="text-lg font-bold text-primary dark:text-green-400 mb-3 flex items-center gap-2">
                <CheckCircle size={24} weight="fill" />
                {tc.adminResponse}
              </h3>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{adminResponse}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {report.status === 'rejected' && report.rejection_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-danger dark:border-red-600 rounded-xl p-6">
              <h3 className="text-lg font-bold text-danger dark:text-red-400 mb-3 flex items-center gap-2">
                <XCircle size={24} weight="fill" />
                {tc.rejectionReason}
              </h3>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{report.rejection_reason}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MyReports;
