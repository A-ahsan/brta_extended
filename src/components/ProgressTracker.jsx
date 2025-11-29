import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, IdentificationCard, User, FileText, FirstAid, CreditCard, ShieldCheck, IdentificationBadge } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import FaceVerificationModal from './FaceVerificationModal';
import OnlineExamModal from './OnlineExamModal';
import PhysicalExamBooking from './PhysicalExamBooking';

const steps = [
  { 
    key: 'nid_verified', 
    icon: IdentificationCard,
    en: 'NID Verified', 
    bn: 'এনআইডি যাচাইকৃত',
    flag: 'nid_verified'
  },
  { 
    key: 'face_verification', 
    icon: User,
    en: 'Face Verification', 
    bn: 'মুখ যাচাইকরণ',
    flag: 'face_verification'
  },
  { 
    key: 'online_exam', 
    icon: FileText,
    en: 'Online Exam', 
    bn: 'অনলাইন পরীক্ষা',
    flag: 'online_exam'
  },
  { 
    key: 'physical_exam', 
    icon: FirstAid,
    en: 'Physical Exam', 
    bn: 'শারীরিক পরীক্ষা',
    flag: 'physical_exam'
  },
  { 
    key: 'payment', 
    icon: CreditCard,
    en: 'Payment', 
    bn: 'পেমেন্ট',
    flag: 'payment'
  },
  { 
    key: 'generate_license', 
    icon: IdentificationBadge,
    en: 'Generate License', 
    bn: 'লাইসেন্স তৈরি করুন',
    flag: 'license_generated'
  },
];

export default function ProgressTracker({ application }) {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const { user } = useAuth();
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showPhysicalExamModal, setShowPhysicalExamModal] = useState(false);
  const [initiating, setInitiating] = useState(false);
  // License fee (should match UserPayments)
  const LICENSE_FEE = 2230;

  // Payment handler (copied/adapted from UserPayments)
  async function handlePay() {
    setInitiating(true);
    const tran_id = `DL${Date.now()}${Math.floor(Math.random()*1000)}`;
    try {
      // Insert payment record as initiated
      await supabase.from('payments').insert({
        user_id: user.id,
        application_id: application.id,
        amount: LICENSE_FEE,
        currency: 'BDT',
        tran_id,
        status: 'initiated',
      });
      // Call backend to get payment URL
      const res = await fetch('http://localhost:5000/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: LICENSE_FEE,
          customerName: user.user_metadata?.full_name || user.email,
          customerEmail: user.email,
          tran_id,
          application_id: application.id,
          user_id: user.id,
        }),
      });
      const data = await res.json();
      setInitiating(false);
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(isEnglish ? 'Failed to initiate payment' : 'পেমেন্ট শুরু করতে ব্যর্থ');
      }
    } catch (err) {
      setInitiating(false);
      toast.error(isEnglish ? 'Failed to initiate payment' : 'পেমেন্ট শুরু করতে ব্যর্থ');
    }
  }

  // Check step status based on flags (0 or 1)
  const getStepStatus = (step) => {
    // NID is always verified when application exists
    if (step.key === 'nid_verified') return 'completed';
    
    // Generate License step (becomes available after payment)
    if (step.key === 'generate_license') {
      return application.license_generated === 1 ? 'completed' : 'pending';
    }

    const flagValue = application[step.flag];
    
    // If flag is 1, it's completed
    if (flagValue === 1) return 'completed';
    
    // If flag is 0 and this is the current pending step, show pending
    // Otherwise show as not started
    return 'pending';
  };

  const getStepIcon = (step, status) => {
    const IconComponent = step.icon;
    
    if (status === 'completed') {
      return <CheckCircle size={40} weight="fill" className="text-green-500" />;
    } else if (status === 'failed') {
      return <XCircle size={40} weight="fill" className="text-red-500" />;
    } else if (status === 'pending') {
      // Check if this is the current active step
      const isActive = application[step.flag] === 0 && (
        (step.key === 'face_verification' && application.nid_verified_at) ||
        (step.key === 'online_exam' && application.face_verification === 1) ||
        (step.key === 'physical_exam' && application.online_exam === 1) ||
        (step.key === 'payment' && application.physical_exam === 1) ||
        (step.key === 'generate_license' && application.payment === 1 && application.license_generated !== 1)
      );
      
      if (isActive) {
        return <Clock size={40} weight="fill" className="text-primary animate-pulse" />;
      }
      return <IconComponent size={40} className="text-gray-300 dark:text-gray-600" />;
    }
  };

  const getStepColor = (status, isActive) => {
    if (status === 'completed') {
      return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    } else if (status === 'failed') {
      return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    } else if (isActive) {
      return 'border-primary bg-primary/10 dark:bg-primary/20 ring-2 ring-primary/50';
    } else {
      return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800';
    }
  };

  // Calculate overall progress
  const completedSteps = steps.filter(step => getStepStatus(step) === 'completed').length;
  const progressPercentage = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEnglish ? 'Application Progress' : 'আবেদনের অগ্রগতি'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isEnglish ? 'Application Number: ' : 'আবেদন নম্বর: '}
            <span className="font-semibold text-primary">{application.application_number}</span>
          </p>
        </div>
        
        {application.approved_at && (
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isEnglish ? 'Approved on' : 'অনুমোদিত'}
            </p>
            <p className="font-semibold text-green-600">
              {new Date(application.approved_at).toLocaleDateString(isEnglish ? 'en-US' : 'bn-BD')}
            </p>
          </div>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {isEnglish ? 'Overall Progress' : 'সামগ্রিক অগ্রগতি'}
          </span>
          <span className="text-sm font-bold text-primary">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-green-600 rounded-full"
          />
        </div>
      </div>

      {/* Progress Steps Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const isActive = status === 'pending' && (
            (step.key === 'face_verification' && application.nid_verified_at && application.face_verification === 0) ||
            (step.key === 'online_exam' && application.face_verification === 1 && application.online_exam === 0) ||
            (step.key === 'physical_exam' && application.online_exam === 1 && application.physical_exam === 0) ||
            (step.key === 'payment' && application.physical_exam === 1 && application.payment === 0) ||
            (step.key === 'generate_license' && application.payment === 1 && application.license_generated !== 1)
          );

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              {/* Icon */}
              <div className="mb-3">
                {getStepIcon(step, status)}
              </div>

              {/* Step Card */}
              <div className={`w-full text-center p-4 rounded-lg border-2 transition-all ${getStepColor(status, isActive)}`}>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  {isEnglish ? step.en : step.bn}
                </p>
                
                {/* Status Text */}
                <p className={`text-xs font-semibold mt-2 ${
                  status === 'completed' ? 'text-green-600 dark:text-green-400' : 
                  status === 'failed' ? 'text-red-600 dark:text-red-400' : 
                  isActive ? 'text-primary dark:text-green-400' : 
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {status === 'completed' ? (isEnglish ? '✓ Completed' : '✓ সম্পন্ন') : 
                   status === 'failed' ? (isEnglish ? '✗ Failed' : '✗ ব্যর্থ') :
                   isActive ? (isEnglish ? '⏳ Pending' : '⏳ অপেক্ষমাণ') :
                   (isEnglish ? 'Waiting' : 'অপেক্ষায়')}
                </p>

                {/* Action button for face verification */}
                {step.key === 'face_verification' && isActive && (
                  <button 
                    onClick={() => setShowFaceModal(true)}
                    className="mt-3 text-xs px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md font-semibold transition-colors"
                  >
                    {isEnglish ? 'Verify Face' : 'মুখ যাচাই করুন'}
                  </button>
                )}

                {/* Action button for online exam */}
                {step.key === 'online_exam' && isActive && (
                  <button 
                    onClick={() => setShowExamModal(true)}
                    className="mt-3 text-xs px-4 py-2 bg-gradient-to-r from-primary to-green-600 hover:from-primary-dark hover:to-green-700 text-white rounded-md font-semibold transition-all shadow-md"
                  >
                    {isEnglish ? 'Take Exam' : 'পরীক্ষা দিন'}
                  </button>
                )}

                {/* Action button for physical exam */}
                {step.key === 'physical_exam' && isActive && (
                  <button 
                    onClick={() => setShowPhysicalExamModal(true)}
                    className="mt-3 text-xs px-4 py-2 bg-gradient-to-r from-primary to-green-600 hover:from-primary-dark hover:to-green-700 text-white rounded-md font-semibold transition-all shadow-md"
                  >
                    {isEnglish ? 'Schedule Exam' : 'পরীক্ষা নির্ধারণ'}
                  </button>
                )}

                {/* Action button for payment */}
                {step.key === 'payment' && isActive && (
                  <button
                    onClick={handlePay}
                    disabled={initiating}
                    className="mt-3 text-xs px-4 py-2 bg-gradient-to-r from-primary to-green-600 hover:from-primary-dark hover:to-green-700 text-white rounded-md font-semibold transition-all shadow-md disabled:opacity-60"
                  >
                    {initiating
                      ? (isEnglish ? 'Processing...' : 'প্রসেস হচ্ছে...')
                      : (isEnglish ? 'Pay Now' : 'এখনই পরিশোধ করুন')}
                  </button>
                )}

                {/* Action button for generate license */}
                {step.key === 'generate_license' && isActive && (
                  <button
                    onClick={() => window.location.href = '/license'}
                    className="mt-3 text-xs px-4 py-2 bg-gradient-to-r from-primary to-green-600 hover:from-primary-dark hover:to-green-700 text-white rounded-md font-semibold transition-all shadow-md"
                  >
                    {isEnglish ? 'Generate License' : 'লাইসেন্স তৈরি করুন'}
                  </button>
                )}

                {/* Re-verify/Re-take button for failed steps */}
                {status === 'failed' && step.key !== 'generate_license' && (
                  <button className="mt-3 text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md font-semibold transition-colors">
                    {isEnglish ? 'Re-verify' : 'পুনরায় যাচাই'}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status Message */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-primary/30 dark:border-primary/50 rounded-lg p-4 mt-8">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {application.license_generated === 1 ? (
            <>
              {isEnglish 
                ? '🎉 Congratulations! Your license has been generated successfully. You can download it now.'
                : '🎉 অভিনন্দন! আপনার লাইসেন্স সফলভাবে তৈরি করা হয়েছে। আপনি এখন এটি ডাউনলোড করতে পারেন।'
              }
            </>
          ) : application.payment === 1 ? (
            <>
              {isEnglish 
                ? '✅ Payment completed! Please generate your license card.'
                : '✅ পেমেন্ট সম্পন্ন হয়েছে! অনুগ্রহ করে আপনার লাইসেন্স কার্ড তৈরি করুন।'
              }
            </>
          ) : (
            <>
              {isEnglish 
                ? `Please complete the pending steps to proceed with your application.`
                : `আপনার আবেদন এগিয়ে নিতে অপেক্ষমাণ ধাপগুলি সম্পন্ন করুন।`
              }
            </>
          )}
        </p>
      </div>

      {/* Face Verification Modal */}
      <FaceVerificationModal 
        open={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        application={application}
      />

      {/* Online Exam Modal */}
      <OnlineExamModal 
        open={showExamModal}
        onClose={() => setShowExamModal(false)}
        application={application}
      />

      {/* Physical Exam Booking Modal */}
      <PhysicalExamBooking 
        isOpen={showPhysicalExamModal}
        onClose={() => setShowPhysicalExamModal(false)}
        applicationId={application.id}
        currentBooking={application.physical_exam_booking || null}
      />
    </div>
  );
}
