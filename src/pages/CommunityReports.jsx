import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MegaphoneSimple,
  Lightbulb,
  MapPin,
  Calendar,
  Eye,
  Plus,
  X,
  FunnelSimple,
  Image as ImageIcon,
  Warning,
  CheckCircle
} from 'phosphor-react';
import Navbar from '../components/Navbar';
import SubmitReportModal from '../components/SubmitReportModal';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const CommunityReports = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language] || translations.en;
  const tc = t.community;

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'dalal', 'suggestion'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_reports')
        .select(`
          *,
          report_attachments (*)
        `)
        .eq('is_published', true)
        .eq('status', 'approved')
        .order('published_at', { ascending: false });

      if (activeTab === 'dalal') {
        query = query.eq('report_type', 'dalal');
      } else if (activeTab === 'suggestion') {
        query = query.eq('report_type', 'suggestion');
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching community reports:', error);
      toast.error(tc.submitError);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmitModal = (reportType) => {
    if (!user) {
      toast.error(language === 'en' ? 'Please login to submit a report' : 'রিপোর্ট জমা দিতে লগইন করুন');
      navigate('/login');
      return;
    }
    setSelectedReportType(reportType);
    setShowSubmitModal(true);
  };

  const handleReportSubmitted = () => {
    setShowSubmitModal(false);
    setSelectedReportType(null);
    // Don't fetch reports immediately as they need admin approval first
    toast.success(tc.submitSuccess);
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
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

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: [0, 100, 0], y: [0, -100, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-2xl"
          />
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users size={48} weight="duotone" className="text-primary dark:text-green-400" />
              <h1 className="text-4xl md:text-5xl font-extrabold text-primary dark:text-green-400">
                {tc.title}
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {tc.subtitle}
            </p>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenSubmitModal('dalal')}
              className="flex items-center gap-2 bg-gradient-to-r from-danger to-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <Warning size={24} weight="fill" />
              {tc.reportDalal}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenSubmitModal('suggestion')}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <Lightbulb size={24} weight="fill" />
              {tc.submitSuggestion}
            </motion.button>

            {user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard/my-reports')}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 text-primary dark:text-green-400 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all border-2 border-primary dark:border-green-400"
              >
                <Eye size={24} weight="fill" />
                {tc.myReports}
              </motion.button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {[
              { id: 'all', label: tc.all, icon: Users },
              { id: 'dalal', label: tc.dalalsOnly, icon: Warning },
              { id: 'suggestion', label: tc.suggestionsOnly, icon: Lightbulb }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary dark:bg-green-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon size={20} weight="fill" />
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Reports Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-pulse">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20">
              <Users size={64} weight="duotone" className="text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600 dark:text-gray-400">{tc.noReports}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  language={language}
                  tc={tc}
                  onViewDetails={handleViewDetails}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Submit Report Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <SubmitReportModal
            reportType={selectedReportType}
            onClose={() => {
              setShowSubmitModal(false);
              setSelectedReportType(null);
            }}
            onSubmitted={handleReportSubmitted}
          />
        )}
      </AnimatePresence>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            language={language}
            tc={tc}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedReport(null);
            }}
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Report Card Component
const ReportCard = ({ report, language, tc, onViewDetails, formatDate }) => {
  const isDalal = report.report_type === 'dalal';
  const title = language === 'en' ? report.title_en : report.title_bn;
  const description = language === 'en' ? report.description_en : report.description_bn;
  const location = language === 'en' ? report.location_en : report.location_bn;
  const hasImages = report.report_attachments && report.report_attachments.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden cursor-pointer"
      onClick={() => onViewDetails(report)}
    >
      {/* Image Preview */}
      {hasImages && (
        <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <img
            src={report.report_attachments[0].file_url}
            alt={title}
            className="w-full h-full object-cover"
          />
          {report.report_attachments.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <ImageIcon size={16} weight="fill" />
              +{report.report_attachments.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {/* Type Badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
            isDalal
              ? 'bg-red-100 dark:bg-red-900/30 text-danger dark:text-red-400'
              : 'bg-green-100 dark:bg-green-900/30 text-primary dark:text-green-400'
          }`}>
            {isDalal ? <Warning size={16} weight="fill" /> : <Lightbulb size={16} weight="fill" />}
            {language === 'en' ? tc.types[report.report_type] : tc.types[report.report_type]}
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

        {/* Meta Info */}
        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          {location && (
            <div className="flex items-center gap-2">
              <MapPin size={14} weight="fill" />
              <span>{location}</span>
            </div>
          )}
          
          {report.incident_date && (
            <div className="flex items-center gap-2">
              <Calendar size={14} weight="fill" />
              <span>{tc.incidentOn}: {formatDate(report.incident_date)}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <CheckCircle size={14} weight="fill" className="text-green-600" />
            <span>{tc.publishedOn}: {formatDate(report.published_at)}</span>
          </div>

          {!report.is_anonymous && (
            <div className="text-primary dark:text-green-400 font-semibold">
              {tc.reportedBy}: {report.reporter_name}
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

// Report Detail Modal Component
const ReportDetailModal = ({ report, language, tc, onClose, formatDate }) => {
  const isDalal = report.report_type === 'dalal';
  const title = language === 'en' ? report.title_en : report.title_bn;
  const description = language === 'en' ? report.description_en : report.description_bn;
  const location = language === 'en' ? report.location_en : report.location_bn;
  const adminResponse = language === 'en' ? report.admin_response_en : report.admin_response_bn;

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
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              isDalal
                ? 'bg-red-100 dark:bg-red-900/30 text-danger dark:text-red-400'
                : 'bg-green-100 dark:bg-green-900/30 text-primary dark:text-green-400'
            }`}>
              {language === 'en' ? tc.types[report.report_type] : tc.types[report.report_type]}
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
          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            {title}
          </h2>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            {!report.is_anonymous && (
              <div className="flex items-center gap-2">
                <Users size={16} weight="fill" />
                <span>{tc.reportedBy}: <strong>{report.reporter_name}</strong></span>
              </div>
            )}
            
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
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
              {tc.description}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {description}
            </p>
          </div>

          {/* Admin Response */}
          {adminResponse && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-primary dark:border-green-600 rounded-xl p-6">
              <h3 className="text-lg font-bold text-primary dark:text-green-400 mb-3 flex items-center gap-2">
                <CheckCircle size={24} weight="fill" />
                {tc.adminResponse}
              </h3>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {adminResponse}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CommunityReports;
