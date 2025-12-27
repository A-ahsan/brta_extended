import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Warning,
  Lightbulb,
  UploadSimple,
  MapPin,
  Calendar,
  EyeSlash,
  Image as ImageIcon,
  Trash,
  NavigationArrow
} from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const SubmitReportModal = ({ reportType, onClose, onSubmitted }) => {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const t = translations[language] || translations.en;
  const tc = t.community;

  const [formData, setFormData] = useState({
    titleEn: '',
    titleBn: '',
    descriptionEn: '',
    descriptionBn: '',
    locationEn: '',
    locationBn: '',
    incidentDate: '',
    isAnonymous: false
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [gettingLocation, setGettingLocation] = useState(false);

  const isDalal = reportType === 'dalal';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validation
    if (images.length + files.length > 5) {
      toast.error(tc.maxImages);
      return;
    }

    const validFiles = [];
    const validPreviews = [];

    files.forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error(tc.invalidFileType);
        return;
      }

      // Check file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(tc.fileTooBig);
        return;
      }

      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        validPreviews.push(reader.result);
        if (validPreviews.length === validFiles.length) {
          setImagePreviews(prev => [...prev, ...validPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setImages(prev => [...prev, ...validFiles]);
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(language === 'en' ? 'Location not available' : 'অবস্থান পাওয়া যায়নি');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const locationName = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          // Try to translate to Bengali
          let locationBn = '';
          try {
            const translateResponse = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(locationName)}`
            );
            const translateData = await translateResponse.json();
            locationBn = translateData[0]?.[0]?.[0] || '';
          } catch (translateError) {
            console.log('Translation failed, will use empty:', translateError);
          }
          
          setFormData({
            ...formData,
            locationEn: locationName,
            locationBn: locationBn
          });
          
          toast.success(language === 'en' ? 'Location captured!' : 'অবস্থান সংরক্ষিত!');
        } catch (error) {
          console.error('Geocoding error:', error);
          setFormData({
            ...formData,
            locationEn: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
            locationBn: `অক্ষাংশ: ${latitude.toFixed(4)}, দ্রাঘিমাংশ: ${longitude.toFixed(4)}`
          });
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Location error:', error);
        toast.error(language === 'en' ? 'Location failed' : 'অবস্থান ব্যর্থ');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.titleEn.trim()) {
      newErrors.titleEn = tc.titleRequired;
    }
    if (!formData.titleBn.trim()) {
      newErrors.titleBn = tc.titleRequired;
    }
    if (!formData.descriptionEn.trim()) {
      newErrors.descriptionEn = tc.descriptionRequired;
    }
    if (!formData.descriptionBn.trim()) {
      newErrors.descriptionBn = tc.descriptionRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImages = async (reportId) => {
    if (images.length === 0) return [];

    const uploadedUrls = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${reportId}_${Date.now()}_${i}.${fileExt}`;
      const filePath = `${reportId}/${fileName}`;

      try {
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('community-reports')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('community-reports')
          .getPublicUrl(filePath);

        uploadedUrls.push({
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: 'image',
          file_size: file.size,
          display_order: i
        });
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error(language === 'en' ? 'Please fill in all required fields' : 'সকল আবশ্যক ক্ষেত্র পূরণ করুন');
      return;
    }

    setSubmitting(true);

    try {
      // Get user name from profile
      const reporterName = formData.isAnonymous 
        ? 'Anonymous' 
        : (profile?.full_name || profile?.email || 'User');

      // Insert report
      const { data: reportData, error: reportError } = await supabase
        .from('community_reports')
        .insert({
          user_id: user.id,
          reporter_name: reporterName,
          is_anonymous: formData.isAnonymous,
          report_type: reportType,
          title_en: formData.titleEn,
          title_bn: formData.titleBn,
          description_en: formData.descriptionEn,
          description_bn: formData.descriptionBn,
          location_en: formData.locationEn || null,
          location_bn: formData.locationBn || null,
          incident_date: formData.incidentDate || null,
          status: 'pending',
          is_published: false
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload images if any
      if (images.length > 0) {
        const uploadedImages = await uploadImages(reportData.id);
        
        if (uploadedImages.length > 0) {
          const { error: attachmentError } = await supabase
            .from('report_attachments')
            .insert(
              uploadedImages.map(img => ({
                report_id: reportData.id,
                ...img
              }))
            );

          if (attachmentError) {
            console.error('Error saving attachments:', attachmentError);
          }
        }
      }

      // Create notification for admin
      await supabase.from('notifications').insert({
        user_id: user.id,
        recipient_type: 'admin',
        title_en: `New ${isDalal ? 'Dalal Report' : 'Suggestion'} Submitted`,
        title_bn: `নতুন ${isDalal ? 'দালাল রিপোর্ট' : 'পরামর্শ'} জমা দেওয়া হয়েছে`,
        message_en: `${reporterName} submitted a new ${isDalal ? 'dalal report' : 'improvement suggestion'}: "${formData.titleEn}"`,
        message_bn: `${reporterName} একটি নতুন ${isDalal ? 'দালাল রিপোর্ট' : 'উন্নতির পরামর্শ'} জমা দিয়েছেন: "${formData.titleBn}"`,
        notification_type: 'general',
        priority: isDalal ? 'high' : 'normal'
      });

      toast.success(tc.submitSuccess);
      onSubmitted();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(tc.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {isDalal ? (
              <Warning size={32} weight="fill" className="text-danger" />
            ) : (
              <Lightbulb size={32} weight="fill" className="text-primary dark:text-green-400" />
            )}
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {isDalal ? tc.reportDalal : tc.submitSuggestion}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* English Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {tc.title} (English) *
            </label>
            <input
              type="text"
              value={formData.titleEn}
              onChange={(e) => handleChange('titleEn', e.target.value)}
              placeholder={tc.titlePlaceholder}
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                errors.titleEn
                  ? 'border-danger'
                  : 'border-gray-300 dark:border-gray-600 focus:border-primary dark:focus:border-green-400'
              } bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none transition-colors`}
            />
            {errors.titleEn && (
              <p className="text-danger text-sm mt-1">{errors.titleEn}</p>
            )}
          </div>

          {/* Bangla Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {tc.title} (বাংলা) *
            </label>
            <input
              type="text"
              value={formData.titleBn}
              onChange={(e) => handleChange('titleBn', e.target.value)}
              placeholder={tc.titlePlaceholder}
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                errors.titleBn
                  ? 'border-danger'
                  : 'border-gray-300 dark:border-gray-600 focus:border-primary dark:focus:border-green-400'
              } bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none transition-colors`}
            />
            {errors.titleBn && (
              <p className="text-danger text-sm mt-1">{errors.titleBn}</p>
            )}
          </div>

          {/* English Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {tc.description} (English) *
            </label>
            <textarea
              value={formData.descriptionEn}
              onChange={(e) => handleChange('descriptionEn', e.target.value)}
              placeholder={tc.descriptionPlaceholder}
              rows={5}
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                errors.descriptionEn
                  ? 'border-danger'
                  : 'border-gray-300 dark:border-gray-600 focus:border-primary dark:focus:border-green-400'
              } bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none transition-colors resize-none`}
            />
            {errors.descriptionEn && (
              <p className="text-danger text-sm mt-1">{errors.descriptionEn}</p>
            )}
          </div>

          {/* Bangla Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {tc.description} (বাংলা) *
            </label>
            <textarea
              value={formData.descriptionBn}
              onChange={(e) => handleChange('descriptionBn', e.target.value)}
              placeholder={tc.descriptionPlaceholder}
              rows={5}
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                errors.descriptionBn
                  ? 'border-danger'
                  : 'border-gray-300 dark:border-gray-600 focus:border-primary dark:focus:border-green-400'
              } bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none transition-colors resize-none`}
            />
            {errors.descriptionBn && (
              <p className="text-danger text-sm mt-1">{errors.descriptionBn}</p>
            )}
          </div>

          {/* Location (Optional) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <MapPin size={16} weight="fill" />
              {tc.location}
            </label>
            
            {/* Get Current Location Button */}
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="w-full mb-3 px-4 py-2.5 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {gettingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {language === 'en' ? 'Getting Location...' : 'অবস্থান নিচ্ছি...'}
                </>
              ) : (
                <>
                  <NavigationArrow size={18} weight="bold" />
                  {language === 'en' ? 'Use Current Location' : 'বর্তমান অবস্থান ব্যবহার করুন'}
                </>
              )}
            </button>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  {tc.location} (English)
                </label>
              <input
                type="text"
                value={formData.locationEn}
                onChange={(e) => handleChange('locationEn', e.target.value)}
                placeholder={tc.locationPlaceholder}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-primary dark:focus:border-green-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none transition-colors"
              />
            </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  {tc.location} (বাংলা)
                </label>
                <input
                type="text"
                value={formData.locationBn}
                onChange={(e) => handleChange('locationBn', e.target.value)}
                placeholder={tc.locationPlaceholder}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-primary dark:focus:border-green-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none transition-colors"
              />
              </div>
            </div>
          </div>

          {/* Incident Date (for Dalal reports) */}
          {isDalal && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar size={16} weight="fill" />
                {tc.incidentDate}
              </label>
              <input
                type="date"
                value={formData.incidentDate}
                onChange={(e) => handleChange('incidentDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-primary dark:focus:border-green-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <ImageIcon size={16} weight="fill" />
              {tc.uploadImages}
            </label>
            
            {imagePreviews.length < 5 && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary dark:hover:border-green-400 transition-colors bg-gray-50 dark:bg-gray-700">
                <UploadSimple size={32} weight="duotone" className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'en' ? 'Click to upload images' : 'ছবি আপলোড করতে ক্লিক করুন'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 p-2 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash size={16} weight="fill" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <input
              type="checkbox"
              id="anonymous"
              checked={formData.isAnonymous}
              onChange={(e) => handleChange('isAnonymous', e.target.checked)}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary cursor-pointer"
            />
            <label htmlFor="anonymous" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer">
              <EyeSlash size={20} weight="fill" />
              {tc.anonymous}
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {tc.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-6 py-3 rounded-xl font-bold text-white ${
                isDalal
                  ? 'bg-gradient-to-r from-danger to-red-600'
                  : 'bg-gradient-to-r from-primary to-green-600'
              } hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  {language === 'en' ? 'Submitting...' : 'জমা দেওয়া হচ্ছে...'}
                </>
              ) : (
                <>
                  {isDalal ? <Warning size={20} weight="fill" /> : <Lightbulb size={20} weight="fill" />}
                  {tc.submit}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default SubmitReportModal;
