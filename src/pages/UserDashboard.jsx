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
  Sparkle
} from 'phosphor-react';
import { useLanguage, useDownload } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import NewApplicationModal from '../components/NewApplicationModalEnhanced';
import ThemeLanguageToggler from '../components/ThemeLanguageToggler';
import EmbeddedCalculator from '../components/EmbeddedCalculator';
import QuestionBank from './QuestionBank';
import UserPayments from './UserPayments.jsx';
import ProgressTracker from '../components/ProgressTracker';
import LicenseCard from '../components/LicenseCard';
import RenewalPaymentModal from '../components/RenewalPaymentModal';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { signOut, updatePassword, updateEmail, updatePhone, user } = useAuth();
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
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [licenseApplications, setLicenseApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [licenses, setLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [generatingLicense, setGeneratingLicense] = useState(false);

  // Fetch real license applications
  useEffect(() => {
    if (user) {
      fetchLicenseApplications();
      fetchNotifications();
      fetchLicenses();
      
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

      return () => {
        notificationSubscription.unsubscribe();
        applicationSubscription.unsubscribe();
        examBookingSubscription.unsubscribe();
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
        .order('created_at', { ascending: false })
        .limit(10);

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
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : `${window.location.protocol}//${window.location.hostname}:5000`;

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
    if (passwordData.new.length < 6) {
      toast.error(language === 'en' ? 'Password must be at least 6 characters' : 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
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
    // Get current URL (localhost or network)
    const baseUrl = window.location.origin;
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
                  .map(([key, value]) => `
                  <div class="field ${key.includes('Plate') || key.includes('Model') || key.includes('Name') ? 'full' : ''}">
                    <div class="label">${key.replace(/_/g, ' ').toUpperCase()}</div>
                    <div class="value">${value}</div>
                  </div>
                `).join('')}
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
                  <div class="value" style="font-size: 12px; line-height: 1.4;">${cardData.address || cardData['Address'] || 'N/A'}</div>
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
            <img src="${generateQRCode(Object.values(tokenData).join('|'))}" alt="QR Code" />
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

  const handleShowTaxToken = useCallback((e) => {
    const id = e.currentTarget.dataset.vid;
    setShowTaxToken(id ? parseInt(id, 10) : null);
  }, []);

  const menuItems = [
    { id: 'license', icon: <IdentificationCard size={24} weight="duotone" />, label: t.licenseApplication },
    { id: 'vehicle', icon: <Car size={24} weight="duotone" />, label: t.vehicleRegistration },
    { id: 'questionbank', icon: <BookOpen size={24} weight="duotone" />, label: language === 'en' ? 'Question Bank' : 'প্রশ্ন ব্যাংক' },
    { id: 'calculator', icon: <Calculator size={24} weight="duotone" />, label: t.costCalculator },
    // Removed 'dlpayment' tab. Payment is now only in Progress Tracker.
    { id: 'payments', icon: <CreditCard size={24} weight="duotone" />, label: t.myPayments },
    { id: 'profile', icon: <User size={24} weight="duotone" />, label: t.profile },
    { id: 'settings', icon: <Gear size={24} weight="duotone" />, label: t.settings },
  ];

  const vehicles = [
    { id: 1, model: 'Toyota Corolla', plate: 'ঢাকা মেট্রো-গ-১২৩৪৫৬', year: '2022', status: 'Active' },
    { id: 2, model: 'Honda Civic', plate: 'ঢাকা মেট্রো-খ-৭৮৯০১২', year: '2021', status: 'Active' },
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
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {language === 'en' ? 'Loading applications...' : 'আবেদন লোড হচ্ছে...'}
                  </p>
                </div>
              ) : licenseApplications.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <IdentificationCard size={64} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    {language === 'en' ? 'No applications yet. Start your first one!' : 'এখনও কোনো আবেদন নেই। প্রথমটি শুরু করুন!'}
                  </p>
                </div>
              ) : (
                licenseApplications.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
                  >
                    <ProgressTracker application={app} />
                  </motion.div>
                ))
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
                className="bg-primary text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {language === 'en' ? '+ Register Vehicle' : '+ যানবাহন নিবন্ধন'}
              </motion.button>
            </div>
            <div className="grid gap-4">
              {vehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                        <Car size={32} weight="duotone" className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">{vehicle.model}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'Plate:' : 'প্লেট:'} {vehicle.plate}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {language === 'en' ? 'Year:' : 'বছর:'} {vehicle.year}
                        </p>
                      </div>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
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
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {language === 'en' ? 'Loading licenses...' : 'লাইসেন্স লোড হচ্ছে...'}
                  </p>
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
              <div className="grid md:grid-cols-2 gap-6">
                {vehicles.map((vehicle, index) => (
                  <div key={vehicle.id} className="space-y-3">
                    {/* Vehicle Smart Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05, duration: 0.3, ease: 'easeOut' }}
                      className="relative"
                      style={{ 
                        transformStyle: 'preserve-3d',
                        willChange: 'transform'
                      }}
                    >
                      {/* Front Side */}
                      <div className={`${flippedVehicles[vehicle.id] ? 'hidden' : 'block'} bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden min-h-[450px] flex flex-col`}>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                        
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-xs opacity-90 uppercase tracking-wider mb-1">{language === 'en' ? 'Bangladesh Road Transport Authority' : 'বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ'}</p>
                              <h4 className="text-xl font-bold">{language === 'en' ? 'Vehicle Smart Card' : 'যানবাহন স্মার্ট কার্ড'}</h4>
                            </div>
                            <img src="/brta.png" alt="BRTA" className="h-12 w-12 bg-white/20 rounded-lg p-2 backdrop-blur-sm" />
                          </div>
                          
                          <div className="grid grid-cols-[100px_1fr] gap-4 mb-4">
                            {/* User Photo */}
                            <div>
                              <div className="w-24 h-28 bg-white/20 backdrop-blur-sm rounded-lg overflow-hidden border-2 border-white/40">
                                <div className="w-full h-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center">
                                  <User size={40} weight="duotone" className="text-white/60" />
                                </div>
                              </div>
                              <p className="text-xs text-center mt-1 opacity-80">{language === 'en' ? 'Owner' : 'মালিক'}</p>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Vehicle Model' : 'মডেল'}</p>
                                <p className="text-base font-bold">{vehicle.model}</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Registration Plate' : 'প্লেট নম্বর'}</p>
                                <p className="text-lg font-bold tracking-wider">{vehicle.plate}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Year' : 'বছর'}</p>
                              <p className="font-bold">{vehicle.year}</p>
                            </div>
                            <div>
                              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Card No.' : 'কার্ড নং'}</p>
                              <p className="font-bold">VC-{vehicle.id.toString().padStart(6, '0')}</p>
                            </div>
                            <div>
                              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Owner' : 'মালিকের নাম'}</p>
                              <p className="font-bold">John Doe</p>
                            </div>
                            <div>
                              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Status' : 'অবস্থা'}</p>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${vehicle.status === 'Active' ? 'bg-green-500/30 border border-green-300' : 'bg-red-500/30 border border-red-300'}`}>
                                {vehicle.status}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-3 border-t border-white/30">
                            <p className="text-xs opacity-80 mb-3">{language === 'en' ? 'Issued:' : 'ইস্যু:'} 10/03/{vehicle.year}</p>
                            <div className="flex gap-2 mb-2">
                              <motion.button
                                data-vid={vehicle.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleToggleVehicleFlip}
                                className="flex-1 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5"
                              >
                                <ArrowsClockwise size={16} />
                                {language === 'en' ? 'Flip' : 'উল্টান'}
                              </motion.button>
                              <motion.button
                                data-vid={vehicle.id}
                                data-plate={vehicle.plate}
                                data-model={vehicle.model}
                                data-year={vehicle.year}
                                data-status={vehicle.status}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleDownloadCard}
                                className="flex-1 px-3 py-2 bg-white text-blue-600 hover:bg-white/90 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5"
                              >
                                <DownloadSimple size={16} />
                                {language === 'en' ? 'Download' : 'ডাউনলোড'}
                              </motion.button>
                            </div>
                            <motion.button
                              data-vid={vehicle.id}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleShowTaxToken}
                              className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5"
                            >
                              <CreditCard size={16} />
                              {language === 'en' ? 'Tax Token' : 'ট্যাক্স টোকেন'}
                            </motion.button>
                          </div>
                        </div>
                      </div>

                      {/* Back Side */}
                      <div className={`${!flippedVehicles[vehicle.id] ? 'hidden' : 'block'} bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden min-h-[450px] flex flex-col`}>
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                        </div>
                        
                        <div className="relative z-10">
                          <h4 className="text-xl font-bold mb-6 text-center">{language === 'en' ? 'Vehicle Details' : 'যানবাহনের বিবরণ'}</h4>
                          
                          <div className="flex justify-center items-center gap-6 mb-6">
                            {/* QR Code */}
                            <div className="bg-white p-4 rounded-xl">
                              <img 
                                src={generateQRCode(`VC-${vehicle.id}|${vehicle.plate}|${vehicle.model}|${vehicle.year}`)} 
                                alt="QR Code" 
                                className="w-36 h-36"
                              />
                              <p className="text-xs text-center mt-2 text-gray-800 font-semibold">{language === 'en' ? 'Scan to Verify' : 'যাচাই করুন'}</p>
                            </div>
                            
                            {/* Details */}
                            <div className="space-y-2.5 text-sm">
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Chassis No.' : 'চেসিস নং'}</p>
                                <p className="font-semibold">CH{vehicle.year}{vehicle.id.toString().padStart(8, '0')}</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Engine No.' : 'ইঞ্জিন নং'}</p>
                                <p className="font-semibold">EN{vehicle.year}{vehicle.id.toString().padStart(8, '0')}</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Owner' : 'মালিক'}</p>
                                <p className="font-semibold">John Doe</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-1">{language === 'en' ? 'Fuel Type' : 'জ্বালানি'}</p>
                                <p className="font-semibold">{language === 'en' ? 'Petrol' : 'পেট্রল'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-4 border-t border-white/30">
                            <p className="text-xs opacity-80 text-center mb-3">{language === 'en' ? 'For verification: www.brta.gov.bd' : 'যাচাইয়ের জন্য: www.brta.gov.bd'}</p>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setFlippedVehicles(prev => ({ ...prev, [vehicle.id]: !prev[vehicle.id] }))}
                              className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5"
                            >
                              <ArrowsClockwise size={16} />
                              {language === 'en' ? 'Flip' : 'উল্টান'}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tax Token Modal */}
            <AnimatePresence>
              {showTaxToken && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => setShowTaxToken(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 rounded-2xl shadow-2xl text-white max-w-lg w-full relative overflow-hidden"
                  >
                    <button
                      onClick={() => setShowTaxToken(null)}
                      className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all z-20"
                    >
                      <X size={20} />
                    </button>

                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                    </div>

                    <div className="relative z-10">
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-2">
                          <CreditCard size={28} weight="duotone" />
                        </div>
                        <h3 className="text-xl font-bold">{language === 'en' ? 'Tax Token' : 'ট্যাক্স টোকেন'}</h3>
                        <p className="text-xs opacity-90 mt-1">{language === 'en' ? 'Vehicle Tax Payment Receipt' : 'যানবাহন কর পেমেন্ট রসিদ'}</p>
                      </div>

                      {vehicles.find(v => v.id === showTaxToken) && (
                        <>
                          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
                            <div className="space-y-2.5">
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Vehicle' : 'যানবাহন'}</p>
                                <p className="text-base font-bold">{vehicles.find(v => v.id === showTaxToken).model}</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Registration Plate' : 'প্লেট'}</p>
                                <p className="text-base font-bold tracking-wider">{vehicles.find(v => v.id === showTaxToken).plate}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/30">
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Token No.' : 'টোকেন নং'}</p>
                                  <p className="text-sm font-bold">TT-2025-{showTaxToken.toString().padStart(6, '0')}</p>
                                </div>
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Amount' : 'পরিমাণ'}</p>
                                  <p className="text-lg font-bold">৳ 5,000</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Issue Date' : 'ইস্যুর তারিখ'}</p>
                                  <p className="text-sm font-bold">01/01/2025</p>
                                </div>
                                <div>
                                  <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">{language === 'en' ? 'Valid Until' : 'বৈধ পর্যন্ত'}</p>
                                  <p className="text-sm font-bold">31/12/2025</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* QR Code */}
                          <div className="flex justify-center mb-4">
                            <div className="bg-white p-3 rounded-xl">
                              <img 
                                src={generateQRCode(`TT-2025-${showTaxToken}|${vehicles.find(v => v.id === showTaxToken).plate}|৳5000|31/12/2025`)} 
                                alt="Tax Token QR" 
                                className="w-32 h-32"
                              />
                              <p className="text-xs text-center mt-1 text-gray-800 font-semibold">{language === 'en' ? 'Scan to Verify' : 'যাচাই করুন'}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => downloadTaxTokenAsPDF({
                                'Token No': `TT-2025-${showTaxToken.toString().padStart(6, '0')}`,
                                'Vehicle': vehicles.find(v => v.id === showTaxToken).model,
                                'Registration Plate': vehicles.find(v => v.id === showTaxToken).plate,
                                'Owner Name': 'John Doe',
                                'Driving License No': 'DL-123456789',
                                'Amount': '৳ 5,000',
                                'Issue Date': '01/01/2025',
                                'Valid Until': '31/12/2025',
                                'Status': 'Paid'
                              })}
                              className="flex-1 px-4 py-2.5 bg-white text-green-600 hover:bg-white/90 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                              <DownloadSimple size={18} />
                              {language === 'en' ? 'Download PDF' : 'পিডিএফ ডাউনলোড'}
                            </motion.button>
                          </div>

                          <p className="text-xs text-center mt-4 opacity-80">
                            {language === 'en' ? 'Keep this token with your vehicle at all times' : 'এই টোকেন সবসময় আপনার যানবাহনের সাথে রাখুন'}
                          </p>
                        </>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{notifications.filter(n => !n.is_read).length}</span>
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
                          {notifications.filter(n => !n.is_read).length}
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
                    notifications.map((note) => (
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
              className="fixed left-0 top-20 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-xl p-6 overflow-y-auto z-40"
            >
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
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
              </nav>

              {/* Logout Button */}
              <div className="absolute bottom-6 left-6 right-6">
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

      {/* Notification Panel removed. Now only the notification bell in the header is used. */}
    </div>
  );
};

export default UserDashboard;
