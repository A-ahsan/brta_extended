import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  IdentificationCard, 
  Car, 
  CreditCard, 
  CalendarCheck, 
  User, 
  Gear, 
  SignOut, 
  List, 
  Bell,
  Eye,
  DownloadSimple,
  ArrowsClockwise,
  Phone,
  MapPin,
  X,
  CheckCircle,
  Calculator,
  BookOpen,
  Sparkle,
  Warning,
  ArrowsDownUp,
  Megaphone
} from 'phosphor-react';
import { useLanguage, useDownload } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import PasswordStrengthMeter, { validatePassword } from '../components/PasswordStrengthMeter';
import NewApplicationModal from '../components/NewApplicationModalEnhanced';
import ThemeLanguageToggler from '../components/ThemeLanguageToggler';
import EmbeddedCalculator from '../components/EmbeddedCalculator';
import QuestionBank from './QuestionBank';
import UserPayments from './UserPayments.jsx';
import ProgressTracker from '../components/ProgressTracker';
import LicenseCard from '../components/LicenseCard';
import RenewalPaymentModal from '../components/RenewalPaymentModal';
import LicenseCompletionCelebration from '../components/LicenseCompletionCelebration';
import VehicleRegistrationModal from '../components/VehicleRegistrationModal';
import VehicleRegistrationCard from '../components/VehicleRegistrationCard';
import TaxTokenRenewalModal from '../components/TaxTokenRenewalModal';
import UserViolations from './UserViolations';
import RoutePermitsInDashboard from '../components/RoutePermitsInDashboard';
import OwnershipTransferModal from '../components/OwnershipTransferModal';
import UserOwnershipTransfers from '../components/UserOwnershipTransfers';
import ChatbotWidget from '../components/ChatbotWidget';
import WelcomeTour from '../components/WelcomeTour';
import { CardSkeleton, LicenseCardSkeleton, ProgressTrackerSkeleton, VehicleCardSkeleton } from '../components/SkeletonLoader';
import MyReportsContent from '../components/MyReportsContent';
import { initializeNotificationSound, playNotificationSound } from '../utils/notificationSound';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { signOut, updatePassword, updateEmail, updatePhone, user, profile } = useAuth();
  const { isDownloading, startDownload, endDownload } = useDownload();
  const t = translations[language] || translations.en;
  
  const [activeTab, setActiveTab] = useState('license');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flippedLicense, setFlippedLicense] = useState(false);
  const [flippedVehicles, setFlippedVehicles] = useState({});
  const [showTaxToken, setShowTaxToken] = useState(null);
  
  // Settings modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [newPhone, setNewPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Renewal state
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalLicense, setRenewalLicense] = useState(null);
  
  // Tax Token Renewal state
  const [showTaxTokenRenewalModal, setShowTaxTokenRenewalModal] = useState(false);
  const [renewalVehicle, setRenewalVehicle] = useState(null);
  
  // Vehicle Registration state
  const [showVehicleRegistrationModal, setShowVehicleRegistrationModal] = useState(false);
  const [registeredVehicles, setRegisteredVehicles] = useState([]);
  const [loadingRegisteredVehicles, setLoadingRegisteredVehicles] = useState(true);
  const [taxTokenData, setTaxTokenData] = useState(null);
  
  // Ownership Transfer state
  const [showOwnershipTransferModal, setShowOwnershipTransferModal] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [licenseApplications, setLicenseApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [licenses, setLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [generatingLicense, setGeneratingLicense] = useState(false);

  // Welcome tour state
  const [showTour, setShowTour] = useState(false);

  // Check if user should see welcome tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('brta_tour_completed');
    if (!hasSeenTour && user) {
      // Show tour after a brief delay
      setTimeout(() => setShowTour(true), 1500);
    }
    
    // Initialize notification sounds on first interaction
    const initSounds = () => {
      initializeNotificationSound();
      document.removeEventListener('click', initSounds);
    };
    document.addEventListener('click', initSounds);
    
    return () => document.removeEventListener('click', initSounds);
  }, [user]);

  // Fetch real license applications
  useEffect(() => {
    if (user) {
      fetchLicenseApplications();
      fetchNotifications();
      fetchLicenses();
      fetchRegisteredVehicles();
      
      // Subscribe to realtime notifications
      const notificationSubscription = supabase
        .channel('user-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Notification change:', payload);
            // Refetch notifications on any change
            fetchNotifications();
            
            // Play notification sound for new notifications
            if (payload.eventType === 'INSERT') {
              playNotificationSound('default');
              
              // Show toast based on notification type
              const notification = payload.new;
              if (notification.type === 'application_approved') {
                toast.success(notification.message_en, { duration: 5000 });
              } else if (notification.type === 'payment_success') {
                toast.success(notification.message_en, { duration: 4000 });
              }
            }
          }
        )
        .subscribe();

      // Subscribe to realtime license application updates
      const applicationSubscription = supabase
        .channel('user-license-applications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'license_applications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('License Application change:', payload);
            // Refetch applications on any change
            fetchLicenseApplications();
          }
        )
        .subscribe();

      // Subscribe to realtime license updates
      const licenseSubscription = supabase
        .channel('user-licenses')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'licenses',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('License change:', payload);
            // Refetch licenses on any change
            fetchLicenses();
          }
        )
        .subscribe();

      // Subscribe to physical exam booking changes (for exam scheduling updates)
      const examBookingSubscription = supabase
        .channel('user-exam-bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'physical_exam_bookings'
          },
          (payload) => {
            console.log('Physical Exam Booking change:', payload);
            // Refetch applications to get updated booking info
            fetchLicenseApplications();
          }
        )
        .subscribe();

      // Subscribe to realtime vehicle registration updates
      const vehicleSubscription = supabase
        .channel('user-vehicles')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'registered_vehicles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Vehicle change:', payload);
            fetchRegisteredVehicles();
          }
        )
        .subscribe();

      // Subscribe to realtime violation updates
      const violationSubscription = supabase
        .channel('user-violations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'traffic_violations',
            filter: `violator_user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Violation change:', payload);
            // Component will handle its own refetch
          }
        )
        .subscribe();

      // Subscribe to realtime payment updates
      const paymentSubscription = supabase
        .channel('user-payments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Payment change:', payload);
            // Component will handle its own refetch
          }
        )
        .subscribe();

      // Subscribe to realtime route permit updates
      const routePermitSubscription = supabase
        .channel('user-route-permits')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'route_permits',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Route Permit change:', payload);
            // Component will handle its own refetch
          }
        )
        .subscribe();

      // Subscribe to ownership transfer completions (affects both old and new owners)
      const ownershipTransferSubscription = supabase
        .channel('ownership-transfer-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ownership_transfer_applications'
          },
          (payload) => {
            console.log('Ownership transfer update:', payload);
            // Check if this transfer involves current user (as old or new owner)
            if (payload.new.status === 'completed' && 
                (payload.new.current_owner_id === user.id || payload.new.new_owner_id === user.id)) {
              // Refresh vehicles list for both old and new owner
              fetchRegisteredVehicles();
            }
          }
        )
        .subscribe();

      return () => {
        notificationSubscription.unsubscribe();
        applicationSubscription.unsubscribe();
        examBookingSubscription.unsubscribe();
        vehicleSubscription.unsubscribe();
        violationSubscription.unsubscribe();
        paymentSubscription.unsubscribe();
        routePermitSubscription.unsubscribe();
        ownershipTransferSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchLicenseApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('license_applications')
        .select(`
          *,
          physical_exam_booking:physical_exam_bookings!physical_exam_bookings_application_id_fkey(
            id,
            test_center_id,
            exam_date,
            status,
            test_centers(center_name_en, center_name_bn, address_en, address_bn)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Post-process to get only scheduled booking
      const processedData = (data || []).map(app => {
        let booking = null;
        if (Array.isArray(app.physical_exam_booking)) {
          booking = app.physical_exam_booking.find(b => b.status === 'scheduled') || null;
        }
        return {
          ...app,
          physical_exam_booking: booking
        };
      });
      
      setLicenseApplications(processedData);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error(language === 'en' ? 'Failed to load applications' : 'আবেদন লোড করতে ব্যর্থ');
    } finally {
      setLoadingApplications(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user?.id) {
      console.log('No user ID available for fetching notifications');
      return;
    }
    
    try {
      console.log('Fetching notifications for user:', user.id);
      
      // Fetch ALL notifications for current user (both read and unread)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', 'user')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Notification fetch error:', error);
        throw error;
      }
      
      console.log('Fetched notifications:', data?.length || 0);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchLicenses = async () => {
    if (!user?.id) {
      console.log('No user ID available for fetching licenses');
      setLoadingLicenses(false); // Set to false even if no user
      return;
    }
    
    try {
      setLoadingLicenses(true);
      console.log('Fetching licenses for user:', user.id);
      
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Only log error, don't show toast for empty results
        if (error.code !== 'PGRST116') { // Not a "no rows" error
          console.error('License fetch error:', error);
        }
      }
      
      console.log('Fetched licenses:', data?.length || 0);
      setLicenses(data || []);
    } catch (error) {
      console.error('Error fetching licenses:', error);
      // Don't show error toast, just log it
    } finally {
      setLoadingLicenses(false);
    }
  };

  const generateLicense = async (applicationId) => {
    if (!user?.id || !applicationId) {
      toast.error(language === 'en' ? 'Missing required information' : 'প্রয়োজনীয় তথ্য নেই');
      return;
    }
    
    try {
      setGeneratingLicense(true);
      
      // Get backend URL dynamically
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';

      const response = await fetch(`${backendUrl}/api/licenses/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationId,
          user_id: user.id
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(language === 'en' 
          ? `License ${data.license.license_number} generated successfully!` 
          : `লাইসেন্স ${data.license.license_number} সফলভাবে তৈরি হয়েছে!`
        );
        // Refresh licenses
        await fetchLicenses();
      } else {
        throw new Error(data.error || 'Failed to generate license');
      }
    } catch (error) {
      console.error('Error generating license:', error);
      toast.error(error.message || (language === 'en' ? 'Failed to generate license' : 'লাইসেন্স তৈরি করতে ব্যর্থ'));
    } finally {
      setGeneratingLicense(false);
    }
  };

  const fetchRegisteredVehicles = async () => {
    if (!user?.id) {
      setLoadingRegisteredVehicles(false);
      return;
    }

    try {
      setLoadingRegisteredVehicles(true);
      
      // First, try to fetch vehicles with phone from profiles
      let { data, error } = await supabase
        .from('registered_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Try to fetch phone from profiles separately
      if (data && data.length > 0) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', user.id)
            .single();
          
          // Add phone to all vehicles
          const vehiclesWithPhone = (data || []).map(vehicle => ({
            ...vehicle,
            phone: profileData?.phone || null
          }));
          
          setRegisteredVehicles(vehiclesWithPhone);
        } catch (profileError) {
          // If profiles query fails, just use vehicles without phone
          console.log('Could not fetch phone from profiles:', profileError);
          setRegisteredVehicles(data || []);
        }
      } else {
        setRegisteredVehicles(data || []);
      }
    } catch (error) {
      console.error('Error fetching registered vehicles:', error);
      setRegisteredVehicles([]);
    } finally {
      setLoadingRegisteredVehicles(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Update local state without removing notification
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      
      toast.success(language === 'en' ? 'Marked as read' : 'পঠিত হিসাবে চিহ্নিত');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) {
        toast.info(language === 'en' ? 'No unread notifications' : 'কোনো অপঠিত বিজ্ঞপ্তি নেই');
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
      );
      
      toast.success(language === 'en' ? 'All notifications marked as read' : 'সব বিজ্ঞপ্তি পঠিত চিহ্নিত');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(language === 'en' ? 'Failed to mark all as read' : 'সব পঠিত চিহ্নিত করতে ব্যর্থ');
    }
  };

  // Settings handlers
  const handleChangePassword = async (e) => {
    if (e) e.preventDefault();
    
    if (passwordData.new !== passwordData.confirm) {
      toast.error(language === 'en' ? 'Passwords do not match' : 'পাসওয়ার্ড মিলছে না');
      return;
    }
    
    // Use the same validation as signup
    if (!validatePassword(passwordData.new)) {
      toast.error(language === 'en' 
        ? 'Password must meet all requirements shown below' 
        : 'পাসওয়ার্ড নিচে দেখানো সমস্ত প্রয়োজনীয়তা পূরণ করতে হবে'
      );
      return;
    }
    
    setIsUpdating(true);
    try {
      const result = await updatePassword(passwordData.new);
      if (result.success) {
        toast.success(language === 'en' ? 'Password updated successfully' : 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে');
        setShowPasswordModal(false);
        setPasswordData({ current: '', new: '', confirm: '' });
      } else {
        throw result.error;
      }
    } catch (error) {
      toast.error(error?.message || (language === 'en' ? 'Failed to update password' : 'পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePhone = async (e) => {
    if (e) e.preventDefault();
    
    if (!newPhone || newPhone.length < 10) {
      toast.error(language === 'en' ? 'Please enter a valid phone number' : 'একটি বৈধ ফোন নম্বর লিখুন');
      return;
    }
    
    setIsUpdating(true);
    try {
      const result = await updatePhone(newPhone);
      if (result.success) {
        toast.success(language === 'en' ? 'Phone number updated successfully' : 'ফোন নম্বর সফলভাবে আপডেট হয়েছে');
        setShowPhoneModal(false);
        setNewPhone('');
      } else {
        throw result.error;
      }
    } catch (error) {
      toast.error(error?.message || (language === 'en' ? 'Failed to update phone number' : 'ফোন নম্বর আপডেট ব্যর্থ হয়েছে'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper functions
  const generateQRCode = (data) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  };

  const generateLicenseQRCode = (licenseNumber) => {
    // Use production URL for QR codes
    const baseUrl = import.meta.env.PROD 
      ? 'https://brta-extended.vercel.app' 
      : window.location.origin;
    const licenseUrl = `${baseUrl}/license/${licenseNumber}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(licenseUrl)}`;
  };

  

  // Function to download card as PDF
  const downloadCardAsPDF = useCallback((cardType, cardData, backData = null, gradientColors = '#006A4E, #28A745, #006A4E', backGradient = '#004A35, #1D7A3A, #004A35') => {
    startDownload();
    
    // Create a new window to render the card for PDF generation
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow pop-ups to download the PDF');
      endDownload();
      return;
    }

    // Get photo URL from cardData
    const photoUrl = cardData.photo_url || cardData['Photo URL'] || '';
    const licenseNumber = cardData.license_number || cardData['License No'] || 'N/A';
    const qrData = `${window.location.origin}/license/${licenseNumber}`;

    // Generate HTML content showing BOTH front and back of the card
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cardType}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            max-width: 850px;
            margin: 0 auto;
          }
          .card {
            width: 100%;
            height: 520px;
            margin-bottom: 30px;
            padding: 30px;
            background: linear-gradient(135deg, ${gradientColors});
            color: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            page-break-after: always;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
          }
          .card::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 300px;
            background-image: url('/brta.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 0.1;
            z-index: 0;
          }
          .card > * {
            position: relative;
            z-index: 1;
          }
          .card.back {
            background: linear-gradient(135deg, ${backGradient});
            padding: 25px 30px 40px 30px;
          }
          .user-photo {
            width: 110px;
            height: 135px;
            background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
            border: 3px solid rgba(255,255,255,0.5);
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .user-photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .user-photo-placeholder {
            font-size: 48px;
            color: rgba(255,255,255,0.6);
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 2px solid rgba(255,255,255,0.3);
          }
          .header h1 {
            font-size: 22px;
            margin-bottom: 4px;
          }
          .header p {
            font-size: 12px;
            opacity: 0.9;
          }
          .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .field {
            margin-bottom: 12px;
          }
          .field.full {
            grid-column: 1 / -1;
          }
          .label {
            font-size: 11px;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .value {
            font-size: 16px;
            font-weight: bold;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            max-width: 100%;
            white-space: normal;
          }
          .qr-section {
            margin-top: 30px;
            text-align: center;
            padding-top: 20px;
            border-top: 2px solid rgba(255,255,255,0.3);
          }
          .qr-section img {
            background: white;
            padding: 10px;
            border-radius: 10px;
          }
          .back-details {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            flex: 1;
            gap: 12px;
            overflow: hidden;
          }
          .back-info {
            width: 100%;
            max-width: 450px;
            text-align: center;
          }
          .print-btn {
            display: block;
            width: 200px;
            margin: 30px auto 0;
            padding: 12px 24px;
            background: #fbbf24;
            color: #166534;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          }
          .print-btn:hover {
            background: #f59e0b;
          }
          @media print {
            body { padding: 0; background: white; }
            .card { 
              box-shadow: none; 
              margin-bottom: 50px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- FRONT SIDE -->
          <div class="card">
            <div class="header">
              <h1>DRIVING LICENSE</h1>
              <p>Bangladesh Road Transport Authority</p>
            </div>
            <div style="display: flex; gap: 25px; align-items: flex-start;">
              <div>
                <div class="user-photo">
                  ${photoUrl ? `<img src="${photoUrl}" alt="License Holder" crossorigin="anonymous" />` : '<div class="user-photo-placeholder">👤</div>'}
                </div>
                <p style="text-align: center; margin-top: 6px; font-size: 10px; opacity: 0.9;">Photo</p>
              </div>
              <div class="content" style="flex: 1;">
                ${Object.entries(cardData)
                  .filter(([key]) => !['photo_url', 'Photo URL'].includes(key))
                  .map(([key, value]) => {
                    const isLongField = key.toLowerCase().includes('address') || key.includes('Plate') || key.includes('Model') || key.includes('Name');
                    const isAddress = key.toLowerCase().includes('address');
                    return `
                  <div class="field ${isLongField ? 'full' : ''}">
                    <div class="label">${key.replace(/_/g, ' ').toUpperCase()}</div>
                    <div class="value" style="${isAddress ? 'font-size: 12px; line-height: 1.4;' : ''}">${value}</div>
                  </div>
                `;
                  }).join('')}
              </div>
            </div>
          </div>
          
          <!-- BACK SIDE -->
          <div class="card back">
            <div class="header">
              <h1>LICENSE DETAILS</h1>
              <p>Back Side Information</p>
            </div>
            <div class="back-details">
              <div class="qr-section" style="border: none; padding: 0; margin: 0;">
                <img src="${generateLicenseQRCode(licenseNumber)}" alt="QR Code" style="width: 120px; height: 120px;" crossorigin="anonymous" />
                <p style="margin-top: 6px; font-size: 10px;">Scan to Verify</p>
              </div>
              <div class="back-info">
                <div class="field" style="margin-bottom: 10px;">
                  <div class="label">License Number</div>
                  <div class="value" style="font-size: 16px; color: #fbbf24;">${licenseNumber}</div>
                </div>
                <div class="field" style="margin-bottom: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
                  <div class="label">Type & Category</div>
                  <div class="value" style="font-size: 13px;">${cardData['Type'] || 'N/A'} - ${cardData['Category'] || 'N/A'}</div>
                </div>
                <div class="field" style="margin-bottom: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
                  <div class="label">Address</div>
                  <div class="value" style="font-size: 11px; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; white-space: normal;">${cardData.address || cardData['Address'] || 'N/A'}</div>
                </div>
                <div class="field" style="padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
                  <div class="label">Issue & Expiry</div>
                  <div class="value" style="font-size: 12px;">${cardData['Issue Date'] || 'N/A'} - ${cardData['Expiry Date'] || 'N/A'}</div>
                </div>
              </div>
            </div>
            <div style="text-align: center; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3); margin-top: auto;">
              <p style="font-size: 10px; opacity: 0.8;">Official document of Bangladesh Road Transport Authority</p>
            </div>
          </div>
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Print Cards</button>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // End download state after a short delay
    setTimeout(() => {
      endDownload();
    }, 1500);
  }, [generateQRCode, startDownload, endDownload]);

  // Function to download tax token as PDF
  const downloadTaxTokenAsPDF = useCallback((tokenData) => {
    startDownload();
    
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow pop-ups to download the PDF');
      endDownload();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tax Token - ${tokenData['Token No']}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: white;
          }
          .card {
            width: 600px;
            margin: 0 auto;
            padding: 30px;
            background: linear-gradient(135deg, #16a34a, #15803d, #166534);
            color: white;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
            overflow: hidden;
          }
          .card::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 300px;
            background-image: url('/brta.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 0.1;
            z-index: 0;
          }
          .card > * {
            position: relative;
            z-index: 1;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid rgba(255,255,255,0.3);
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 3px;
            color: #fbbf24;
          }
          .header h2 {
            font-size: 20px;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 12px;
            opacity: 0.9;
          }
          .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .field {
            margin-bottom: 10px;
          }
          .field.full {
            grid-column: 1 / -1;
          }
          .label {
            font-size: 10px;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }
          .value {
            font-size: 16px;
            font-weight: bold;
          }
          .amount {
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            color: #fbbf24;
            margin: 15px 0;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
          }
          .qr-section {
            margin-top: 20px;
            text-align: center;
            padding-top: 15px;
            border-top: 2px solid rgba(255,255,255,0.3);
          }
          .qr-section img {
            background: white;
            padding: 8px;
            border-radius: 10px;
            width: 120px;
            height: 120px;
          }
          .status {
            display: inline-block;
            padding: 5px 15px;
            background: #86efac;
            color: #166534;
            border-radius: 20px;
            font-weight: bold;
            font-size: 16px;
          }
          .print-btn {
            display: block;
            width: 200px;
            margin: 20px auto 0;
            padding: 12px 24px;
            background: #fbbf24;
            color: #166534;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          }
          .print-btn:hover {
            background: #f59e0b;
          }
          @media print {
            body { padding: 0; }
            .card { 
              box-shadow: none;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>TAX TOKEN</h1>
            <h2>বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ</h2>
            <p>Bangladesh Road Transport Authority</p>
          </div>
          <div class="amount">${tokenData['Amount']}</div>
          <div class="content">
            <div class="field full">
              <div class="label">Token No.</div>
              <div class="value">${tokenData['Token No']}</div>
            </div>
            <div class="field full">
              <div class="label">Vehicle</div>
              <div class="value">${tokenData['Vehicle']}</div>
            </div>
            <div class="field full">
              <div class="label">Registration Plate</div>
              <div class="value">${tokenData['Registration Plate']}</div>
            </div>
            <div class="field">
              <div class="label">Owner Name</div>
              <div class="value">${tokenData['Owner Name']}</div>
            </div>
            <div class="field">
              <div class="label">Driving License No</div>
              <div class="value">${tokenData['Driving License No']}</div>
            </div>
            <div class="field">
              <div class="label">Issue Date</div>
              <div class="value">${tokenData['Issue Date']}</div>
            </div>
            <div class="field">
              <div class="label">Valid Until</div>
              <div class="value">${tokenData['Valid Until']}</div>
            </div>
            <div class="field full" style="text-align: center; margin-top: 10px;">
              <div class="label">Status</div>
              <div class="status">✓ ${tokenData['Status']}</div>
            </div>
          </div>
          <div class="qr-section">
            <img src="${generateQRCode(tokenData['Registration Number'])}" alt="QR Code" />
            <p style="margin-top: 10px; font-size: 12px;">Scan to Verify</p>
          </div>
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Print This Token</button>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      endDownload();
    }, 1500);
  }, [generateQRCode, startDownload, endDownload]);

  // Function to download vehicle smart card as PDF
  const downloadVehicleSmartCard = useCallback(async (vehicle) => {
    startDownload();
    
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow pop-ups to download the PDF');
      endDownload();
      return;
    }

    // Generate QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vehicle.registration_number)}`;

    const isExpired = new Date(vehicle.valid_until) < new Date();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vehicle_Smart_Card_${vehicle.registration_plate.en.replace(/\\s/g, '_')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .container { max-width: 900px; margin: 0 auto; }
          .card {
            width: 100%;
            height: 400px;
            margin-bottom: 30px;
            padding: 25px 35px;
            background: linear-gradient(135deg, #3B82F6, #2563EB, #1D4ED8);
            color: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            page-break-after: always;
            position: relative;
            overflow: hidden;
          }
          .card::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 300px;
            background-image: url('/brta.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 0.1;
            z-index: 0;
          }
          .card > * { position: relative; z-index: 1; }
          .card.back { background: linear-gradient(135deg, #1E40AF, #1E3A8A, #1E3A8A); }
          .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid rgba(255,255,255,0.3); }
          .header h1 { font-size: 20px; margin-bottom: 2px; }
          .header p { font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
          .plate-box {
            background: black;
            color: white;
            padding: 10px 16px;
            border-radius: 10px;
            text-align: center;
            border: 4px solid #fbbf24;
            margin: 12px 0;
          }
          .plate-text { font-size: 22px; font-weight: bold; letter-spacing: 2px; }
          .content { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px; }
          .field { margin-bottom: 8px; }
          .label { font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
          .value { font-size: 14px; font-weight: bold; }
          .footer {
            margin-top: 15px;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.3);
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            opacity: 0.9;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            background: ${isExpired ? '#ef4444' : '#22c55e'};
            color: white;
          }
          .qr-section { text-align: center; margin: 20px 0; }
          .qr-code { background: white; padding: 10px; border-radius: 10px; width: 140px; margin: 0 auto; }
          .qr-code img { width: 100%; height: auto; }
          .back-content { display: flex; gap: 25px; align-items: flex-start; margin-top: 20px; }
          .back-details { flex: 1; }
          .print-btn {
            display: block;
            width: 200px;
            margin: 30px auto 0;
            padding: 12px 24px;
            background: #fbbf24;
            color: #166534;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
          }
          @media print {
            body { padding: 0; background: white; }
            .card { box-shadow: none; margin-bottom: 50px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- FRONT SIDE -->
          <div class="card">
            <div class="header">
              <p>Bangladesh Road Transport Authority</p>
              <h1>VEHICLE SMART CARD</h1>
            </div>
            
            <div class="plate-box">
              <div class="plate-text">${vehicle.registration_plate.en}</div>
            </div>
            
            <div class="content">
              <div class="field" style="grid-column: 1 / -1; display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                ${vehicle.vehicle_photo_url ? `<img src="${vehicle.vehicle_photo_url}" alt="User Photo" crossorigin="anonymous" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid rgba(255,255,255,0.5);" />` : ''}
                <div style="flex: 1;">
                  <div class="label">Vehicle</div>
                  <div class="value">${vehicle.vehicle_name} ${vehicle.model}</div>
                  <div style="font-size: 11px; opacity: 0.8; margin-top: 3px;">${vehicle.vehicle_type} • ${vehicle.engine_cc} CC</div>
                </div>
              </div>
              <div class="field">
                <div class="label">Registration No.</div>
                <div class="value">${vehicle.registration_number}</div>
              </div>
              <div class="field">
                <div class="label">Owner Name</div>
                <div class="value">${vehicle.owner_name_en}</div>
              </div>
              <div class="field">
                <div class="label">Status</div>
                <span class="status-badge">${isExpired ? 'EXPIRED' : 'VALID'}</span>
              </div>
              <div class="field">
                <div class="label">NID</div>
                <div class="value">${vehicle.owner_nid}</div>
              </div>
              <div class="field">
                <div class="label">DL Number</div>
                <div class="value">${vehicle.owner_dl_number || 'N/A'}</div>
              </div>
            </div>
            
            <div class="footer">
              <div><span style="opacity: 0.7;">Registration:</span> <strong>${vehicle.registration_date}</strong></div>
              <div><span style="opacity: 0.7;">Valid Until:</span> <strong style="color: ${isExpired ? '#fca5a5' : '#86efac'};">${vehicle.valid_until}</strong></div>
              <div><span style="opacity: 0.7;">Engine:</span> <strong>${vehicle.engine_number}</strong></div>
            </div>
          </div>
          
          <!-- BACK SIDE -->
          <div class="card back">
            <div class="header">
              <h1>VEHICLE DETAILS</h1>
            </div>
            
            <div class="back-content">
              <div class="qr-section">
                <div class="qr-code">
                  <img src="${qrCodeUrl}" alt="QR Code" crossorigin="anonymous" />
                </div>
                <p style="margin-top: 6px; font-size: 10px; opacity: 0.9;">Scan to Verify</p>
              </div>
              
              <div class="back-details">
                <div class="content">
                  <div class="field">
                    <div class="label">Engine Number</div>
                    <div class="value">${vehicle.engine_number}</div>
                  </div>
                  <div class="field">
                    <div class="label">Owner</div>
                    <div class="value">${vehicle.owner_name_en}</div>
                  </div>
                  <div class="field">
                    <div class="label">NID</div>
                    <div class="value">${vehicle.owner_nid}</div>
                  </div>
                  <div class="field">
                    <div class="label">Contact</div>
                    <div class="value">${vehicle.phone || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3); text-align: center;">
              <p style="font-size: 10px; opacity: 0.8;">For verification: www.brta.gov.bd • Official document of Bangladesh Road Transport Authority</p>
            </div>
          </div>
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Print Smart Card</button>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      endDownload();
    }, 1500);
  }, [startDownload, endDownload]);

  // Handlers
  const handleToggleVehicleFlip = useCallback((e) => {
    const id = e.currentTarget.dataset.vid;
    if (!id) return;
    setFlippedVehicles(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleDownloadCard = useCallback((e) => {
    const d = e.currentTarget.dataset;
    const plate = d.plate;
    const model = d.model;
    const year = d.year;
    const id = d.vid;
    const status = d.status;
    const name = `Vehicle_Smart_Card_${plate}`;
    downloadCardAsPDF(name, {
      'Vehicle Model': model,
      'Registration Plate': plate,
      'Year': year,
      'Owner Name': 'John Doe',
      'Card No': `VC-${parseInt(id, 10).toString().padStart(6, '0')}`,
      'Status': status,
      'Issued Date': `10/03/${year}`,
      'Expiry Date': '31/12/2030'
    }, null, '#3B82F6, #2563EB, #1D4ED8', '#1E40AF, #1E3A8A, #1E3A8A');
  }, [downloadCardAsPDF]);

  const handleShowTaxToken = useCallback(async (vehicle) => {
    // Check if vehicle is expired - if yes, directly open renewal modal
    const isExpired = vehicle?.valid_until && new Date(vehicle.valid_until) < new Date();
    
    if (isExpired) {
      // Directly open renewal modal for expired vehicles
      setRenewalVehicle(vehicle);
      setShowTaxTokenRenewalModal(true);
      return;
    }
    
    // For active vehicles, show the tax token modal
    setShowTaxToken(vehicle);
    
    // Fetch tax token data for this vehicle
    if (vehicle?.id) {
      try {
        const { data: tokenData, error } = await supabase
          .from('tax_tokens')
          .select('*')
          .eq('registered_vehicle_id', vehicle.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (tokenData && !error) {
          setTaxTokenData(tokenData);
        } else {
          // No tax token found, set null
          setTaxTokenData(null);
        }
      } catch (err) {
        console.error('Error fetching tax token:', err);
        setTaxTokenData(null);
      }
    }
  }, []);

  const menuItems = [
    { id: 'license', icon: <IdentificationCard size={24} weight="duotone" />, label: t.licenseApplication, tourId: 'license-card' },
    { id: 'vehicle', icon: <Car size={24} weight="duotone" />, label: t.vehicleRegistration, tourId: 'vehicle-card' },
    { id: 'routepermits', icon: <MapPin size={24} weight="duotone" />, label: language === 'en' ? 'Route Permits' : 'রুট পারমিট' },
    { id: 'ownership', icon: <ArrowsDownUp size={24} weight="duotone" />, label: language === 'en' ? 'Ownership Transfer' : 'মালিকানা হস্তান্তর' },
    { id: 'myreports', icon: <Megaphone size={24} weight="duotone" />, label: language === 'en' ? 'My Community Reports' : 'আমার কমিউনিটি রিপোর্ট' },
    { id: 'violations', icon: <Warning size={24} weight="duotone" />, label: language === 'en' ? 'My Violations' : 'আমার লঙ্ঘন' },
    { id: 'questionbank', icon: <BookOpen size={24} weight="duotone" />, label: language === 'en' ? 'Question Bank' : 'প্রশ্ন ব্যাংক' },
    { id: 'calculator', icon: <Calculator size={24} weight="duotone" />, label: t.costCalculator },
    // Removed 'dlpayment' tab. Payment is now only in Progress Tracker.
    { id: 'payments', icon: <CreditCard size={24} weight="duotone" />, label: t.myPayments },
    { id: 'profile', icon: <User size={24} weight="duotone" />, label: t.profile },
    { id: 'settings', icon: <Gear size={24} weight="duotone" />, label: t.settings },
  ];

  const payments = [
    { id: 1, purpose: 'License Fee', amount: '৳ 2,500', date: '2025-11-10', status: 'Completed' },
    { id: 2, purpose: 'Vehicle Registration', amount: '৳ 15,000', date: '2025-10-15', status: 'Completed' },
    { id: 3, purpose: 'Test Fee', amount: '৳ 500', date: '2025-11-05', status: 'Pending' },
  ];

  const testSlots = [
    { id: 1, center: 'Mirpur Test Center', date: '2025-11-20', time: '10:00 AM', type: 'Driving Test' },
    { id: 2, center: 'Banani Test Center', date: '2025-11-22', time: '02:00 PM', type: 'Written Test' },
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'active':
        return 'bg-success/20 text-success border-success';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500';
      case 'processing':
        return 'bg-blue-500/20 text-blue-600 border-blue-500';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500';
    }
  };


  // Import UserPayments page at the top (add this line to your imports):
  // import UserPayments from './UserPayments.jsx';

  const renderContent = () => {
    switch (activeTab) {
      case 'license':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t.licenseApplication}</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                onClick={() => setIsModalOpen(true)}
              >
                {language === 'en' ? '+ New Application' : '+ নতুন আবেদন'}
              </motion.button>
            </div>
            <div className="grid gap-6">
              {loadingApplications ? (
                <div className="space-y-6">
                  <ProgressTrackerSkeleton />
                  <ProgressTrackerSkeleton />
                </div>
              ) : licenseApplications.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <IdentificationCard size={64} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    {language === 'en' ? 'No applications yet. Start your first one!' : 'এখনও কোনো আবেদন নেই। প্রথমটি শুরু করুন!'}
                  </p>
                </div>
              ) : (
                licenseApplications.map((app, index) => {
                  // Check if this application has a generated license
                  const generatedLicense = licenses.find(lic => lic.application_id === app.id);
                  
                  // Smart detection: Determine if this is the LATEST completed license
                  // Animation only shows for the most recent license without newer applications
                  const hasNewerApplication = licenseApplications.some(laterApp => 
                    new Date(laterApp.created_at) > new Date(app.created_at) && !licenses.some(lic => lic.application_id === laterApp.id)
                  );
                  
                  // Show celebration if license exists
                  // Show animation ONLY if it's the latest (no newer apps)
                  const showCelebration = !!generatedLicense;
                  const showAnimation = generatedLicense && !hasNewerApplication;
                  
                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
                    >
                      {showCelebration ? (
                        <LicenseCompletionCelebration 
                          application={app}
                          license={generatedLicense}
                          onViewLicense={() => setActiveTab('profile')}
                          showAnimation={showAnimation}
                        />
                      ) : (
                        <ProgressTracker application={app} />
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        );

      case 'vehicle':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t.vehicleRegistration}</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowVehicleRegistrationModal(true)}
                className="bg-gradient-to-r from-primary to-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Car size={20} weight="bold" />
                {language === 'en' ? '+ Register Vehicle' : '+ যানবাহন নিবন্ধন'}
              </motion.button>
            </div>

            {loadingRegisteredVehicles ? (
              <div className="grid gap-4">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : registeredVehicles.length === 0 ? (
              <div className="text-center py-12">
                <Car size={64} weight="duotone" className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {language === 'en' 
                    ? 'No registered vehicles yet. Register your first vehicle!' 
                    : 'এখনও কোনো নিবন্ধিত যানবাহন নেই। আপনার প্রথম যানবাহন নিবন্ধন করুন!'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {registeredVehicles.map((vehicle, index) => (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-green-600 rounded-xl flex items-center justify-center">
                          <Car size={32} weight="duotone" className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                            {vehicle.vehicle_name} {vehicle.model}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {language === 'en' ? 'Plate:' : 'প্লেট:'} {language === 'en' ? vehicle.registration_plate?.en : vehicle.registration_plate?.bn}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {language === 'en' ? 'Registration:' : 'নিবন্ধন:'} {vehicle.registration_number}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {language === 'en' ? 'Valid Until:' : 'বৈধ পর্যন্ত:'} {new Date(vehicle.valid_until).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-4 py-1 rounded-full text-sm font-semibold border-2 ${
                        vehicle.status === 'active' ? 'bg-success/20 text-success border-success' : 'bg-gray-500/20 text-gray-600 border-gray-500'
                      }`}>
                        {vehicle.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );

      // Removed 'dlpayment' tab logic. Payment is now only in Progress Tracker.
      case 'payments':
        return <UserPayments />;

      case 'booking':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t.testBooking}</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {language === 'en' ? '+ Book Test Slot' : '+ টেস্ট স্লট বুক করুন'}
              </motion.button>
            </div>
            <div className="grid gap-4">
              {testSlots.map((slot, index) => (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{slot.center}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Date:' : 'তারিখ:'} {slot.date}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Time:' : 'সময়:'} {slot.time}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'en' ? 'Type:' : 'ধরন:'} {slot.type}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-primary text-white rounded-lg font-semibold shadow-md"
                    >
                      {language === 'en' ? 'Book' : 'বুক করুন'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{t.profile}</h2>
            
            {/* Driving License Smart Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <IdentificationCard size={24} weight="duotone" className="text-primary" />
                  {language === 'en' ? 'My Driving License' : 'আমার ড্রাইভিং লাইসেন্স'}
                </h3>

                {/* Generate License Button - Only show if approved application exists without license */}
                {!loadingLicenses && !loadingApplications && licenseApplications.length > 0 && (
                  (() => {
                    const approvedApps = licenseApplications.filter(app => 
                      app.status === 'approved' && app.payment === 1
                    );
                    const appsWithoutLicense = approvedApps.filter(app =>
                      !licenses.some(lic => lic.application_id === app.id)
                    );

                    return appsWithoutLicense.length > 0 ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => generateLicense(appsWithoutLicense[0].id)}
                        disabled={generatingLicense}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingLicense ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {language === 'en' ? 'Generating...' : 'তৈরি হচ্ছে...'}
                          </>
                        ) : (
                          <>
                            <Sparkle size={20} weight="duotone" />
                            {language === 'en' ? 'Generate License' : 'লাইসেন্স তৈরি করুন'}
                          </>
                        )}
                      </motion.button>
                    ) : null;
                  })()
                )}
              </div>
              
              {/* License Display */}
              {loadingLicenses ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <LicenseCardSkeleton />
                </div>
              ) : licenses.length > 0 ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {licenses.map((license, index) => (
                    <motion.div
                      key={license.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <LicenseCard
                        license={license}
                        language={language}
                        generateLicenseQRCode={generateLicenseQRCode}
                        onDownload={(lic) => downloadCardAsPDF(`Driving_License_${lic.license_number}`, {
                          'License No': lic.license_number,
                          'Name': lic.full_name_en,
                          'Date of Birth': new Date(lic.date_of_birth).toLocaleDateString('en-GB'),
                          'Blood Group': lic.blood_group,
                          'Gender': lic.gender,
                          'Issue Date': new Date(lic.issue_date).toLocaleDateString('en-GB'),
                          'Expiry Date': new Date(lic.expiry_date).toLocaleDateString('en-GB'),
                          'Status': lic.status.toUpperCase(),
                          'photo_url': lic.photo_url,
                          'Type': lic.license_type,
                          'Category': lic.license_category,
                          'address': lic.address
                        })}
                        onRenew={(lic) => {
                          setRenewalLicense(lic);
                          setShowRenewalModal(true);
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 p-8 rounded-xl text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <IdentificationCard size={64} className="text-gray-400 mx-auto mb-4" weight="duotone" />
                  <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'No License Available' : 'কোনো লাইসেন্স নেই'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {language === 'en' 
                      ? 'Complete your application and generate your driving license' 
                      : 'আপনার আবেদন সম্পূর্ণ করুন এবং ড্রাইভিং লাইসেন্স তৈরি করুন'}
                  </p>
                  {licenseApplications.some(app => app.status === 'approved' && app.payment === 1) && (
                    <p className="text-xs text-primary font-semibold">
                      {language === 'en' 
                        ? '✓ Your application is approved! Click "Generate License" button above' 
                        : '✓ আপনার আবেদন অনুমোদিত! উপরের "লাইসেন্স তৈরি করুন" বোতামে ক্লিক করুন'}
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Vehicle Smart Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Car size={24} weight="duotone" className="text-primary" />
                {language === 'en' ? 'Vehicle Smart Cards & Tax Tokens' : 'যানবাহন স্মার্ট কার্ড এবং ট্যাক্স টোকেন'}
              </h3>
              
              {loadingRegisteredVehicles ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <VehicleCardSkeleton />
                  <VehicleCardSkeleton />
                </div>
              ) : registeredVehicles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Car size={48} weight="duotone" className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {language === 'en' ? 'No registered vehicles found' : 'কোনো নিবন্ধিত যানবাহন পাওয়া যায়নি'}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowVehicleRegistrationModal(true)}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-semibold"
                  >
                    {language === 'en' ? 'Register Vehicle' : 'যানবাহন নিবন্ধন করুন'}
                  </motion.button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {registeredVehicles.map((vehicle, index) => (
                    <VehicleRegistrationCard 
                      key={vehicle.id} 
                      vehicle={vehicle} 
                      language={language}
                      index={index}
                      onShowTaxToken={handleShowTaxToken}
                      onDownload={downloadVehicleSmartCard}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Tax Token Modal */}
            <AnimatePresence>
              {showTaxToken && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => {
                    setShowTaxToken(null);
                    setTaxTokenData(null);
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-4 rounded-2xl shadow-2xl text-white max-w-md w-full relative overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setShowTaxToken(null);
                        setTaxTokenData(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-all z-20"
                    >
                      <X size={18} />
                    </button>

                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                    </div>

                    <div className="relative z-10">
                      <div className="text-center mb-3">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-1.5">
                          <CreditCard size={24} weight="duotone" />
                        </div>
                        <h3 className="text-lg font-bold">{language === 'en' ? 'Tax Token' : 'ট্যাক্স টোকেন'}</h3>
                        <p className="text-xs opacity-90">{language === 'en' ? 'Vehicle Tax Payment Receipt' : 'যানবাহন কর পেমেন্ট রসিদ'}</p>
                      </div>

                      {showTaxToken && (
                        <>
                          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-3">
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Vehicle' : 'যানবাহন'}</p>
                                <p className="text-base font-bold">{showTaxToken.vehicle_name} {showTaxToken.model}</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Registration Plate' : 'প্লেট'}</p>
                                <p className="text-base font-bold tracking-wider">
                                  {language === 'en' ? showTaxToken.registration_plate.en : showTaxToken.registration_plate.bn}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/30">
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Owner Name' : 'মালিকের নাম'}</p>
                                  <p className="text-sm font-bold">
                                    {language === 'en' ? showTaxToken.owner_name_en : showTaxToken.owner_name_bn}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'DL Number' : 'ডিএল নম্বর'}</p>
                                  <p className="text-sm font-bold">
                                    {showTaxToken.owner_dl_number || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/30">
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Token No.' : 'টোকেন নং'}</p>
                                  <p className="text-sm font-bold">
                                    {taxTokenData ? taxTokenData.token_number : (language === 'en' ? 'No tax token' : 'কোন ট্যাক্স টোকেন নেই')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Amount' : 'পরিমাণ'}</p>
                                  <p className="text-lg font-bold">
                                    {taxTokenData ? `৳ ${taxTokenData.amount_paid.toLocaleString()}` : '৳ 0'}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Issue Date' : 'ইস্যুর তারিখ'}</p>
                                  <p className="text-sm font-bold">
                                    {taxTokenData ? new Date(taxTokenData.issue_date).toLocaleDateString() : showTaxToken.registration_date}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Valid Until' : 'বৈধ পর্যন্ত'}</p>
                                  <p className="text-sm font-bold">
                                    {taxTokenData ? new Date(taxTokenData.valid_until).toLocaleDateString() : showTaxToken.valid_until}
                                  </p>
                                </div>
                              </div>
                              {taxTokenData && (
                                <div className="pt-2 border-t border-white/30">
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Status' : 'স্ট্যাটাস'}</p>
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                    taxTokenData.status === 'active' 
                                      ? 'bg-green-200 text-green-800' 
                                      : 'bg-red-200 text-red-800'
                                  }`}>
                                    {taxTokenData.status === 'active' ? 
                                      (language === 'en' ? 'Active' : 'সক্রিয়') : 
                                      (language === 'en' ? 'Expired' : 'মেয়াদ শেষ')
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* QR Code */}
                          <div className="flex justify-center mb-3">
                            <div className="bg-white p-2 rounded-xl">
                              <img 
                                src={generateQRCode(showTaxToken.registration_number)} 
                                alt="Tax Token QR" 
                                className="w-28 h-28"
                              />
                              <p className="text-xs text-center mt-0.5 text-gray-800 font-semibold">{language === 'en' ? 'Scan to Verify' : 'যাচাই করুন'}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {(() => {
                              const isExpired = taxTokenData ? new Date(taxTokenData.valid_until) < new Date() : new Date(showTaxToken.valid_until) < new Date();
                              
                              if (isExpired) {
                                return (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      setRenewalVehicle(showTaxToken);
                                      setShowTaxTokenRenewalModal(true);
                                      setShowTaxToken(null);
                                      setTaxTokenData(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-yellow-400 text-green-800 hover:bg-yellow-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                  >
                                    <ArrowsClockwise size={18} />
                                    {language === 'en' ? 'Renew Token' : 'টোকেন নবায়ন'}
                                  </motion.button>
                                );
                              } else {
                                return (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => downloadTaxTokenAsPDF({
                                      'Token No': taxTokenData ? taxTokenData.token_number : `TT-2025-${showTaxToken.id?.toString().padStart(6, '0')}`,
                                      'Vehicle': `${showTaxToken.vehicle_name} ${showTaxToken.model}`,
                                      'Registration Plate': showTaxToken.registration_plate.en,
                                      'Registration Number': showTaxToken.registration_number,
                                      'Owner Name': showTaxToken.owner_name_en,
                                      'Driving License No': showTaxToken.owner_dl_number || 'N/A',
                                      'Amount': taxTokenData ? `৳ ${taxTokenData.amount_paid.toLocaleString()}` : '৳ 5,000',
                                      'Issue Date': taxTokenData ? new Date(taxTokenData.issue_date).toLocaleDateString() : showTaxToken.registration_date,
                                      'Valid Until': taxTokenData ? new Date(taxTokenData.valid_until).toLocaleDateString() : showTaxToken.valid_until,
                                      'Status': taxTokenData?.status === 'active' ? 'Paid' : 'Expired'
                                    })}
                                    className="flex-1 px-4 py-2.5 bg-white text-green-600 hover:bg-white/90 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                  >
                                    <DownloadSimple size={18} />
                                    {language === 'en' ? 'Download PDF' : 'পিডিএফ ডাউনলোড'}
                                  </motion.button>
                                );
                              }
                            })()}
                          </div>

                          <p className="text-xs text-center mt-2 opacity-80">
                            {language === 'en' ? 'Keep this token with your vehicle at all times' : 'এই টোকেন সবসময় আপনার যানবাহনের সাথে রাখুন'}
                          </p>
                        </>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tax Token Renewal Modal */}
            <TaxTokenRenewalModal
              open={showTaxTokenRenewalModal}
              onClose={() => {
                setShowTaxTokenRenewalModal(false);
                setRenewalVehicle(null);
              }}
              vehicle={renewalVehicle}
              language={language}
              onSuccess={() => {
                setShowTaxTokenRenewalModal(false);
                setRenewalVehicle(null);
                fetchRegisteredVehicles();
                toast.success(
                  language === 'en' 
                    ? 'Tax token renewal initiated. Complete the payment.' 
                    : 'ট্যাক্স টোকেন নবায়ন শুরু হয়েছে। পেমেন্ট সম্পূর্ণ করুন।'
                );
              }}
            />
          </div>
        );

      case 'calculator':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
              <Calculator size={32} weight="duotone" className="text-primary" />
              {t.costCalculator}
            </h2>
            <EmbeddedCalculator />
          </div>
        );

      case 'questionbank':
        return <QuestionBank />;

      case 'violations':
        return <UserViolations />;

      case 'routepermits':
        return <RoutePermitsInDashboard />;

      case 'ownership':
        return <UserOwnershipTransfers user={user} onOpenModal={() => setShowOwnershipTransferModal(true)} />;

      case 'myreports':
        return <MyReportsContent />;

      case 'settings':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{t.settings}</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-6">
              {/* Change Password */}
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{language === 'en' ? 'Change Password' : 'পাসওয়ার্ড পরিবর্তন করুন'}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'Update your account password.' : 'আপনার অ্যাকাউন্টের পাসওয়ার্ড আপডেট করুন।'}</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-semibold shadow-md hover:bg-primary-dark transition-colors"
                >
                  {language === 'en' ? 'Change' : 'পরিবর্তন'}
                </motion.button>
              </div>
              
              {/* Change Phone Number */}
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{language === 'en' ? 'Change Phone Number' : 'ফোন নম্বর পরিবর্তন করুন'}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{language === 'en' ? 'Update your phone number.' : 'আপনার ফোন নম্বর আপডেট করুন।'}</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => setShowPhoneModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-semibold shadow-md hover:bg-primary-dark transition-colors"
                >
                  {language === 'en' ? 'Change' : 'পরিবর্তন'}
                </motion.button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state while user data is being fetched
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {language === 'en' ? 'Loading your dashboard...' : 'আপনার ড্যাশবোর্ড লোড হচ্ছে...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dashboard-overview">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ willChange: 'transform' }}>
        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", repeatType: "loop" }}
          className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          style={{ transform: 'translateZ(0)' }}
        />
        <motion.div
          animate={{ 
            x: [0, -50, 0],
            y: [0, 100, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear", repeatType: "loop" }}
          className="absolute bottom-20 left-10 w-80 h-80 bg-green-500/5 rounded-full blur-3xl"
          style={{ transform: 'translateZ(0)' }}
        />
      </div>

      {/* Top Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <List size={24} weight="bold" />
            </motion.button>
            <div className="flex items-center gap-3">
              <img src="/brta.png" alt="BRTA Logo" className="h-10 w-10" />
              <div>
                <h1 className="text-xl font-bold text-primary dark:text-green-400">BRTA 2.0</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t.dashboard}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative p-2 rounded-full hover:bg-primary/10 transition"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
            >
              <Bell size={24} className="text-primary" />
              {notifications && notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                  {notifications.filter(n => !n.is_read).length > 99 ? '99+' : notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
            <ThemeLanguageToggler />
          </div>
        </div>

        {/* Notifications Dropdown */}
        <AnimatePresence>
          {showNotifications && (
            <>
              {/* Backdrop to close on click */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute right-6 top-20 w-96 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bell size={20} className="text-primary dark:text-green-400" />
                      <span className="font-bold text-lg text-gray-800 dark:text-white">
                        {language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}
                      </span>
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                          {notifications.filter(n => !n.is_read).length > 99 ? '99+' : notifications.filter(n => !n.is_read).length}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigate('/notifications');
                        setShowNotifications(false);
                      }}
                      className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary dark:text-green-400 font-semibold rounded-lg transition-colors text-sm"
                    >
                      {language === 'en' ? 'See All' : 'সব দেখুন'}
                    </button>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="flex-1 px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold rounded-lg transition-colors text-sm"
                      >
                        {language === 'en' ? 'Mark All Read' : 'সব পঠিত করুন'}
                      </button>
                    )}
                  </div>
                </div>
                
                <ul className="space-y-2 max-h-96 overflow-y-auto p-4">
                  {notifications.length === 0 ? (
                    <li className="text-center py-8">
                      <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" weight="duotone" />
                      <p className="text-gray-400 dark:text-gray-500">
                        {language === 'en' ? 'No new notifications' : 'কোনো নতুন বিজ্ঞপ্তি নেই'}
                      </p>
                    </li>
                  ) : (
                    notifications.slice(0, 10).map((note) => (
                      <motion.li 
                        key={note.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative rounded-lg px-3 py-3 shadow-sm text-gray-800 dark:text-gray-200 text-sm transition-all group ${
                          note.is_read 
                            ? 'bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 opacity-75'
                            : 'bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 hover:bg-primary/10 dark:hover:bg-primary/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 cursor-pointer" onClick={() => {
                            if (!note.is_read) markNotificationAsRead(note.id);
                            setActiveTab('license');
                            setShowNotifications(false);
                          }}>
                            <div className="font-semibold text-primary dark:text-green-400 mb-1 flex items-center gap-2">
                              {language === 'en' ? note.title_en : note.title_bn}
                              {!note.is_read && (
                                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                              )}
                            </div>
                            <div className={`line-clamp-2 ${note.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {language === 'en' ? note.message_en : note.message_bn}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(note.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          {!note.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(note.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-all"
                              title={language === 'en' ? 'Mark as read' : 'পঠিত চিহ্নিত করুন'}
                            >
                              <Eye size={16} className="text-green-600" weight="duotone" />
                            </button>
                          )}
                        </div>
                      </motion.li>
                    ))
                  )}
                </ul>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="flex pt-20">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-20 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-xl overflow-hidden z-40 flex flex-col"
            >
              <nav className="flex-1 overflow-y-auto p-6 pb-2">
                <div className="space-y-2">
                  {menuItems.map((item) => (
                    <motion.button
                      key={item.id}
                      id={item.tourId}
                      whileHover={{ x: 10 }}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === item.id
                          ? 'bg-primary text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {item.icon}
                      <span className="font-semibold">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </nav>

              {/* Logout Button */}
              <div className="p-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-danger hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-semibold transition-all"
                >
                  <SignOut size={24} weight="bold" />
                  {t.logout}
                </motion.button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`flex-1 p-8 transition-all ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>

      {/* New Application Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <NewApplicationModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            language={language}
            onSuccess={fetchLicenseApplications}
          />
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                {language === 'en' ? 'Change Password' : 'পাসওয়ার্ড পরিবর্তন করুন'}
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'Current Password' : 'বর্তমান পাসওয়ার্ড'}
                  </label>
                  <input
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:text-white outline-none"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'New Password' : 'নতুন পাসওয়ার্ড'}
                  </label>
                  <input
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:text-white outline-none"
                    required
                  />
                  {/* Password Strength Meter */}
                  {passwordData.new && (
                    <div className="mt-2">
                      <PasswordStrengthMeter password={passwordData.new} language={language} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'Confirm New Password' : 'নতুন পাসওয়ার্ড নিশ্চিত করুন'}
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:text-white outline-none"
                    required
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {language === 'en' ? 'Cancel' : 'বাতিল'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? (language === 'en' ? 'Updating...' : 'আপডেট হচ্ছে...') : (language === 'en' ? 'Update' : 'আপডেট')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phone Change Modal */}
      <AnimatePresence>
        {showPhoneModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPhoneModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                {language === 'en' ? 'Change Phone Number' : 'ফোন নম্বর পরিবর্তন করুন'}
              </h3>
              <form onSubmit={handleChangePhone}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'en' ? 'New Phone Number' : 'নতুন ফোন নম্বর'}
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:text-white outline-none"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {language === 'en' ? 'Cancel' : 'বাতিল'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? (language === 'en' ? 'Updating...' : 'আপডেট হচ্ছে...') : (language === 'en' ? 'Update' : 'আপডেট')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Renewal Payment Modal */}
      <AnimatePresence>
        {showRenewalModal && renewalLicense && (
          <RenewalPaymentModal
            open={showRenewalModal}
            onClose={() => {
              setShowRenewalModal(false);
              setRenewalLicense(null);
            }}
            license={renewalLicense}
            language={language}
            onSuccess={() => {
              setShowRenewalModal(false);
              setRenewalLicense(null);
              fetchLicenses();
              toast.success(
                language === 'en' 
                  ? 'License renewal initiated. Complete the payment.' 
                  : 'লাইসেন্স নবায়ন শুরু হয়েছে। পেমেন্ট সম্পূর্ণ করুন।'
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* Vehicle Registration Modal */}
      <VehicleRegistrationModal
        isOpen={showVehicleRegistrationModal}
        onClose={() => setShowVehicleRegistrationModal(false)}
        user={user}
        onSuccess={() => {
          fetchRegisteredVehicles();
          toast.success(
            language === 'en'
              ? 'Vehicle registration initiated!'
              : 'যানবাহন নিবন্ধন শুরু হয়েছে!'
          );
        }}
      />

      {/* Ownership Transfer Modal */}
      <OwnershipTransferModal
        isOpen={showOwnershipTransferModal}
        onClose={() => setShowOwnershipTransferModal(false)}
        user={user}
        registeredVehicles={registeredVehicles}
        onSuccess={() => {
          toast.success(
            language === 'en'
              ? 'Ownership transfer application submitted!'
              : 'মালিকানা হস্তান্তর আবেদন জমা হয়েছে!'
          );
        }}
      />

      {/* Chatbot Widget */}
      <ChatbotWidget user={user} userProfile={profile} />

      {/* Welcome Tour */}
      {showTour && (
        <WelcomeTour
          onComplete={() => {
            setShowTour(false);
            toast.success(
              language === 'en'
                ? '🎉 Tour completed! Start exploring your dashboard.'
                : '🎉 ট্যুর সম্পূর্ণ! আপনার ড্যাশবোর্ড অন্বেষণ শুরু করুন।',
              { duration: 4000 }
            );
          }}
          onSkip={() => {
            setShowTour(false);
          }}
        />
      )}

      {/* Notification Panel removed. Now only the notification bell in the header is used. */}
    </div>
  );
};

export default UserDashboard;
