import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, MagnifyingGlass, FunnelSimple, CheckCircle, Clock, XCircle, Calendar, CurrencyCircleDollar, DownloadSimple, Eye, Wallet } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import RoutePermitApplicationModalImproved from '../components/RoutePermitApplicationModalImproved';
import axios from 'axios';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function RoutePermitsInDashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEnglish = language === 'en';

  const [permits, setPermits] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchPermits();

      // Subscribe to realtime updates for route permits
      const permitSubscription = supabase
        .channel('route-permits-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'route_permits',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Route permit realtime update:', payload);
            fetchPermits(); // Refetch when any change happens
            
            // Show toast for important updates
            if (payload.eventType === 'UPDATE' && payload.new.status === 'approved') {
              toast.success(isEnglish ? 'Route permit approved!' : 'রুট পারমিট অনুমোদিত!');
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'rejected') {
              toast.error(isEnglish ? 'Route permit rejected' : 'রুট পারমিট প্রত্যাখ্যাত');
            }
          }
        )
        .subscribe();

      return () => {
        permitSubscription.unsubscribe();
      };
    }
  }, [user, isEnglish]);

  const fetchPermits = async () => {
    setLoading(true);
    try {
      const { data: permitsData, error: permitsError } = await supabase
        .from('route_permits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (permitsError) throw permitsError;

      const vehicleIds = [...new Set(permitsData.map(p => p.vehicle_id))];
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('registered_vehicles')
        .select('*')
        .in('id', vehicleIds);

      if (vehiclesError) throw vehiclesError;

      const vehicleMap = {};
      vehiclesData.forEach(v => {
        vehicleMap[v.id] = v;
      });

      setPermits(permitsData || []);
      setVehicles(vehicleMap);
    } catch (error) {
      console.error('Error fetching permits:', error);
      toast.error(isEnglish ? 'Failed to load permits' : 'পারমিট লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (permit) => {
    setPaying(permit.id);
    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: permit.total_fee,
          payment_type: 'route_permit',
          status: 'initiated',
          tran_id: `RP_${permit.permit_number}_${Date.now()}`
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Link payment to permit
      await supabase
        .from('route_permits')
        .update({ payment_id: payment.id })
        .eq('id', permit.id);

      // Initiate SSLCommerz payment
      const response = await axios.post('https://localhost:5000/api/payment/route-permit', {
        payment_id: payment.id,
        amount: permit.total_fee,
        permit_number: permit.permit_number,
        user_name: vehicles[permit.vehicle_id]?.owner_name_en || 'User',
        user_email: user.email,
        frontend_url: window.location.origin
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(isEnglish ? 'Failed to initiate payment' : 'পেমেন্ট শুরু করতে ব্যর্থ');
    } finally {
      setPaying(null);
    }
  };

  const downloadPermitPDF = async (permit) => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(
        `${window.location.origin}/verify-route-permit/${permit.permit_number}`,
        { width: 200, margin: 2 }
      );

      // Load BRTA logo and convert to base64
      const loadImageAsBase64 = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(''); // Return empty if logo fails to load
          img.src = url;
        });
      };

      const logoBase64 = await loadImageAsBase64('/brta.png');
      const vehicle = vehicles[permit.vehicle_id];
      
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast.error(isEnglish ? 'Please allow pop-ups to view PDF' : 'পিডিএফ দেখতে পপ-আপ অনুমোদন করুন');
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Route Permit - ${permit.permit_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: white;
            }
            .card {
              width: 800px;
              margin: 0 auto;
              padding: 40px;
              background: white;
              border: 2px solid #006A4E;
              border-radius: 15px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              position: relative;
            }
            .logo-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 400px;
              height: 400px;
              opacity: 0.05;
              z-index: 0;
            }
            .logo-header {
              width: 70px;
              height: 70px;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 20px;
            }
            .content { position: relative; z-index: 1; }
            .header {
              background: linear-gradient(135deg, #16a34a, #15803d, #006A4E);
              color: white;
              padding: 30px;
              border-radius: 10px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 32px;
              margin-bottom: 8px;
              font-weight: bold;
            }
            .header .permit-number {
              font-size: 18px;
              letter-spacing: 2px;
              margin-bottom: 5px;
            }
            .header .subtitle {
              font-size: 14px;
              opacity: 0.9;
            }
            .qr-section {
              position: absolute;
              top: 200px;
              right: 60px;
              text-align: center;
              background: white;
              padding: 10px;
              border: 2px solid #006A4E;
              border-radius: 10px;
            }
            .qr-section img {
              width: 150px;
              height: 150px;
            }
            .qr-section p {
              margin-top: 8px;
              font-size: 11px;
              color: #666;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 18px;
              color: #006A4E;
              font-weight: bold;
              margin-bottom: 12px;
              padding-bottom: 5px;
              border-bottom: 2px solid #006A4E;
            }
            .field {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .field:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #374151;
              width: 180px;
              flex-shrink: 0;
            }
            .value {
              color: #1f2937;
              flex: 1;
              word-wrap: break-word;
            }
            .value.highlight {
              color: #006A4E;
              font-weight: bold;
              font-size: 16px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
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
                border: 1px solid #ccc;
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
            ${logoBase64 ? `<img src="${logoBase64}" class="logo-watermark" alt="BRTA Logo" />` : ''}
            <div class="content">
              <div class="header">
                <div class="header-content">
                  ${logoBase64 ? `<img src="${logoBase64}" class="logo-header" alt="BRTA Logo" />` : ''}
                  <div>
                    <h1 style="margin: 0;">BRTA ROUTE PERMIT</h1>
                    <div class="permit-number" style="margin-top: 8px;">${permit.permit_number}</div>
                  </div>
                </div>
                <div class="subtitle" style="margin-top: 10px;">Bangladesh Road Transport Authority</div>
              </div>

              <div class="qr-section">
                <img src="${qrCodeDataURL}" alt="QR Code" />
                <p>Scan to Verify</p>
              </div>

              <div class="section">
                <div class="section-title">Vehicle Information</div>
                <div class="field">
                  <div class="label">Vehicle:</div>
                  <div class="value">${vehicle?.vehicle_name || ''} ${vehicle?.model || ''}</div>
                </div>
                <div class="field">
                  <div class="label">Registration:</div>
                  <div class="value highlight">${vehicle?.registration_plate?.en || vehicle?.registration_plate || ''}</div>
                </div>
                <div class="field">
                  <div class="label">Owner:</div>
                  <div class="value">${vehicle?.owner_name_en || ''}</div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Route Information</div>
                <div class="field">
                  <div class="label">Route From:</div>
                  <div class="value">${permit.route_from_en || ''}</div>
                </div>
                <div class="field">
                  <div class="label">Route To:</div>
                  <div class="value">${permit.route_to_en || ''}</div>
                </div>
                <div class="field">
                  <div class="label">Distance:</div>
                  <div class="value">${permit.distance_km} km</div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Permit Details</div>
                <div class="field">
                  <div class="label">Duration:</div>
                  <div class="value">${permit.permit_days} days</div>
                </div>
                <div class="field">
                  <div class="label">Issue Date:</div>
                  <div class="value">${permit.issue_date ? new Date(permit.issue_date).toLocaleDateString('en-GB') : 'N/A'}</div>
                </div>
                <div class="field">
                  <div class="label">Expiry Date:</div>
                  <div class="value">${permit.expiry_date ? new Date(permit.expiry_date).toLocaleDateString('en-GB') : 'N/A'}</div>
                </div>
                <div class="field">
                  <div class="label">Fee Paid:</div>
                  <div class="value highlight">৳ ${permit.total_fee.toLocaleString()}</div>
                </div>
                <div class="field">
                  <div class="label">Status:</div>
                  <div class="value highlight">${permit.status.toUpperCase()}</div>
                </div>
              </div>

              <div class="footer">
                <p>This is a computer-generated document. No signature required.</p>
                <p style="margin-top: 5px;">Generated on: ${new Date().toLocaleString('en-GB')}</p>
                <p style="margin-top: 5px;">Official document of Bangladesh Road Transport Authority</p>
              </div>
            </div>
          </div>
          <button class="print-btn" onclick="window.print()">🖨️ Print Permit</button>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      toast.success(isEnglish ? 'Permit opened in new tab' : 'পারমিট নতুন ট্যাবে খোলা হয়েছে');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(isEnglish ? 'Failed to generate PDF' : 'পিডিএফ তৈরি করতে ব্যর্থ');
    }
  };

  const getStatusBadge = (permit) => {
    if (permit.status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-semibold">
          <XCircle size={14} weight="fill" />
          {isEnglish ? 'Expired' : 'মেয়াদ শেষ'}
        </span>
      );
    } else if (permit.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-semibold">
          <XCircle size={14} weight="fill" />
          {isEnglish ? 'Rejected' : 'প্রত্যাখ্যাত'}
        </span>
      );
    } else if (permit.status === 'approved' && permit.payment_status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-semibold">
          <CheckCircle size={14} weight="fill" />
          {isEnglish ? 'Active' : 'সক্রিয়'}
        </span>
      );
    } else if (permit.status === 'approved' && permit.payment_status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-semibold">
          <CurrencyCircleDollar size={14} weight="fill" />
          {isEnglish ? 'Payment Pending' : 'পেমেন্ট মুলতুবি'}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
          <Clock size={14} weight="fill" />
          {isEnglish ? 'Pending Review' : 'পর্যালোচনা মুলতুবি'}
        </span>
      );
    }
  };

  const filteredPermits = permits.filter(permit => {
    if (filter !== 'all') {
      if (filter === 'active' && (permit.status !== 'approved' || permit.payment_status !== 'completed')) return false;
      if (filter === 'pending' && permit.status !== 'pending') return false;
      if (filter === 'rejected' && permit.status !== 'rejected') return false;
      if (filter === 'expired' && permit.status !== 'expired') return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        permit.permit_number.toLowerCase().includes(term) ||
        permit.route_from_en.toLowerCase().includes(term) ||
        permit.route_to_en.toLowerCase().includes(term)
      );
    }

    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <MapPin size={32} weight="duotone" className="text-primary" />
            {isEnglish ? 'My Route Permits' : 'আমার রুট পারমিট'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isEnglish ? 'Manage your route permits and applications' : 'আপনার রুট পারমিট এবং আবেদন পরিচালনা করুন'}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Plus size={20} weight="bold" />
          {isEnglish ? 'Apply for Permit' : 'পারমিটের জন্য আবেদন করুন'}
        </motion.button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" weight="bold" />
            <input
              type="text"
              placeholder={isEnglish ? 'Search permits...' : 'পারমিট অনুসন্ধান করুন...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'pending', 'rejected', 'expired'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filter === f
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isEnglish 
                  ? f.charAt(0).toUpperCase() + f.slice(1) 
                  : f === 'all' ? 'সব' : f === 'active' ? 'সক্রিয়' : f === 'pending' ? 'মুলতুবি' : f === 'rejected' ? 'প্রত্যাখ্যাত' : 'মেয়াদ শেষ'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Permits List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {isEnglish ? 'Loading permits...' : 'পারমিট লোড হচ্ছে...'}
          </p>
        </div>
      ) : filteredPermits.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <MapPin size={64} weight="duotone" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {isEnglish ? 'No permits found' : 'কোনো পারমিট পাওয়া যায়নি'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isEnglish ? 'Apply for your first route permit to get started!' : 'শুরু করতে আপনার প্রথম রুট পারমিটের জন্য আবেদন করুন!'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            {isEnglish ? 'Apply Now' : 'এখনই আবেদন করুন'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPermits.map((permit) => {
            const vehicle = vehicles[permit.vehicle_id];
            const canPay = permit.status === 'approved' && permit.payment_status === 'pending';
            const isPaid = permit.status === 'approved' && permit.payment_status === 'completed';

            return (
              <motion.div
                key={permit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {permit.permit_number}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {vehicle?.vehicle_name} {vehicle?.model} • {vehicle?.registration_plate.en}
                      </p>
                    </div>
                    {getStatusBadge(permit)}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin size={16} weight="fill" className="text-green-500" />
                      <span>{permit.route_from_en}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin size={16} weight="fill" className="text-red-500" />
                      <span>{permit.route_to_en}</span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                      <span>{permit.distance_km} km</span>
                      <span>•</span>
                      <span>{permit.permit_days} {isEnglish ? 'days' : 'দিন'}</span>
                      <span>•</span>
                      <span className="font-semibold text-primary">৳ {permit.total_fee.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {canPay && (
                      <button
                        onClick={() => handlePayNow(permit)}
                        disabled={paying === permit.id}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Wallet size={18} weight="fill" />
                        {paying === permit.id 
                          ? (isEnglish ? 'Processing...' : 'প্রক্রিয়া করা হচ্ছে...') 
                          : (isEnglish ? `Pay ৳${permit.total_fee.toLocaleString()}` : `৳${permit.total_fee.toLocaleString()} পেমেন্ট করুন`)}
                      </button>
                    )}
                    {isPaid && (
                      <button
                        onClick={() => downloadPermitPDF(permit)}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <DownloadSimple size={18} weight="bold" />
                        {isEnglish ? 'Download PDF' : 'পিডিএফ ডাউনলোড'}
                      </button>
                    )}
                    {permit.status === 'rejected' && permit.rejection_reason_en && (
                      <button
                        onClick={() => setSelectedPermit(permit)}
                        className="flex-1 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all flex items-center justify-center gap-2"
                      >
                        <Eye size={18} weight="bold" />
                        {isEnglish ? 'View Reason' : 'কারণ দেখুন'}
                      </button>
                    )}
                  </div>

                  {permit.status === 'pending' && (
                    <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-3 italic">
                      {isEnglish ? '⏳ Waiting for admin review. Payment required after approval.' : '⏳ অ্যাডমিন পর্যালোচনার জন্য অপেক্ষমাণ। অনুমোদনের পরে পেমেন্ট প্রয়োজন।'}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Application Modal */}
      <RoutePermitApplicationModalImproved
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        user={user}
        onSuccess={fetchPermits}
      />

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {selectedPermit && selectedPermit.status === 'rejected' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPermit(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <XCircle size={24} className="text-red-600 dark:text-red-400" weight="fill" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {isEnglish ? 'Application Rejected' : 'আবেদন প্রত্যাখ্যাত'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedPermit.permit_number}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    {isEnglish ? 'Reason (English)' : 'কারণ (ইংরেজি)'}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    {selectedPermit.rejection_reason_en}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    {isEnglish ? 'Reason (Bengali)' : 'কারণ (বাংলা)'}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    {selectedPermit.rejection_reason_bn}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPermit(null)}
                className="w-full mt-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                {isEnglish ? 'Close' : 'বন্ধ করুন'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
