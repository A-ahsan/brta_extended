import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, CheckCircle, WarningCircle, CircleNotch, ArrowLeft, ArrowRight, Eye } from 'phosphor-react';
import * as faceapi from 'face-api.js';
import '@tensorflow/tfjs';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export default function FaceVerificationModal({ open, onClose, application }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const previousEARRef = useRef(0.3);
  const blinkStateRef = useRef('open');

  const [step, setStep] = useState('camera'); // camera, instructions, verification, processing, success, failed
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [error, setError] = useState(null);

  // Instructions sequence
  const instructions = [
    {
      id: 'center',
      en: 'Look straight at the camera',
      bn: 'ক্যামেরার দিকে সোজা তাকান',
      icon: Camera,
      duration: 3000,
      check: (landmarks) => {
        // Check if face is centered (nose between eyes)
        const nose = landmarks.getNose();
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
        const noseTipX = nose[3].x;
        const diff = Math.abs(noseTipX - eyeCenterX);
        console.log('Center check - diff:', diff);
        return diff < 50; // More lenient - roughly centered
      }
    },
    {
      id: 'right',
      en: 'Turn your head to the RIGHT',
      bn: 'আপনার মাথা ডানে ঘুরান',
      icon: ArrowRight,
      duration: 2000,
      check: (landmarks) => {
        // User turns right = nose moves left in mirrored view
        const nose = landmarks.getNose();
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const noseTipX = nose[3].x;
        const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
        const diff = eyeCenterX - noseTipX;
        console.log('Right turn check - nose moved left by:', diff.toFixed(1));
        return diff > 25; // Nose significantly left of center
      }
    },
    {
      id: 'left',
      en: 'Turn your head to the LEFT',
      bn: 'আপনার মাথা বামে ঘুরান',
      icon: ArrowLeft,
      duration: 2000,
      check: (landmarks) => {
        // User turns left = nose moves right in mirrored view
        const nose = landmarks.getNose();
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const noseTipX = nose[3].x;
        const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
        const diff = noseTipX - eyeCenterX;
        console.log('Left turn check - nose moved right by:', diff.toFixed(1));
        return diff > 25; // Nose significantly right of center
      }
    },
    {
      id: 'blink1',
      en: 'Blink your eyes (1/2)',
      bn: 'চোখ পিটপিট করুন (১/২)',
      icon: Eye,
      duration: 1500,
      check: (landmarks) => {
        // Detect blink by relative EAR drop
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;
        const prevEAR = previousEARRef.current;
        const currentState = blinkStateRef.current;
        
        // Calculate drop percentage from baseline
        const dropPercent = ((prevEAR - avgEAR) / prevEAR) * 100;
        
        console.log('Blink1 EAR:', avgEAR.toFixed(3), 'Prev:', prevEAR.toFixed(3), 'Drop%:', dropPercent.toFixed(1), 'State:', currentState);
        
        // Detect significant drop (10% or more)
        if (currentState === 'open' && dropPercent > 10) {
          blinkStateRef.current = 'closed';
          console.log('Eyes closing - drop detected!');
        }
        // Eyes opening again (EAR rising by at least 5%)
        else if (currentState === 'closed') {
          const risePercent = ((avgEAR - prevEAR) / prevEAR) * 100;
          if (risePercent > 5) {
            blinkStateRef.current = 'open';
            previousEARRef.current = avgEAR;
            console.log('BLINK DETECTED!');
            return true;
          }
        }
        
        previousEARRef.current = avgEAR;
        return false;
      }
    },
    {
      id: 'blink2',
      en: 'Blink your eyes again (2/2)',
      bn: 'আবার চোখ পিটপিট করুন (২/২)',
      icon: Eye,
      duration: 1500,
      check: (landmarks) => {
        // Detect blink by relative EAR drop
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;
        const prevEAR = previousEARRef.current;
        const currentState = blinkStateRef.current;
        
        // Calculate drop percentage
        const dropPercent = ((prevEAR - avgEAR) / prevEAR) * 100;
        
        console.log('Blink2 EAR:', avgEAR.toFixed(3), 'Prev:', prevEAR.toFixed(3), 'Drop%:', dropPercent.toFixed(1), 'State:', currentState);
        
        // Detect significant drop (10% or more)
        if (currentState === 'open' && dropPercent > 10) {
          blinkStateRef.current = 'closed';
          console.log('Eyes closing - drop detected!');
        }
        // Eyes opening again (EAR rising by at least 5%)
        else if (currentState === 'closed') {
          const risePercent = ((avgEAR - prevEAR) / prevEAR) * 100;
          if (risePercent > 5) {
            blinkStateRef.current = 'open';
            previousEARRef.current = avgEAR;
            console.log('BLINK DETECTED!');
            return true;
          }
        }
        
        previousEARRef.current = avgEAR;
        return false;
      }
    }
  ];

  // Calculate Eye Aspect Ratio for blink detection
  const calculateEAR = (eye) => {
    const verticalDist1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
    const verticalDist2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
    const horizontalDist = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
    return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
  };

  // Load models and start camera when modal opens
  useEffect(() => {
    if (open && !modelsLoaded) {
      loadModelsAndStartCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const loadModelsAndStartCamera = async () => {
    try {
      console.log('Loading models...');
      const MODEL_URL = '/models';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      console.log('Models loaded');
      setModelsLoaded(true);
      
      // Wait for video element to render
      setTimeout(() => {
        startCamera();
      }, 500);
      
    } catch (error) {
      console.error('Model loading error:', error);
      setError(isEnglish ? 'Failed to load face detection models' : 'ফেস ডিটেকশন মডেল লোড করতে ব্যর্থ');
      setStep('failed');
    }
  };

  // Start camera
  const startCamera = async () => {
    if (streamRef.current) {
      console.log('Camera already running');
      return;
    }
    
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia not supported');
      setError(isEnglish 
        ? 'Camera not supported. Please use HTTPS or a modern browser.' 
        : 'ক্যামেরা সমর্থিত নয়। দয়া করে HTTPS বা আধুনিক ব্রাউজার ব্যবহার করুন।');
      setStep('failed');
      return;
    }
    
    try {
      console.log('Requesting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false
      });

      console.log('Got stream:', stream.getVideoTracks()[0].label);
      streamRef.current = stream;

      if (videoRef.current) {
        console.log('Assigning stream to video');
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Metadata loaded, video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          videoRef.current.play()
            .then(() => {
              console.log('Video is playing!');
              setCameraReady(true);
              
              // Draw initial face guide oval
              if (canvasRef.current && videoRef.current) {
                const canvas = canvasRef.current;
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                
                const ctx = canvas.getContext('2d');
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radiusX = 110;
                const radiusY = 150;
                
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 4;
                ctx.setLineDash([12, 6]);
                ctx.stroke();
                ctx.restore();
              }
              
              setStep('instructions');
              startVerificationProcess();
            })
            .catch(err => {
              console.error('Play failed:', err);
              setError(isEnglish ? 'Cannot play video' : 'ভিডিও চালাতে পারছে না');
              setStep('failed');
            });
        };
      } else {
        console.error('videoRef.current is null!');
        setError(isEnglish ? 'Video element missing' : 'ভিডিও এলিমেন্ট নেই');
        setStep('failed');
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError(isEnglish ? `Camera error: ${error.message}` : 'ক্যামেরা ত্রুটি');
      setStep('failed');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Verification process
  const startVerificationProcess = async () => {
    let instructionIndex = 0;
    const frames = [];

    const processInstruction = async () => {
      if (instructionIndex >= instructions.length) {
        // All instructions completed
        setCapturedFrames(frames);
        setStep('processing');
        await performFaceMatching(frames);
        return;
      }

      const instruction = instructions[instructionIndex];
      setCurrentInstruction(instructionIndex);

      // Wait for gesture detection
      const startTime = Date.now();
      let gestureDetected = false;
      
      const detectionInterval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused) {
          clearInterval(detectionInterval);
          return;
        }

        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          // Draw landmarks on canvas
          drawLandmarks(detections);

          // Check if gesture is performed
          if (!gestureDetected && instruction.check(detections.landmarks)) {
            gestureDetected = true;
            console.log(`Gesture detected for ${instruction.id}`);
            
            // Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);
            
            frames.push({
              instruction: instruction.id,
              image: canvas.toDataURL('image/jpeg', 0.95),
              descriptor: detections.descriptor,
              timestamp: Date.now()
            });

            clearInterval(detectionInterval);
            
            // Reset blink state for next instruction
            blinkStateRef.current = 'open';
            
            // Move to next instruction after brief pause
            setTimeout(() => {
              instructionIndex++;
              processInstruction();
            }, 500);
          }
        }
      }, 200); // Check every 200ms
    };

    processInstruction();
  };

  const drawLandmarks = (detections) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const displaySize = { width: canvas.width, height: canvas.height };
    faceapi.matchDimensions(canvas, displaySize);

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw face guide oval FIRST (before landmarks)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radiusX = 110;
    const radiusY = 150;
    
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    ctx.stroke();
    ctx.restore();

  };

  // Perform face matching with NID image
  const performFaceMatching = async (frames) => {
    try {
      setProcessing(true);

      console.log('=== Starting Face Matching ===');
      console.log('Application:', application);
      console.log('NID Face URL:', application?.nid_face_extracted_url);
      
      if (!application || !application.nid_face_extracted_url) {
        throw new Error('NID face image URL is missing');
      }

      console.log('Loading NID image from:', application.nid_face_extracted_url);
      
      // Load NID face image with CORS handling
      const loadImageWithCORS = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = (err) => reject(new Error('Failed to load NID image'));
          img.src = url;
        });
      };
      
      const nidImage = await loadImageWithCORS(application.nid_face_extracted_url);
      console.log('NID image loaded, size:', nidImage.width, 'x', nidImage.height);
      console.log('Detecting face in NID image...');
      
      // Use Tiny detector with VERY lenient settings for small NID images
      let nidDetection = await faceapi
        .detectSingleFace(nidImage, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,  // Lower input size for small images
          scoreThreshold: 0.1  // Very low threshold
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      // If still fails, try without size restriction
      if (!nidDetection) {
        console.log('First attempt failed, trying with minimal threshold...');
        nidDetection = await faceapi
          .detectSingleFace(nidImage, new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,  // Smallest size
            scoreThreshold: 0.05  // Extremely low threshold
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (!nidDetection) {
        console.error('Failed to detect face in NID image');
        throw new Error('Could not detect face in NID image. Please ensure the NID image contains a clear, frontal face photo.');
      }

      console.log('Face detected in NID image successfully');
      console.log('NID face descriptor length:', nidDetection.descriptor.length);

      // Compare with captured frames
      console.log('Comparing with', frames.length, 'captured frames...');
      const distances = frames.map((frame, idx) => {
        const dist = faceapi.euclideanDistance(nidDetection.descriptor, frame.descriptor);
        console.log(`Frame ${idx + 1} (${frame.instruction}): distance = ${dist.toFixed(4)}`);
        return dist;
      });

      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      const similarityScore = Math.max(0, (1 - avgDistance) * 100);

      console.log('Average distance:', avgDistance.toFixed(4));
      console.log('Similarity score:', similarityScore.toFixed(2) + '%');
      
      setMatchScore(similarityScore);

      // Threshold: 50%
      if (similarityScore >= 50) {
        console.log('Match successful! Updating application...');
        await updateApplicationStatus(frames[0].image, similarityScore);
      } else {
        console.log('Match failed - score too low');
        setStep('failed');
        setError(isEnglish 
          ? `Face verification failed. Match score: ${similarityScore.toFixed(1)}%. Required: 50%. Please try again with better lighting and face the camera directly.`
          : `ফেস যাচাইকরণ ব্যর্থ। মিল স্কোর: ${similarityScore.toFixed(1)}%। প্রয়োজন: 50%। ভাল আলোয় এবং সরাসরি ক্যামেরার দিকে তাকিয়ে আবার চেষ্টা করুন।`
        );
      }
    } catch (error) {
      console.error('Face matching error:', error);
      setError(isEnglish 
        ? `Face verification error: ${error.message}` 
        : `ফেস যাচাইকরণ ত্রুটি: ${error.message}`
      );
      setStep('failed');
    } finally {
      setProcessing(false);
    }
  };

  const updateApplicationStatus = async (liveImage, score) => {
    try {
      // Update application (no image storage needed)
      const { error: updateError } = await supabase
        .from('license_applications')
        .update({
          face_verification: 1,
          face_verified_at: new Date().toISOString(),
          status: 'face_verified'
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Create notifications
      await supabase.rpc('create_dual_notification', {
        p_user_id: user.id,
        p_title_en: 'Face Verification Successful',
        p_title_bn: 'ফেস যাচাইকরণ সফল',
        p_message_en: `Your face verification for application ${application.application_number} is complete. Next step: Online Exam.`,
        p_message_bn: `আপনার আবেদন ${application.application_number} এর ফেস যাচাইকরণ সম্পন্ন। পরবর্তী ধাপ: অনলাইন পরীক্ষা।`,
        p_type: 'verification',
        p_application_id: application.id,
        p_admin_title_en: 'Face Verified',
        p_admin_title_bn: 'ফেস যাচাই সম্পন্ন',
        p_admin_message_en: `${application.license_type}-${application.license_category}: ${application.full_name_en} (${application.application_number})`,
        p_admin_message_bn: `${application.license_type}-${application.license_category}: ${application.full_name_bn} (${application.application_number})`
      });

      setStep('success');
      
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Update error:', error);
      setError(isEnglish ? 'Failed to update application status' : 'আবেদনের স্ট্যাটাস আপডেট করতে ব্যর্থ');
      setStep('failed');
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const renderContent = () => {
    switch (step) {
      case 'camera':
        return (
          <div className="space-y-6">
            <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ width: '100%', height: '480px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  backgroundColor: '#000',
                  transform: 'scaleX(-1)',
                  position: 'relative',
                  zIndex: 1
                }}
              />
              <canvas
                ref={canvasRef}
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <CircleNotch size={48} className="animate-spin mx-auto mb-3" />
                  <p className="text-lg font-semibold">
                    {isEnglish ? 'Initializing camera...' : 'ক্যামেরা চালু হচ্ছে...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'instructions':
      case 'verification':
        const currentInst = instructions[currentInstruction];
        const Icon = currentInst?.icon || Camera;
        
        return (
          <div className="space-y-6">
            <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ width: '100%', height: '480px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  backgroundColor: '#000',
                  transform: 'scaleX(-1)'
                }}
              />
              <canvas
                ref={canvasRef}
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  transform: 'scaleX(-1)'
                }}
              />
              
              {/* Instruction Overlay */}
              {currentInst && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex items-center gap-4 text-white">
                    <Icon size={48} weight="duotone" />
                    <div className="flex-1">
                      <div className="text-sm opacity-75">
                        {isEnglish ? 'Step' : 'ধাপ'} {currentInstruction + 1}/{instructions.length}
                      </div>
                      <div className="text-xl font-bold">
                        {isEnglish ? currentInst.en : currentInst.bn}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${((currentInstruction + 1) / instructions.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-12">
            <CircleNotch size={64} className="animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isEnglish ? 'Processing...' : 'প্রক্রিয়া করা হচ্ছে...'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {isEnglish ? 'Comparing your face with NID image...' : 'আপনার মুখ এনআইডি ছবির সাথে মিলানো হচ্ছে...'}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-12">
            <CheckCircle size={64} className="text-green-600 mx-auto mb-4" weight="fill" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isEnglish ? 'Verification Successful' : 'যাচাইকরণ সফল'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEnglish ? 'Your application is moving to the next step...' : 'আপনার আবেদন পরবর্তী ধাপে যাচ্ছে...'}
            </p>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center py-12">
            <WarningCircle size={64} className="text-red-600 mx-auto mb-4" weight="fill" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isEnglish ? 'Verification Failed' : 'যাচাইকরণ ব্যর্থ'}
            </h3>
            <p className="text-red-600 dark:text-red-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setCurrentInstruction(0);
                setCapturedFrames([]);
                setStep('camera');
              }}
              className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all"
            >
              {isEnglish ? 'Try Again' : 'আবার চেষ্টা করুন'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && step !== 'instructions' && step !== 'verification') {
            handleClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center z-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEnglish ? 'Face Verification' : 'ফেস যাচাইকরণ'}
            </h2>
            {step !== 'instructions' && step !== 'verification' && step !== 'loading' && (
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {renderContent()}
          </div>

          {/* Always render video elements (hidden when not in use) */}
          {step === 'loading' && (
            <div className="hidden">
              <video ref={videoRef} autoPlay playsInline muted />
              <canvas ref={canvasRef} />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
