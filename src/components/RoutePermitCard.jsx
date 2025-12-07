import { motion } from 'framer-motion';
import { MapPin, Calendar, CurrencyDollar, FileText, DownloadSimple, Eye, CheckCircle, XCircle, Clock } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import QRCode from 'qrcode';
import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function RoutePermitCard({ permit, vehicle, onViewDocument }) {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    generateQRCode();
  }, [permit]);

  const generateQRCode = async () => {
    try {
      const verifyUrl = `${window.location.origin}/verify-route-permit/${permit.permit_number}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#006A4E',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('QR generation error:', error);
    }
  };

  const downloadPermit = async () => {
    const cardElement = document.getElementById(`route-permit-card-${permit.id}`);
    if (!cardElement) return;

    try {
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Route_Permit_${permit.permit_number}.pdf`);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const getStatusBadge = () => {
    switch (permit.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
            <CheckCircle size={16} weight="fill" />
            {isEnglish ? 'Active' : 'সক্রিয়'}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-semibold">
            <Clock size={16} weight="fill" />
            {isEnglish ? 'Pending Review' : 'পর্যালোচনা মুলতুবি'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
            <XCircle size={16} weight="fill" />
            {isEnglish ? 'Rejected' : 'প্রত্যাখ্যাত'}
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold">
            <XCircle size={16} weight="fill" />
            {isEnglish ? 'Expired' : 'মেয়াদোত্তীর্ণ'}
          </span>
        );
      default:
        return null;
    }
  };

  const isExpired = permit.status === 'expired' || (permit.expiry_date && new Date(permit.expiry_date) < new Date());
  const canDownload = permit.status === 'approved' && !isExpired;

  return (
    <div className="space-y-4">
      {/* Card for Download/Print */}
      <div
        id={`route-permit-card-${permit.id}`}
        className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white p-8 rounded-2xl shadow-2xl relative overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'url(/brta.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-white/30">
            <h1 className="text-3xl font-bold mb-1">{isEnglish ? 'ROUTE PERMIT' : 'রুট পারমিট'}</h1>
            <p className="text-sm opacity-90">{isEnglish ? 'Bangladesh Road Transport Authority' : 'বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ'}</p>
          </div>

          {/* Permit Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                {isEnglish ? 'Permit Number' : 'পারমিট নম্বর'}
              </p>
              <p className="text-lg font-bold">{permit.permit_number}</p>
            </div>
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                {isEnglish ? 'Status' : 'অবস্থা'}
              </p>
              <p className="text-lg font-bold">
                {permit.status === 'approved' ? (isEnglish ? 'ACTIVE' : 'সক্রিয়') : permit.status.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                {isEnglish ? 'Vehicle' : 'যানবাহন'}
              </p>
              <p className="text-base font-bold">
                {isEnglish ? vehicle?.registration_plate?.en : vehicle?.registration_plate?.bn}
              </p>
              <p className="text-xs opacity-90">{vehicle?.vehicle_name} {vehicle?.model}</p>
            </div>
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                {isEnglish ? 'Owner' : 'মালিক'}
              </p>
              <p className="text-base font-bold">
                {isEnglish ? vehicle?.owner_name_en : vehicle?.owner_name_bn}
              </p>
            </div>
          </div>

          {/* Route */}
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs opacity-80 mb-1">{isEnglish ? 'From' : 'থেকে'}</p>
                <p className="font-bold text-lg">{isEnglish ? permit.route_from_en : permit.route_from_bn}</p>
              </div>
              <MapPin size={32} weight="duotone" className="mx-4 opacity-80" />
              <div className="flex-1 text-right">
                <p className="text-xs opacity-80 mb-1">{isEnglish ? 'To' : 'পর্যন্ত'}</p>
                <p className="font-bold text-lg">{isEnglish ? permit.route_to_en : permit.route_to_bn}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/30 flex justify-between items-center text-sm">
              <span>{isEnglish ? 'Distance' : 'দূরত্ব'}: {permit.distance_km} {isEnglish ? 'km' : 'কিমি'}</span>
              <span>{isEnglish ? 'Duration' : 'সময়কাল'}: {permit.permit_days} {isEnglish ? 'days' : 'দিন'}</span>
            </div>
          </div>

          {/* Validity */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                {isEnglish ? 'Issue Date' : 'ইস্যুর তারিখ'}
              </p>
              <p className="text-base font-bold">
                {permit.issue_date ? new Date(permit.issue_date).toLocaleDateString(isEnglish ? 'en-GB' : 'bn-BD') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                {isEnglish ? 'Expiry Date' : 'মেয়াদ শেষের তারিখ'}
              </p>
              <p className="text-base font-bold">
                {permit.expiry_date ? new Date(permit.expiry_date).toLocaleDateString(isEnglish ? 'en-GB' : 'bn-BD') : 'N/A'}
              </p>
            </div>
          </div>

          {/* QR Code */}
          {qrCodeUrl && permit.status === 'approved' && (
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl">
                <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                <p className="text-xs text-gray-600 text-center mt-2">
                  {isEnglish ? 'Scan to Verify' : 'যাচাই করতে স্ক্যান করুন'}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/30 text-center text-xs opacity-80">
            <p>{isEnglish ? 'This is a digitally generated permit. Valid only during the specified period.' : 'এটি একটি ডিজিটাল পারমিট। নির্দিষ্ট সময়ের মধ্যে শুধুমাত্র বৈধ।'}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {permit.status === 'approved' && !isExpired && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadPermit}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <DownloadSimple size={24} weight="bold" />
            {isEnglish ? 'Download Permit' : 'পারমিট ডাউনলোড করুন'}
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onViewDocument(permit.reason_document_url)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
        >
          <Eye size={24} weight="bold" />
          {isEnglish ? 'View Document' : 'ডকুমেন্ট দেখুন'}
        </motion.button>
      </div>

      {/* Rejection Reason (if rejected) */}
      {permit.status === 'rejected' && permit.rejection_reason_en && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl">
          <h4 className="font-bold text-red-800 dark:text-red-300 mb-2">
            {isEnglish ? 'Rejection Reason' : 'প্রত্যাখ্যানের কারণ'}
          </h4>
          <p className="text-red-700 dark:text-red-400">
            {isEnglish ? permit.rejection_reason_en : permit.rejection_reason_bn}
          </p>
        </div>
      )}

      {/* Expired Notice */}
      {isExpired && permit.status === 'expired' && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border-l-4 border-gray-500 p-4 rounded-r-xl">
          <h4 className="font-bold text-gray-800 dark:text-gray-300 mb-2">
            {isEnglish ? 'Permit Expired' : 'পারমিট মেয়াদোত্তীর্ণ'}
          </h4>
          <p className="text-gray-700 dark:text-gray-400">
            {isEnglish 
              ? 'This permit has expired and cannot be renewed. Please apply for a new route permit if needed.'
              : 'এই পারমিটের মেয়াদ শেষ হয়ে গেছে এবং নবায়ন করা যাবে না। প্রয়োজনে নতুন রুট পারমিটের জন্য আবেদন করুন।'}
          </p>
        </div>
      )}
    </div>
  );
}
