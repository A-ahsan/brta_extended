import { motion } from 'framer-motion';
import { useState } from 'react';
import { useLanguage } from '../contexts/AppContext';

export default function QuestionCard({ question, showAnswer = false, onEdit, onDelete, isAdmin = false }) {
  const { language } = useLanguage();
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const isEnglish = language === 'en';
  const questionText = isEnglish ? question.question_text_en : question.question_text_bn;
  
  const options = [
    { 
      key: 'A', 
      text: isEnglish ? question.option_a_en : question.option_a_bn 
    },
    { 
      key: 'B', 
      text: isEnglish ? question.option_b_en : question.option_b_bn 
    },
    { 
      key: 'C', 
      text: isEnglish ? question.option_c_en : question.option_c_bn 
    },
    { 
      key: 'D', 
      text: isEnglish ? question.option_d_en : question.option_d_bn 
    },
  ];

  const handleAnswerSelect = (key) => {
    if (!revealed) {
      setSelectedAnswer(key);
    }
  };

  const handleRevealAnswer = () => {
    setRevealed(true);
  };

  const getOptionStyle = (optionKey) => {
    if (!revealed && !showAnswer) {
      return selectedAnswer === optionKey 
        ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400' 
        : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600';
    }

    if (optionKey === question.correct_answer) {
      return 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400';
    }

    if (revealed && selectedAnswer === optionKey && optionKey !== question.correct_answer) {
      return 'bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-400';
    }

    return 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              {question.question_type === 'mcq' 
                ? (isEnglish ? 'MCQ' : 'এমসিকিউ')
                : (isEnglish ? 'Road Sign' : 'রোড সাইন')
              }
            </span>
            {!question.is_active && (
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm font-medium">
                {isEnglish ? 'Inactive' : 'নিষ্ক্রিয়'}
              </span>
            )}
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
            {questionText}
          </p>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onEdit(question)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title={isEnglish ? 'Edit' : 'সম্পাদনা'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(question.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title={isEnglish ? 'Delete' : 'মুছুন'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Road Sign Image */}
      {question.question_type === 'road_sign' && question.image_url && (
        <div className="mb-6 flex justify-center">
          <img 
            src={question.image_url} 
            alt="Road Sign"
            className="max-w-xs rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-700"
          />
        </div>
      )}

      {/* Options */}
      <div className="space-y-3 mb-4">
        {options.map((option) => (
          <button
            key={option.key}
            onClick={() => handleAnswerSelect(option.key)}
            disabled={revealed || showAnswer}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${getOptionStyle(option.key)} ${
              !revealed && !showAnswer ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 font-bold text-gray-700 dark:text-gray-300">
                {option.key}
              </span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {option.text}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Reveal Answer Button */}
      {!showAnswer && !revealed && selectedAnswer && (
        <button
          onClick={handleRevealAnswer}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          {isEnglish ? 'Check Answer' : 'উত্তর যাচাই করুন'}
        </button>
      )}

      {/* Answer Feedback - Only show for non-admin interactive mode */}
      {!isAdmin && !showAnswer && revealed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-4 rounded-lg ${
            selectedAnswer === question.correct_answer
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {selectedAnswer === question.correct_answer ? (
              <>
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-green-800 dark:text-green-200">
                  {isEnglish ? 'Correct Answer!' : 'সঠিক উত্তর!'}
                </span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-red-800 dark:text-red-200">
                  {isEnglish ? `Correct Answer: ${question.correct_answer}` : `সঠিক উত্তর: ${question.correct_answer}`}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
