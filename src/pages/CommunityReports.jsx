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

    // Subscribe to real-time updates for published reports
    const subscription = supabase
      .channel('public-community-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_reports',
          filter: 'is_published=eq.true'
        },
        (payload) => {
          console.log('Public - Report change:', payload);
          // Refetch reports when any published report changes
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeTab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_reports')
        .select(`
          *,
          report_attachments (*)
        `)
        .eq('report_type', 'dalal')
        .eq('is_published', true)
        .eq('status', 'approved')
        .order('published_at', { ascending: false });

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 bg-gradient-to-r from-red-600 to-red-700 dark:from-red-900 dark:to-red-950">
        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Warning size={64} weight="duotone" className="text-white" />
              </motion.div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
              {language === 'en' ? 'Fight Corruption' : 'দুর্নীতির বিরুদ্ধে লড়াই'}
            </h1>
            <p className="text-xl md:text-2xl text-red-100 mb-8 max-w-3xl mx-auto">
              {language === 'en' 
                ? 'Report dalals (brokers/middlemen) who exploit citizens at BRTA offices' 
                : 'BRTA অফিসে নাগরিকদের শোষণকারী দালালদের রিপোর্ট করুন'}
            </p>
            
            {/* Single Action Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenSubmitModal}
              className="inline-flex items-center gap-3 bg-white text-red-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all border-4 border-white"
            >
              <Warning size={28} weight="fill" />
              {language === 'en' ? 'Report a Dalal' : 'দালাল রিপোর্ট করুন'}
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Reports Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {language === 'en' ? 'Recent Reports' : 'সাম্প্রতিক রিপোর্ট'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'en' 
                  ? `${reports.length} dalal reports exposed by citizens` 
                  : `${reports.length}টি দালাল রিপোর্ট নাগরিকদের দ্বারা প্রকাশিত`}
              </p>
            </div>
          </div>

          {/* Reports Grid - Premium Design */}
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-xl"
            >
              <Users size={80} weight="duotone" className="text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                {language === 'en' ? 'No Reports Yet' : 'এখনও কোনো রিপোর্ট নেই'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {language === 'en' 
                  ? 'Be the first to report a dalal and help build a corruption-free BRTA!' 
                  : 'প্রথম দালাল রিপোর্ট করুন এবং দুর্নীতিমুক্ত BRTA গড়তে সাহায্য করুন!'}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenSubmitModal}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <Warning size={24} weight="fill" />
                {language === 'en' ? 'Submit First Report' : 'প্রথম রিপোর্ট জমা দিন'}
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {reports.map((report, index) => (
                <PremiumReportCard
                  key={report.id}
                  report={report}
                  index={index}
                  language={language}
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
            reportType="dalal"
            onClose={() => setShowSubmitModal(false)}
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
            tc={t.community}
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

// Premium Report Card Component - Magazine/Post Style
const PremiumReportCard = ({ report, index, language, onViewDetails, formatDate }) => {
  const title = language === 'en' ? report.title_en : report.title_bn;
  const description = language === 'en' ? report.description_en : report.description_bn;
  const location = language === 'en' ? report.location_en : report.location_bn;
  const hasImages = report.report_attachments && report.report_attachments.length > 0;
  const displayName = report.is_anonymous ? (language === 'en' ? 'Anonymous Citizen' : 'বেনামী নাগরিক') : report.reporter_name;

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group bg-white dark:bg-gray-800 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700"
    >
      <div className="md:flex">
        {/* Image Section - Left Side */}
        {hasImages && (
          <div className="md:w-2/5 relative overflow-hidden bg-gray-900">
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              src={report.report_attachments[0].file_url}
              alt={title}
              className="w-full h-64 md:h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            
            {/* Image Count Badge */}
            {report.report_attachments.length > 1 && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                <ImageIcon size={18} weight="fill" />
                {report.report_attachments.length} {language === 'en' ? 'Photos' : 'ছবি'}
              </div>
            )}
            
            {/* Danger Badge */}
            <div className="absolute bottom-4 left-4">
              <span className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                <Warning size={20} weight="fill" />
                {language === 'en' ? 'DALAL ALERT' : 'দালাল সতর্কতা'}
              </span>
            </div>
          </div>
        )}

        {/* Content Section - Right Side */}
        <div className={`${hasImages ? 'md:w-3/5' : 'w-full'} p-8`}>
          {/* Meta Header */}
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Users size={16} weight="fill" className="text-red-600" />
              </div>
              <span className="font-medium">{displayName}</span>
            </div>
            <span>•</span>
            <span>{formatDate(report.published_at || report.created_at)}</span>
          </div>

          {/* Title - Headline Style */}
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
            {title}
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed line-clamp-3">
            {description}
          </p>

          {/* Location & Date Info */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            {location && (
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full">
                <MapPin size={16} weight="fill" className="text-red-600" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{location}</span>
              </div>
            )}
            {report.incident_date && (
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full">
                <Calendar size={16} weight="fill" className="text-red-600" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {language === 'en' ? 'Incident: ' : 'ঘটনা: '}{formatDate(report.incident_date)}
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onViewDetails(report)}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <Eye size={20} weight="fill" />
            {language === 'en' ? 'View Full Report' : 'সম্পূর্ণ রিপোর্ট দেখুন'}
          </motion.button>

          {/* Verified Badge */}
          <div className="mt-6 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle size={18} weight="fill" />
            <span className="font-semibold">
              {language === 'en' ? 'Verified by Admin' : 'অ্যাডমিন দ্বারা যাচাইকৃত'}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

// Old Report Card Component (Keeping for backwards compatibility)
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
