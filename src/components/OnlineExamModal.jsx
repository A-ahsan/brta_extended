import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Clock, 
  CheckCircle, 
  WarningCircle, 
  ArrowRight,
  Trophy,
  Target,
  Lightning,
  BookOpen,
  Eye,
  EyeSlash,
  Warning
} from 'phosphor-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export default function OnlineExamModal({ open, onClose, application }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  // Exam state
  const [step, setStep] = useState('instructions'); // instructions, exam, processing, success, failed
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  const timerRef = useRef(null);
  const examContainerRef = useRef(null);

  // Constants
  const TOTAL_QUESTIONS = 15;
  const MCQ_COUNT = 12;
  const ROAD_SIGN_COUNT = 3;
  const TIME_PER_QUESTION = 30;
  const MAX_TAB_SWITCHES = 3;
  const PASSING_THRESHOLD = 10;
  const MCQ_PASSING = 8;
  const ROAD_SIGN_PASSING = 2;

  // Load random questions from database
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch random MCQ questions
      const { data: mcqData, error: mcqError } = await supabase
        .from('questions')
        .select('*')
        .eq('question_type', 'mcq')
        .eq('is_active', true)
        .limit(100);

      if (mcqError) throw mcqError;

      // Fetch random Road Sign questions
      const { data: roadSignData, error: roadSignError } = await supabase
        .from('questions')
        .select('*')
        .eq('question_type', 'road_sign')
        .eq('is_active', true)
        .limit(50);

      if (roadSignError) throw roadSignError;

      // Shuffle and select questions
      const shuffledMCQ = mcqData.sort(() => Math.random() - 0.5).slice(0, MCQ_COUNT);
      const shuffledRoadSign = roadSignData.sort(() => Math.random() - 0.5).slice(0, ROAD_SIGN_COUNT);

      // Combine and shuffle again
      const allQuestions = [...shuffledMCQ, ...shuffledRoadSign].sort(() => Math.random() - 0.5);
      
      setQuestions(allQuestions);
      console.log('Loaded questions:', allQuestions.length);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error(isEnglish ? 'Failed to load exam questions' : 'পরীক্ষার প্রশ্ন লোড করতে ব্যর্থ');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [isEnglish, onClose]);

  // Start exam
  const startExam = async () => {
    try {
      // Request fullscreen
      if (examContainerRef.current) {
        await examContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
      
      await loadQuestions();
      setExamStarted(true);
      setStep('exam');
      setTimeLeft(TIME_PER_QUESTION);
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error(isEnglish ? 'Please allow fullscreen to start exam' : 'পরীক্ষা শুরু করতে ফুলস্ক্রিন অনুমতি দিন');
    }
  };

  // Timer effect
  useEffect(() => {
    if (step === 'exam' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Auto-move to next question when time runs out
            handleNextQuestion();
            return TIME_PER_QUESTION;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [step, timeLeft, currentQuestionIndex]);

  // Tab switch and window blur detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examStarted && step === 'exam') {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        setShowWarning(true);

        setTimeout(() => setShowWarning(false), 3000);

        if (newCount >= MAX_TAB_SWITCHES) {
          handleExamFailed('Tab switch limit exceeded');
        } else {
          toast.error(
            isEnglish 
              ? `Warning! Tab switch detected (${newCount}/${MAX_TAB_SWITCHES})` 
              : `সতর্কতা! ট্যাব পরিবর্তন সনাক্ত করা হয়েছে (${newCount}/${MAX_TAB_SWITCHES})`
          );
        }
      }
    };

    const handleWindowBlur = () => {
      if (examStarted && step === 'exam') {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        setShowWarning(true);

        setTimeout(() => setShowWarning(false), 3000);

        if (newCount >= MAX_TAB_SWITCHES) {
          handleExamFailed('Window switch limit exceeded');
        } else {
          toast.error(
            isEnglish 
              ? `Warning! Window switch detected (${newCount}/${MAX_TAB_SWITCHES})` 
              : `সতর্কতা! উইন্ডো পরিবর্তন সনাক্ত করা হয়েছে (${newCount}/${MAX_TAB_SWITCHES})`
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [examStarted, step, tabSwitchCount, isEnglish]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && examStarted && step === 'exam') {
        setIsFullscreen(false);
        handleExamFailed('Exited fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examStarted, step]);

  // Handle answer selection
  const handleAnswerSelect = (answer) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(TIME_PER_QUESTION);
    } else {
      // All questions answered, submit exam
      submitExam();
    }
  };

  // Submit exam
  const submitExam = async () => {
    try {
      setStep('processing');
      clearInterval(timerRef.current);

      // Calculate results
      let mcqCorrect = 0;
      let roadSignCorrect = 0;
      let totalCorrect = 0;

      questions.forEach(q => {
        const userAnswer = answers[q.id];
        if (userAnswer === q.correct_answer) {
          totalCorrect++;
          if (q.question_type === 'mcq') {
            mcqCorrect++;
          } else {
            roadSignCorrect++;
          }
        }
      });

      const passed = totalCorrect >= PASSING_THRESHOLD && mcqCorrect >= MCQ_PASSING && roadSignCorrect >= ROAD_SIGN_PASSING;

      console.log('Exam Results:', {
        totalCorrect,
        mcqCorrect,
        roadSignCorrect,
        passed
      });

      if (passed) {
        await handleExamPassed(totalCorrect, mcqCorrect, roadSignCorrect);
      } else {
        await handleExamFailed('Insufficient score', totalCorrect, mcqCorrect, roadSignCorrect);
      }

    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error(isEnglish ? 'Failed to submit exam' : 'পরীক্ষা জমা দিতে ব্যর্থ');
      setStep('failed');
    }
  };

  // Handle exam passed
  const handleExamPassed = async (totalCorrect, mcqCorrect, roadSignCorrect) => {
    try {
      // Update application
      const { error: updateError } = await supabase
        .from('license_applications')
        .update({
          online_exam: 1,
          online_exam_completed_at: new Date().toISOString(),
          status: 'online_exam_passed'
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Create notifications
      await supabase.rpc('create_dual_notification', {
        p_user_id: user.id,
        p_title_en: 'Online Exam Passed!',
        p_title_bn: 'অনলাইন পরীক্ষায় উত্তীর্ণ!',
        p_message_en: `Congratulations! You scored ${totalCorrect}/${TOTAL_QUESTIONS} in your online exam for application ${application.application_number}. Next step: Physical Exam.`,
        p_message_bn: `অভিনন্দন! আপনি ${application.application_number} আবেদনের অনলাইন পরীক্ষায় ${totalCorrect}/${TOTAL_QUESTIONS} পেয়েছেন। পরবর্তী ধাপ: শারীরিক পরীক্ষা।`,
        p_type: 'exam',
        p_application_id: application.id,
        p_admin_title_en: 'Online Exam Passed',
        p_admin_title_bn: 'অনলাইন পরীক্ষা উত্তীর্ণ',
        p_admin_message_en: `${application.license_type}-${application.license_category}: ${application.full_name_en} (${application.application_number}) - Score: ${totalCorrect}/${TOTAL_QUESTIONS} (MCQ: ${mcqCorrect}/${MCQ_COUNT}, Road Sign: ${roadSignCorrect}/${ROAD_SIGN_COUNT})`,
        p_admin_message_bn: `${application.license_type}-${application.license_category}: ${application.full_name_bn} (${application.application_number}) - স্কোর: ${totalCorrect}/${TOTAL_QUESTIONS} (MCQ: ${mcqCorrect}/${MCQ_COUNT}, সড়ক চিহ্ন: ${roadSignCorrect}/${ROAD_SIGN_COUNT})`
      });

      setStep('success');

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 5000);

    } catch (error) {
      console.error('Error updating exam status:', error);
      toast.error(isEnglish ? 'Failed to update exam status' : 'পরীক্ষার স্ট্যাটাস আপডেট করতে ব্যর্থ');
      setStep('failed');
    }
  };

  // Handle exam failed
  const handleExamFailed = async (reason, totalCorrect = 0, mcqCorrect = 0, roadSignCorrect = 0) => {
    try {
      setStep('failed');

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      // Create notification about failure
      await supabase.rpc('create_dual_notification', {
        p_user_id: user.id,
        p_title_en: 'Online Exam Failed',
        p_title_bn: 'অনলাইন পরীক্ষা ব্যর্থ',
        p_message_en: `Your online exam attempt for application ${application.application_number} was unsuccessful. Reason: ${reason}. You can retake the exam.`,
        p_message_bn: `আপনার আবেদন ${application.application_number} এর অনলাইন পরীক্ষার প্রচেষ্টা ব্যর্থ হয়েছে। কারণ: ${reason}। আপনি আবার পরীক্ষা দিতে পারেন।`,
        p_type: 'exam',
        p_application_id: application.id,
        p_admin_title_en: 'Online Exam Failed',
        p_admin_title_bn: 'অনলাইন পরীক্ষা ব্যর্থ',
        p_admin_message_en: `${application.license_type}-${application.license_category}: ${application.full_name_en} (${application.application_number}) - Failed (Reason: ${reason})`,
        p_admin_message_bn: `${application.license_type}-${application.license_category}: ${application.full_name_bn} (${application.application_number}) - ব্যর্থ (কারণ: ${reason})`
      });

    } catch (error) {
      console.error('Error handling exam failure:', error);
    }
  };

  const handleClose = () => {
    if (examStarted && step === 'exam') {
      if (!confirm(isEnglish ? 'Are you sure you want to exit the exam? Your progress will be lost.' : 'আপনি কি পরীক্ষা থেকে প্রস্থান করতে চান? আপনার অগ্রগতি হারিয়ে যাবে।')) {
        return;
      }
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    clearInterval(timerRef.current);
    onClose();
  };

  if (!open) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100;

  const renderInstructions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
          <BookOpen size={40} className="text-primary" weight="duotone" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isEnglish ? 'Online Driving Exam' : 'অনলাইন ড্রাইভিং পরীক্ষা'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {isEnglish ? 'Read the instructions carefully before starting' : 'শুরু করার আগে নির্দেশাবলী সাবধানে পড়ুন'}
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Target size={24} className="text-primary flex-shrink-0 mt-1" weight="duotone" />
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">
              {isEnglish ? 'Exam Structure' : 'পরীক্ষার কাঠামো'}
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• {isEnglish ? `Total Questions: ${TOTAL_QUESTIONS} (${MCQ_COUNT} MCQ + ${ROAD_SIGN_COUNT} Road Signs)` : `মোট প্রশ্ন: ${TOTAL_QUESTIONS} (${MCQ_COUNT} MCQ + ${ROAD_SIGN_COUNT} সড়ক চিহ্ন)`}</li>
              <li>• {isEnglish ? `Time per Question: ${TIME_PER_QUESTION} seconds` : `প্রতি প্রশ্নে সময়: ${TIME_PER_QUESTION} সেকেন্ড`}</li>
              <li>• {isEnglish ? `Passing Score: ${PASSING_THRESHOLD}/${TOTAL_QUESTIONS} (At least ${MCQ_PASSING} MCQ + ${ROAD_SIGN_PASSING} Road Sign correct)` : `উত্তীর্ণ স্কোর: ${PASSING_THRESHOLD}/${TOTAL_QUESTIONS} (কমপক্ষে ${MCQ_PASSING} MCQ + ${ROAD_SIGN_PASSING} সড়ক চিহ্ন সঠিক)`}</li>
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Lightning size={24} className="text-yellow-600 flex-shrink-0 mt-1" weight="duotone" />
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">
              {isEnglish ? 'Important Rules' : 'গুরুত্বপূর্ণ নিয়ম'}
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• {isEnglish ? 'Exam must be taken in fullscreen mode' : 'ফুলস্ক্রিন মোডে পরীক্ষা দিতে হবে'}</li>
              <li>• {isEnglish ? `Maximum ${MAX_TAB_SWITCHES} tab switches allowed` : `সর্বোচ্চ ${MAX_TAB_SWITCHES} বার ট্যাব পরিবর্তন অনুমোদিত`}</li>
              <li className="text-red-600 dark:text-red-400 font-semibold">• {isEnglish ? 'Exceeding tab switches will cancel your exam' : 'ট্যাব পরিবর্তনের সীমা অতিক্রম করলে পরীক্ষা বাতিল হবে'}</li>
              <li>• {isEnglish ? 'Questions cannot be revisited' : 'প্রশ্ন পুনরায় দেখা যাবে না'}</li>
              <li>• {isEnglish ? 'Auto-submit when time expires' : 'সময় শেষ হলে স্বয়ংক্রিয় জমা'}</li>
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Warning size={24} className="text-red-600 flex-shrink-0 mt-1" weight="duotone" />
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">
              {isEnglish ? 'Anti-Cheating Measures' : 'প্রতারণা রোধ ব্যবস্থা'}
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• {isEnglish ? 'Tab switching is monitored' : 'ট্যাব পরিবর্তন পর্যবেক্ষণ করা হয়'}</li>
              <li>• {isEnglish ? 'Fullscreen exit will terminate exam' : 'ফুলস্ক্রিন থেকে বের হলে পরীক্ষা বন্ধ হবে'}</li>
              <li>• {isEnglish ? 'Random question order' : 'র‍্যান্ডম প্রশ্ন ক্রম'}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleClose}
          className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg transition-all"
        >
          {isEnglish ? 'Cancel' : 'বাতিল'}
        </button>
        <button
          onClick={startExam}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-green-600 hover:from-primary-dark hover:to-green-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <ArrowRight size={20} />
              </motion.div>
              {isEnglish ? 'Loading...' : 'লোড হচ্ছে...'}
            </>
          ) : (
            <>
              <Lightning size={20} weight="fill" />
              {isEnglish ? 'Start Exam' : 'পরীক্ষা শুরু করুন'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );

  const renderExam = () => (
    <div className="space-y-6">
      {/* Warning Banner */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500 text-white px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <Warning size={24} weight="fill" />
            <span className="font-bold">
              {isEnglish 
                ? `Tab Switch Detected! (${tabSwitchCount}/${MAX_TAB_SWITCHES})` 
                : `ট্যাব পরিবর্তন সনাক্ত! (${tabSwitchCount}/${MAX_TAB_SWITCHES})`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress and Timer Header */}
      <div className="bg-gradient-to-r from-primary to-green-600 text-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={20} weight="duotone" />
            <span className="font-semibold">
              {isEnglish ? 'Question' : 'প্রশ্ন'} {currentQuestionIndex + 1}/{TOTAL_QUESTIONS}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={20} weight="fill" />
            <span className="font-bold text-xl">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-white rounded-full"
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 space-y-4"
        >
          {/* Question Type Badge */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              currentQuestion.question_type === 'mcq' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            }`}>
              {currentQuestion.question_type === 'mcq' 
                ? (isEnglish ? 'MCQ' : 'বহুনির্বাচনী') 
                : (isEnglish ? 'Road Sign' : 'সড়ক চিহ্ন')}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isEnglish ? 'Tab Switches' : 'ট্যাব পরিবর্তন'}: {tabSwitchCount}/{MAX_TAB_SWITCHES}
            </span>
          </div>

          {/* Question Text */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              {isEnglish ? currentQuestion.question_text_en : currentQuestion.question_text_bn}
            </h3>

            {/* Question Image (for road signs) */}
            {currentQuestion.image_url && (
              <div className="mb-4 flex justify-center">
                <img 
                  src={currentQuestion.image_url} 
                  alt="Road Sign"
                  className="max-h-40 rounded-lg shadow-md object-contain"
                />
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-2">
            {['A', 'B', 'C', 'D'].map(option => (
              <motion.button
                key={option}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleAnswerSelect(option)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  answers[currentQuestion.id] === option
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                    answers[currentQuestion.id] === option
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {option}
                  </div>
                  <span className="flex-1 text-gray-800 dark:text-gray-200">
                    {isEnglish 
                      ? currentQuestion[`option_${option.toLowerCase()}_en`]
                      : currentQuestion[`option_${option.toLowerCase()}_bn`]}
                  </span>
                  {answers[currentQuestion.id] === option && (
                    <CheckCircle size={24} weight="fill" className="text-primary flex-shrink-0" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={handleNextQuestion}
            disabled={!answers[currentQuestion.id]}
            className="w-full px-6 py-3 bg-gradient-to-r from-primary to-green-600 hover:from-primary-dark hover:to-green-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {currentQuestionIndex < TOTAL_QUESTIONS - 1 ? (
              <>
                {isEnglish ? 'Next Question' : 'পরবর্তী প্রশ্ন'}
                <ArrowRight size={24} weight="bold" />
              </>
            ) : (
              <>
                {isEnglish ? 'Submit Exam' : 'পরীক্ষা জমা দিন'}
                <CheckCircle size={24} weight="fill" />
              </>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );

  const renderProcessing = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="inline-block mb-4"
      >
        <Lightning size={64} className="text-primary" weight="duotone" />
      </motion.div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {isEnglish ? 'Evaluating Your Answers...' : 'আপনার উত্তর মূল্যায়ন করা হচ্ছে...'}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {isEnglish ? 'Please wait while we process your exam' : 'আমরা আপনার পরীক্ষা প্রক্রিয়া করার সময় অপেক্ষা করুন'}
      </p>
    </motion.div>
  );

  const renderSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <Trophy size={96} className="text-yellow-500 mx-auto mb-4" weight="fill" />
      </motion.div>
      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {isEnglish ? 'Congratulations!' : 'অভিনন্দন!'}
      </h3>
      <p className="text-xl text-green-600 dark:text-green-400 font-semibold mb-4">
        {isEnglish ? 'You Passed the Online Exam!' : 'আপনি অনলাইন পরীক্ষায় উত্তীর্ণ হয়েছেন!'}
      </p>
      <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {isEnglish 
            ? 'Your application is moving to the next step. You will receive a notification shortly.'
            : 'আপনার আবেদন পরবর্তী ধাপে যাচ্ছে। শীঘ্রই আপনি একটি বিজ্ঞপ্তি পাবেন।'}
        </p>
        <div className="flex items-center justify-center gap-2 text-primary">
          <Target size={20} weight="fill" />
          <span className="font-semibold">
            {isEnglish ? 'Next Step: Physical Exam' : 'পরবর্তী ধাপ: শারীরিক পরীক্ষা'}
          </span>
        </div>
      </div>
    </motion.div>
  );

  const renderFailed = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <WarningCircle size={96} className="text-red-600 mx-auto mb-4" weight="fill" />
      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {isEnglish ? 'Exam Not Passed' : 'পরীক্ষায় উত্তীর্ণ হননি'}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {isEnglish 
          ? 'Don\'t worry! You can retake the exam after reviewing the material.'
          : 'চিন্তা করবেন না! উপাদান পর্যালোচনা করার পরে আপনি পরীক্ষা আবার দিতে পারেন।'}
      </p>
      <button
        onClick={handleClose}
        className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all"
      >
        {isEnglish ? 'Close' : 'বন্ধ করুন'}
      </button>
    </motion.div>
  );

  const renderContent = () => {
    switch (step) {
      case 'instructions':
        return renderInstructions();
      case 'exam':
        return renderExam();
      case 'processing':
        return renderProcessing();
      case 'success':
        return renderSuccess();
      case 'failed':
        return renderFailed();
      default:
        return null;
    }
  };

  const modalContent = (
    <div ref={examContainerRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[10000]"
            onClick={(e) => {
              if (e.target === e.currentTarget && step !== 'exam') {
                handleClose();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isEnglish ? 'Online Driving Exam' : 'অনলাইন ড্রাইভিং পরীক্ষা'}
                  </h2>
                  {application && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {application.application_number}
                    </p>
                  )}
                </div>
                {step !== 'exam' && (
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X size={24} className="text-gray-600 dark:text-gray-400" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {renderContent()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(modalContent, document.body);
}
