import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';

/**
 * Welcome Tour Component
 * Shows a guided tour for first-time users
 * Usage: <WelcomeTour onComplete={() => console.log('Tour completed')} />
 */

const WelcomeTour = ({ onComplete, onSkip }) => {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Tour steps configuration
  const tourSteps = [
    {
      target: '.dashboard-overview',
      title: {
        en: '👋 Welcome to BRTA 2.0!',
        bn: '👋 BRTA 2.0-তে স্বাগতম!'
      },
      content: {
        en: 'This is your personal dashboard where you can manage all your vehicle and license services in one place.',
        bn: 'এটি আপনার ব্যক্তিগত ড্যাশবোর্ড যেখানে আপনি এক জায়গায় আপনার সমস্ত যানবাহন এবং লাইসেন্স সেবা পরিচালনা করতে পারেন।'
      },
      position: 'center',
      highlight: false
    },
    {
      target: '#license-card',
      title: {
        en: '📋 License Application',
        bn: '📋 লাইসেন্স আবেদন'
      },
      content: {
        en: 'Apply for a new driving license or track your existing applications. The process is simple and guided step-by-step.',
        bn: 'নতুন ড্রাইভিং লাইসেন্সের জন্য আবেদন করুন বা আপনার বিদ্যমান আবেদন ট্র্যাক করুন। প্রক্রিয়াটি সহজ এবং ধাপে ধাপে নির্দেশিত।'
      },
      position: 'bottom',
      highlight: true
    },
    {
      target: '#vehicle-card',
      title: {
        en: '🚗 Vehicle Services',
        bn: '🚗 যানবাহন সেবা'
      },
      content: {
        en: 'Register your vehicle, renew tax tokens, and manage all vehicle-related documents here.',
        bn: 'আপনার যানবাহন নিবন্ধন করুন, ট্যাক্স টোকেন নবায়ন করুন এবং সমস্ত যানবাহন সংক্রান্ত নথি এখানে পরিচালনা করুন।'
      },
      position: 'bottom',
      highlight: true
    },
    {
      target: '.chatbot-button',
      title: {
        en: '🤖 AI Assistant',
        bn: '🤖 AI সহায়ক'
      },
      content: {
        en: 'Need help? Our AI chatbot is available 24/7 to answer your questions in both English and Bangla.',
        bn: 'সাহায্য প্রয়োজন? আমাদের AI চ্যাটবট ইংরেজি এবং বাংলা উভয় ভাষায় আপনার প্রশ্নের উত্তর দিতে ২৪/৭ উপলব্ধ।'
      },
      position: 'top',
      highlight: true
    },
    {
      target: '#bell-icon',
      title: {
        en: '🔔 Notifications',
        bn: '🔔 বিজ্ঞপ্তি'
      },
      content: {
        en: 'Stay updated! All important updates about your applications and payments will appear here.',
        bn: 'আপডেট থাকুন! আপনার আবেদন এবং পেমেন্ট সম্পর্কে সমস্ত গুরুত্বপূর্ণ আপডেট এখানে প্রদর্শিত হবে।'
      },
      position: 'bottom',
      highlight: true
    }
  ];

  useEffect(() => {
    // Check if tour has been completed before showing
    const tourCompleted = localStorage.getItem('brta_tour_completed');
    if (!tourCompleted) {
      // Show tour after a brief delay only if not completed before
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const currentStepData = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('brta_tour_completed', 'true');
      if (onComplete) onComplete();
    }, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('brta_tour_completed', 'true');
      if (onSkip) onSkip();
    }, 300);
  };

  // Get position of target element
  const getTargetPosition = () => {
    if (currentStepData.position === 'center') {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const targetElement = document.querySelector(currentStepData.target);
    if (!targetElement) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let calculatedPosition = {};
    const modalWidth = Math.min(400, window.innerWidth * 0.9);

    switch (currentStepData.position) {
      case 'bottom':
        calculatedPosition = {
          top: rect.bottom + scrollTop + 20,
          left: rect.left + scrollLeft + rect.width / 2,
          transform: 'translateX(-50%)',
          maxWidth: '90vw'
        };
        break;
      case 'top':
        calculatedPosition = {
          top: rect.top + scrollTop - 300, // Fixed offset for modal height
          left: rect.left + scrollLeft + rect.width / 2,
          transform: 'translateX(-50%)',
          maxWidth: '90vw'
        };
        break;
      case 'left':
        calculatedPosition = {
          top: rect.top + scrollTop + rect.height / 2,
          left: rect.left + scrollLeft - modalWidth - 20,
          transform: 'translateY(-50%)',
          maxWidth: '90vw'
        };
        break;
      case 'right':
        calculatedPosition = {
          top: rect.top + scrollTop + rect.height / 2,
          left: rect.right + scrollLeft + 20,
          transform: 'translateY(-50%)',
          maxWidth: '90vw'
        };
        break;
      default:
        calculatedPosition = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    // Ensure the modal stays within viewport bounds - STRICT ENFORCEMENT
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedHeight = 300;
    const padding = 20;
    
    // Force position to be within bounds
    if (typeof calculatedPosition.left === 'number' && typeof calculatedPosition.top === 'number') {
      // Remove transforms for edge cases - use absolute positioning
      if (calculatedPosition.transform && calculatedPosition.transform.includes('translate')) {
        // For centered elements, calculate absolute position
        if (calculatedPosition.transform.includes('translateX(-50%)')) {
          calculatedPosition.left = calculatedPosition.left - modalWidth / 2;
          calculatedPosition.transform = calculatedPosition.transform.replace('translateX(-50%)', '');
        } else if (calculatedPosition.transform.includes('translate(-50%')) {
          calculatedPosition.left = calculatedPosition.left - modalWidth / 2;
          calculatedPosition.transform = calculatedPosition.transform.replace(/translate\(-50%[^)]*\)/, '');
        }
      }
      
      // Ensure left edge is within viewport
      if (calculatedPosition.left < padding) {
        calculatedPosition.left = padding;
      }
      
      // Ensure right edge is within viewport
      if (calculatedPosition.left + modalWidth > viewportWidth - padding) {
        calculatedPosition.left = viewportWidth - modalWidth - padding;
      }
      
      // Ensure top edge is within viewport
      if (calculatedPosition.top < scrollTop + padding) {
        calculatedPosition.top = scrollTop + padding;
      }
      
      // Ensure bottom edge is within viewport
      if (calculatedPosition.top + estimatedHeight > scrollTop + viewportHeight - padding) {
        calculatedPosition.top = scrollTop + viewportHeight - estimatedHeight - padding;
      }
    }

    return calculatedPosition;
  };

  // Highlight target element and recalculate position
  const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  useEffect(() => {
    if (!currentStepData.highlight || currentStepData.position === 'center') {
      setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const targetElement = document.querySelector(currentStepData.target);
    if (targetElement) {
      // DON'T scroll - it causes layout shifts
      // Just highlight and position the modal
      targetElement.classList.add('tour-highlight');
      
      // Calculate position immediately without waiting
      setTimeout(() => {
        setPosition(getTargetPosition());
      }, 50); // Minimal delay just for DOM to update
      
      return () => targetElement.classList.remove('tour-highlight');
    } else {
      // If element not found, center the modal
      setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
    }
  }, [currentStep]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={handleSkip}
          />

          {/* Tour Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              transform: position.transform,
              zIndex: 9999,
              maxWidth: '90vw' // Force within viewport
            }}
            className="w-[90vw] sm:w-[400px] max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                    {currentStepData.title[language]}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Step {currentStep + 1} of {tourSteps.length}
                  </p>
                </div>
                <button
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors -mt-1"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Content */}
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                {currentStepData.content[language]}
              </p>

              {/* Progress Dots */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-6 bg-primary'
                        : index < currentStep
                        ? 'w-1.5 bg-green-500'
                        : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleSkip}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                >
                  {language === 'en' ? 'Skip' : 'এড়িয়ে যান'}
                </button>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrevious}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft size={16} />
                      <span className="hidden sm:inline">{language === 'en' ? 'Back' : 'পিছনে'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1 font-medium"
                  >
                    {isLastStep ? (
                      <>
                        <CheckCircle size={16} weight="bold" />
                        {language === 'en' ? 'Got it!' : 'বুঝেছি!'}
                      </>
                    ) : (
                      <>
                        {language === 'en' ? 'Next' : 'পরবর্তী'}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WelcomeTour;
