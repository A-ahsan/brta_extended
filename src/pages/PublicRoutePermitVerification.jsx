import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle, XCircle, Car, Calendar, ArrowLeft } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { supabase } from '../lib/supabaseClient';
import QRCode from 'qrcode';

export default function PublicRoutePermitVerification() {
  const { permitNumber } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  const [permit, setPermit] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    fetchPermitDetails();
  }, [permitNumber]);

  const fetchPermitDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching permit:', permitNumber);
      
      // Add timeout for iOS - if it takes too long, show helpful error
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      
      // Fetch permit with timeout
      const fetchPromise = supabase
        .from('route_permits')
        .select('*')
        .eq('permit_number', permitNumber)
        .single();
      
      const { data: permitData, error: permitError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]);

      console.log('Permit data:', permitData);
      console.log('Permit error:', permitError);

      if (permitError) {
        if (permitError.code === 'PGRST116') {
          setError('not_found');
        } else {
          throw permitError;
        }
        return;
      }

      // Check if permit is expired
      if (permitData.status === 'expired' || (permitData.expiry_date && new Date(permitData.expiry_date) < new Date())) {
        permitData.status = 'expired';
      }

      // Fetch vehicle
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('registered_vehicles')
        .select('*')
        .eq('id', permitData.vehicle_id)
        .single();

      console.log('Vehicle data:', vehicleData);

      if (vehicleError) throw vehicleError;

      setPermit(permitData);
      setVehicle(vehicleData);

      // Generate QR code
      const verifyUrl = window.location.href;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#006A4E',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
      
      console.log('Permit set successfully');
    } catch (error) {
      console.error('Error fetching permit:', error);
      if (error.message === 'timeout') {
        setError('timeout');
      } else {
        setError('fetch_failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!permit) return null;

    const isExpired = permit.status === 'expired' || (permit.expiry_date && new Date(permit.expiry_date) < new Date());

    if (isExpired) {
      return {
        icon: <XCircle size={80} weight="fill" className="text-gray-500" />,
        color: 'gray',
        title: isEnglish ? 'Permit Expired' : 'পারমিট মেয়াদোত্তীর্ণ',
        message: isEnglish ? 'This route permit has expired and is no longer valid.' : 'এই রুট পারমিটের মেয়াদ শেষ হয়ে গেছে এবং আর বৈধ নয়।'
      };
    }

    if (permit.status === 'approved') {
      return {
        icon: <CheckCircle size={80} weight="fill" className="text-green-500" />,
        color: 'green',
        title: isEnglish ? 'Valid Permit' : 'বৈধ পারমিট',
        message: isEnglish ? 'This is a valid and active route permit issued by BRTA.' : 'এটি BRTA দ্বারা জারি করা একটি বৈধ এবং সক্রিয় রুট পারমিট।'
      };
    }

    if (permit.status === 'pending') {
      return {
        icon: <XCircle size={80} weight="fill" className="text-yellow-500" />,
        color: 'yellow',
        title: isEnglish ? 'Pending Approval' : 'অনুমোদন মুলতুবি',
        message: isEnglish ? 'This permit is pending admin approval and not yet valid.' : 'এই পারমিট অ্যাডমিন অনুমোদনের জন্য মুলতুবি এবং এখনও বৈধ নয়।'
      };
    }

    return {
      icon: <XCircle size={80} weight="fill" className="text-red-500" />,
      color: 'red',
      title: isEnglish ? 'Invalid Permit' : 'অবৈধ পারমিট',
      message: isEnglish ? 'This permit has been rejected or is not valid.' : 'এই পারমিট প্রত্যাখ্যাত হয়েছে বা বৈধ নয়।'
    };
  };

  const text = {
    loading: isEnglish ? 'Verifying permit...' : 'পারমিট যাচাই করা হচ্ছে...',
    notFound: isEnglish ? 'Permit Not Found' : 'পারমিট পাওয়া যায়নি',
    notFoundDesc: isEnglish ? 'The permit number you entered does not exist in our system.' : 'আপনার প্রবেশ করা পারমিট নম্বর আমাদের সিস্টেমে বিদ্যমান নেই।',
    fetchError: isEnglish ? 'Verification Failed' : 'যাচাইকরণ ব্যর্থ',
    fetchErrorDesc: isEnglish ? 'We could not verify this permit at the moment. Please try again later.' : 'আমরা এই মুহূর্তে এই পারমিট যাচাই করতে পারিনি। পরে আবার চেষ্টা করুন।',
    backHome: isEnglish ? 'Back to Home' : 'হোম এ ফিরুন',
    permitNumber: isEnglish ? 'Permit Number' : 'পারমিট নম্বর',
    vehicle: isEnglish ? 'Vehicle' : 'যানবাহন',
    owner: isEnglish ? 'Owner' : 'মালিক',
    route: isEnglish ? 'Route' : 'রুট',
    from: isEnglish ? 'From' : 'থেকে',
    to: isEnglish ? 'To' : 'পর্যন্ত',
    distance: isEnglish ? 'Distance' : 'দূরত্ব',
    duration: isEnglish ? 'Duration' : 'সময়কাল',
    issueDate: isEnglish ? 'Issue Date' : 'ইস্যুর তারিখ',
    expiryDate: isEnglish ? 'Expiry Date' : 'মেয়াদ শেষের তারিখ',
    status: isEnglish ? 'Status' : 'অবস্থা',
    km: isEnglish ? 'km' : 'কিমি',
    days: isEnglish ? 'days' : 'দিন',
    verifiedBy: isEnglish ? 'Verified by Bangladesh Road Transport Authority' : 'বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ দ্বারা যাচাইকৃত',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{text.loading}</p>
        </div>
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md"
        >
          <XCircle size={80} weight="fill" className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{text.notFound}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{text.notFoundDesc}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} weight="bold" />
            {text.backHome}
          </button>
        </motion.div>
      </div>
    );
  }

  if (error === 'timeout') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md"
        >
          <XCircle size={80} weight="fill" className="text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {isEnglish ? 'Connection Timeout' : 'সংযোগ সময়সীমা'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {isEnglish 
              ? 'The connection is taking longer than expected. This might be due to SSL certificate issues on iOS.'
              : 'সংযোগ প্রত্যাশিত সময়ের চেয়ে বেশি সময় নিচ্ছে। iOS এ SSL সার্টিফিকেট সমস্যার কারণে এটি হতে পারে।'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            {isEnglish
              ? 'Try opening this link in Chrome or Safari after accepting the certificate warning.'
              : 'সার্টিফিকেট সতর্কতা গ্রহণ করার পরে Chrome বা Safari এ এই লিঙ্কটি খুলে দেখুন।'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all mb-3 w-full"
          >
            <ArrowsClockwise size={20} weight="bold" className="inline mr-2" />
            {isEnglish ? 'Try Again' : 'আবার চেষ্টা করুন'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} weight="bold" />
            {text.backHome}
          </button>
        </motion.div>
      </div>
    );
  }

  if (error === 'fetch_failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md"
        >
          <XCircle size={80} weight="fill" className="text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{text.fetchError}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{text.fetchErrorDesc}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} weight="bold" />
            {text.backHome}
          </button>
        </motion.div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <img src="/brta.png" alt="BRTA Logo" className="h-20 w-20 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {isEnglish ? 'Route Permit Verification' : 'রুট পারমিট যাচাইকরণ'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{text.verifiedBy}</p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border-4 ${
            statusInfo.color === 'green' 
              ? 'border-green-500' 
              : statusInfo.color === 'red' 
              ? 'border-red-500'
              : statusInfo.color === 'yellow'
              ? 'border-yellow-500'
              : 'border-gray-500'
          }`}
        >
          <div className="text-center mb-8">
            <div className="mb-4">{statusInfo.icon}</div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {statusInfo.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{statusInfo.message}</p>
          </div>

          {permit && permit.status === 'approved' && (
            <>
              {/* Permit Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {text.permitNumber}
                  </p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {permit.permit_number}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {text.vehicle}
                  </p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {isEnglish ? vehicle?.registration_plate?.en : vehicle?.registration_plate?.bn}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {vehicle?.vehicle_name} {vehicle?.model}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {text.owner}
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {isEnglish ? vehicle?.owner_name_en : vehicle?.owner_name_bn}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {text.distance} / {text.duration}
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {permit.distance_km} {text.km} / {permit.permit_days} {text.days}
                  </p>
                </div>
              </div>

              {/* Route */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-xl mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin size={24} weight="duotone" className="text-primary" />
                  {text.route}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{text.from}</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-white">
                      {isEnglish ? permit.route_from_en : permit.route_from_bn}
                    </p>
                  </div>
                  <MapPin size={40} weight="duotone" className="mx-6 text-primary" />
                  <div className="flex-1 text-right">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{text.to}</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-white">
                      {isEnglish ? permit.route_to_en : permit.route_to_bn}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {text.issueDate}
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {permit.issue_date ? new Date(permit.issue_date).toLocaleDateString(isEnglish ? 'en-GB' : 'bn-BD') : 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {text.expiryDate}
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {permit.expiry_date ? new Date(permit.expiry_date).toLocaleDateString(isEnglish ? 'en-GB' : 'bn-BD') : 'N/A'}
                  </p>
                </div>
              </div>

              {/* QR Code */}
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Footer */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} weight="bold" />
            {text.backHome}
          </button>
        </div>
      </div>
    </div>
  );
}
