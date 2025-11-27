import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/AppContext';
import QuestionCard from '../components/QuestionCard';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export default function QuestionBank() {
  const { language } = useLanguage();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, mcq, road_sign
  const [searchQuery, setSearchQuery] = useState('');

  const isEnglish = language === 'en';

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error(isEnglish ? 'Failed to load questions' : 'প্রশ্ন লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    // Filter by type
    if (filter !== 'all' && q.question_type !== filter) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesEnglish = q.question_text_en.toLowerCase().includes(query);
      const matchesBangla = q.question_text_bn.includes(searchQuery);
      return matchesEnglish || matchesBangla;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {isEnglish ? 'Question Bank' : 'প্রশ্ন ব্যাংক'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isEnglish 
              ? 'Practice questions for your driving license exam'
              : 'আপনার ড্রাইভিং লাইসেন্স পরীক্ষার জন্য প্রশ্ন অনুশীলন করুন'
            }
          </p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder={isEnglish ? 'Search questions...' : 'প্রশ্ন খুঁজুন...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isEnglish ? 'All' : 'সব'}
              </button>
              <button
                onClick={() => setFilter('mcq')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  filter === 'mcq'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isEnglish ? 'MCQ' : 'এমসিকিউ'}
              </button>
              <button
                onClick={() => setFilter('road_sign')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  filter === 'road_sign'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isEnglish ? 'Road Signs' : 'রোড সাইন'}
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {isEnglish 
              ? `Showing ${filteredQuestions.length} of ${questions.length} questions`
              : `${questions.length} টি প্রশ্নের মধ্যে ${filteredQuestions.length} টি দেখানো হচ্ছে`
            }
          </div>
        </motion.div>

        {/* Questions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center"
          >
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {isEnglish ? 'No questions found' : 'কোনো প্রশ্ন পাওয়া যায়নি'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {filteredQuestions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <QuestionCard question={question} showAnswer={true} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
