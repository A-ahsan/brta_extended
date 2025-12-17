import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  IdentificationCard, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  Hash,
  Barcode,
  Heartbeat,
  ArrowsClockwise
} from 'phosphor-react';
import toast from 'react-hot-toast';

const PublicLicenseView = () => {
  const { license_number } = useParams();
  const navigate = useNavigate();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    fetchLicense();
  }, [license_number]);

  const fetchLicense = async () => {
    try {
      setLoading(true);
      
      // Get backend URL dynamically - support localhost and network IPs
      const hostname = window.location.hostname;
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://brta-extended.onrender.com';

      console.log('Fetching license from:', `${backendUrl}/api/licenses/${license_number}`);
      
      // Add timeout for iOS - if it takes too long, show helpful error
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(`${backendUrl}/api/licenses/${license_number}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();

        if (data.success) {
          setLicense(data.license);
        } else {
          toast.error('License not found');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          toast.error('Connection timeout - iOS may have SSL certificate issues. Try accessing the site directly in Safari first.', { duration: 6000 });
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching license:', error);
      toast.error(`Failed to fetch license: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'expired':
        return 'text-orange-600 bg-orange-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      case 'revoked':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading license...</p>
        </div>
      </div>
    );
  }

  if (!license) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">License Not Found</h2>
          <p className="text-gray-600 mb-6">The license number you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <ArrowLeft size={20} className="inline mr-2" />
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isExpired = new Date(license.expiry_date) < new Date();
  const isActive = license.status === 'active' && !isExpired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <IdentificationCard size={40} className="text-primary mx-auto mb-3 sm:mb-4 sm:w-12 sm:h-12" />
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 px-2">
            Bangladesh Driving License
          </h1>
          <p className="text-sm sm:text-base text-gray-600">License Verification</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mb-4 sm:mb-6 px-2">
          {isActive ? (
            <div className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-100 text-green-700 rounded-full">
              <CheckCircle size={20} weight="fill" className="sm:w-6 sm:h-6" />
              <span className="font-semibold text-sm sm:text-base">Valid License</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-100 text-red-700 rounded-full">
              <XCircle size={20} weight="fill" className="sm:w-6 sm:h-6" />
              <span className="font-semibold text-sm sm:text-base">
                {isExpired ? 'Expired' : license.status.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* License Card */}
        <motion.div
          className="perspective-1000 mb-4 sm:mb-8 px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
              className="relative w-full preserve-3d cursor-pointer"
              style={{ height: '520px', transformStyle: 'preserve-3d' }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              onClick={() => setFlipped(!flipped)}
            >
            {/* Front of Card */}
            <div
              className="absolute inset-0 w-full h-full backface-hidden"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)'
              }}
            >
              <div className="w-full min-h-full bg-gradient-to-br from-green-600 via-green-500 to-green-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-white relative overflow-hidden">
                {/* Transparent Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <img src="/brta.png" alt="" className="w-48 sm:w-64 h-48 sm:h-64 object-contain" />
                </div>
                {/* Header */}
                <div className="text-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-white/30 relative z-10">
                  <h2 className="text-base sm:text-xl font-bold">BANGLADESH</h2>
                  <p className="text-xs opacity-90">DRIVING LICENSE | ড্রাইভিং লাইসেন্স</p>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-10">
                  {/* Photo */}
                  <div className="col-span-1 flex justify-center sm:block">
                    {license.photo_url ? (
                      <img
                        src={license.photo_url}
                        alt="License Holder"
                        className="w-32 h-40 sm:w-full sm:h-full object-cover rounded-lg border-2 border-white/50"
                      />
                    ) : (
                      <div className="w-32 h-36 sm:w-full sm:h-40 bg-white/20 rounded-lg border-2 sm:border-4 border-white/50 flex items-center justify-center">
                        <User size={32} className="text-white/60 sm:w-12 sm:h-12" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="col-span-1 sm:col-span-2 space-y-2 sm:space-y-3">
                    <div>
                      <p className="text-xs opacity-75">License Number</p>
                      <p className="text-base sm:text-lg font-bold">{license.license_number}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-75">Name</p>
                      <p className="text-sm sm:text-base font-semibold">{license.full_name_en}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <p className="text-xs opacity-75">Date of Birth</p>
                        <p className="text-xs sm:text-sm font-semibold">
                          {new Date(license.date_of_birth).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75">Blood Group</p>
                        <p className="text-xs sm:text-sm font-semibold">{license.blood_group}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <p className="text-xs opacity-75">Gender</p>
                        <p className="text-xs sm:text-sm font-semibold">{license.gender}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <p className="text-xs opacity-75">Type</p>
                        <p className="text-xs sm:text-sm font-semibold">{license.license_type}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75">Category</p>
                        <p className="text-xs sm:text-sm font-semibold">{license.license_category}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validity */}
                <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-white/30 grid grid-cols-2 gap-2 sm:gap-3 text-xs relative z-10">
                  <div>
                    <p className="text-xs opacity-75">Issue Date</p>
                    <p className="font-semibold text-xs sm:text-sm">{new Date(license.issue_date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75">Expiry Date</p>
                    <p className="font-semibold text-xs sm:text-sm">{new Date(license.expiry_date).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>

                {isActive ? (
                  <div className="mt-2 flex items-center justify-center gap-2 bg-green-500/20 border border-green-300/30 rounded-lg px-3 py-1.5 relative z-10">
                    <CheckCircle size={16} weight="fill" />
                    <span className="text-xs font-semibold">Valid License</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-center gap-2 bg-red-500/20 border border-red-300/30 rounded-lg px-3 py-1.5 relative z-10">
                    <span className="text-xs font-semibold">⚠️ License Expired</span>
                  </div>
                )}

                <p className="text-center text-xs mt-2 opacity-75 relative z-10">
                  Tap to flip and see more details
                </p>
              </div>
            </div>

            {/* Back of Card */}
            <div
              className="absolute inset-0 w-full h-full backface-hidden"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="w-full min-h-full bg-gradient-to-br from-green-700 via-green-600 to-green-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-white relative overflow-hidden">
                {/* Transparent Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <img src="/brta.png" alt="" className="w-48 sm:w-64 h-48 sm:h-64 object-contain" />
                </div>
                
                <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-center border-b border-white/30 pb-2 sm:pb-3 relative z-10">
                  License Details
                </h3>

                <div className="flex flex-col items-center space-y-2 sm:space-y-3 relative z-10 mb-3">
                  {/* QR Code */}
                  <div className="bg-white p-2 sm:p-3 rounded-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/license/${license.license_number}`)}`}
                      alt="QR Code" 
                      className="w-24 h-24 sm:w-28 sm:h-28"
                    />
                    <p className="text-xs text-center mt-1 text-gray-800 font-semibold">
                      Scan to Verify
                    </p>
                  </div>

                  {/* License Information - Centered */}
                  <div className="space-y-2 sm:space-y-2.5 text-center max-w-md w-full">
                    <div>
                      <p className="text-xs opacity-75 uppercase tracking-wider mb-1">
                        License Number
                      </p>
                      <p className="text-base sm:text-lg font-bold text-yellow-300">{license.license_number}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-white/30 pt-2">
                      <div>
                        <p className="text-xs opacity-75 uppercase tracking-wider mb-0.5">
                          Type
                        </p>
                        <p className="text-xs sm:text-sm font-semibold">{license.license_type}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75 uppercase tracking-wider mb-0.5">
                          Category
                        </p>
                        <p className="text-xs sm:text-sm font-semibold">{license.license_category}</p>
                      </div>
                    </div>

                    <div className="border-t border-white/30 pt-2">
                      <p className="text-xs opacity-75 uppercase tracking-wider mb-0.5">
                        Address
                      </p>
                      <p className="text-xs sm:text-sm leading-relaxed">{license.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-white/30 pt-2">
                      <div>
                        <p className="text-xs opacity-75 uppercase tracking-wider mb-0.5">
                          Issue Date
                        </p>
                        <p className="text-xs font-semibold">{new Date(license.issue_date).toLocaleDateString('en-GB')}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75 uppercase tracking-wider mb-0.5">
                          Expiry Date
                        </p>
                        <p className="text-xs font-semibold">{new Date(license.expiry_date).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>

                    <div className="border-t border-white/30 pt-2">
                      <p className="text-xs opacity-75 uppercase tracking-wider mb-0.5">
                        Status
                      </p>
                      <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(license.status)}`}>
                        {license.status.toUpperCase()}
                      </span>
                    </div>

                    {isExpired && (
                      <div className="mt-2 p-2 sm:p-3 bg-red-500/20 border border-red-300/30 rounded-lg">
                        <p className="text-xs font-semibold">⚠️ This license has expired</p>
                        <p className="text-xs mt-0.5">Please renew your license to continue driving legally.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Verification Info */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 mx-2">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Verification Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <CheckCircle size={20} className="text-green-500 mt-1 sm:w-6 sm:h-6" weight="fill" />
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-800">Officially Issued</p>
                <p className="text-xs sm:text-sm text-gray-600">This license was issued by BRTA</p>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:gap-3">
              <Calendar size={20} className="text-blue-500 mt-1 sm:w-6 sm:h-6" weight="duotone" />
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-800">
                  {isExpired ? 'Expired' : 'Valid Until'}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {new Date(license.expiry_date).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center px-2">
          <button
            onClick={() => navigate('/')}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-primary to-green-600 text-white text-sm sm:text-base rounded-lg hover:shadow-lg transition-all duration-300"
          >
            <ArrowLeft size={18} className="inline mr-1.5 sm:mr-2 sm:w-5 sm:h-5" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicLicenseView;
