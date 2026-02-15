import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, PaperPlaneRight } from 'phosphor-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

export default function RatingModal({ isOpen, onClose, sessionId, language }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEnglish = language === 'en';

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(
        isEnglish
          ? 'Please select a rating'
          : 'অনুগ্রহ করে একটি রেটিং নির্বাচন করুন'
      );
      return;
    }

    try {
      setSubmitting(true);

      // Update chat session with rating
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          rating: rating,
          feedback_text: feedback.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success(
        isEnglish
          ? 'Thank you for your feedback!'
          : 'আপনার মতামতের জন্য ধন্যবাদ!'
      );

      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error(
        isEnglish
          ? 'Failed to submit feedback. Please try again.'
          : 'মতামত জমা দিতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] sm:w-[400px] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[90]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-green-600 p-4 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
              >
                <X size={20} weight="bold" />
              </button>
              
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star size={24} weight="fill" className="text-yellow-300" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-1">
                {isEnglish ? 'Rate Your Experience' : 'আপনার অভিজ্ঞতা রেট করুন'}
              </h2>
              <p className="text-white/80 text-xs">
                {isEnglish
                  ? 'How was your chat experience?'
                  : 'আপনার চ্যাট অভিজ্ঞতা কেমন ছিল?'}
              </p>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Star Rating */}
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      size={32}
                      weight={
                        star <= (hoveredRating || rating) ? 'fill' : 'regular'
                      }
                      className={`transition-colors ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>

              {/* Rating Text */}
              {rating > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                >
                  {rating === 5 && (isEnglish ? 'Excellent! 🎉' : 'চমৎকার! 🎉')}
                  {rating === 4 && (isEnglish ? 'Great! 😊' : 'দুর্দান্ত! 😊')}
                  {rating === 3 && (isEnglish ? 'Good 👍' : 'ভালো 👍')}
                  {rating === 2 && (isEnglish ? 'Fair 😐' : 'মোটামুটি 😐')}
                  {rating === 1 && (isEnglish ? 'Poor 😞' : 'খারাপ 😞')}
                </motion.p>
              )}

              {/* Feedback Textarea */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isEnglish
                    ? 'Additional feedback (optional)'
                    : 'অতিরিক্ত মতামত (ঐচ্ছিক)'}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    isEnglish
                      ? 'Tell us more about your experience...'
                      : 'আপনার অভিজ্ঞতা সম্পর্কে আরও বলুন...'
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {feedback.length}/500
                </p>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full py-2.5 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEnglish ? 'Submitting...' : 'জমা হচ্ছে...'}
                  </>
                ) : (
                  <>
                    <PaperPlaneRight size={20} weight="bold" />
                    {isEnglish ? 'Submit Feedback' : 'মতামত জমা দিন'}
                  </>
                )}
              </motion.button>

              {/* Skip Button */}
              <button
                onClick={onClose}
                className="w-full mt-2 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-xs"
              >
                {isEnglish ? 'Skip for now' : 'এখন এড়িয়ে যান'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
