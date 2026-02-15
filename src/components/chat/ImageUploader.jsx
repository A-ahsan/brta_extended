import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, X, Upload, FileImage } from 'phosphor-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

export default function ImageUploader({ sessionId, onImageUploaded, language, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const isEnglish = language === 'en';

  // Compress image to max 1 MB
  const compressImage = (file, maxSizeKB = 1024) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Try different quality levels to get under maxSizeKB
          let quality = 0.9;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
                  resolve(blob);
                } else {
                  quality -= 0.1;
                  tryCompress();
                }
              },
              'image/jpeg',
              quality
            );
          };

          tryCompress();
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(
        isEnglish
          ? 'Please select a valid image (JPG, PNG, or WEBP)'
          : 'অনুগ্রহ করে একটি বৈধ ছবি নির্বাচন করুন (JPG, PNG, বা WEBP)'
      );
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview || !sessionId) return;

    try {
      setUploading(true);

      // Get file from input
      const file = fileInputRef.current.files[0];
      if (!file) return;

      // Compress image
      const compressedBlob = await compressImage(file);
      const compressedFile = new File(
        [compressedBlob],
        `${Date.now()}_${file.name}`,
        { type: 'image/jpeg' }
      );

      console.log('Original size:', (file.size / 1024).toFixed(2), 'KB');
      console.log('Compressed size:', (compressedFile.size / 1024).toFixed(2), 'KB');

      // Upload to Supabase Storage with simpler path
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (error) {
        console.error('Supabase storage error:', error);
        throw new Error(error.message || 'Upload failed');
      }

      console.log('Upload success:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Call callback with URL
      if (onImageUploaded) {
        onImageUploaded(imageUrl);
      }

      // Reset
      setPreview(null);
      fileInputRef.current.value = '';

      toast.success(
        isEnglish
          ? 'Image uploaded successfully!'
          : 'ছবি সফলভাবে আপলোড হয়েছে!'
      );
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        isEnglish
          ? 'Failed to upload image. Please try again.'
          : 'ছবি আপলোড করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    } finally {
      setUploading(false);
    }
  };

  const cancelPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Upload Button */}
      {!preview && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={isEnglish ? 'Attach image' : 'ছবি সংযুক্ত করুন'}
        >
          <ImageIcon size={20} weight="bold" />
        </motion.button>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
            onClick={cancelPreview}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FileImage size={24} className="text-primary" />
                  {isEnglish ? 'Image Preview' : 'ছবির পূর্বরূপ'}
                </h3>
                <button
                  onClick={cancelPreview}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Image Preview */}
              <div className="p-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto rounded-lg max-h-96 object-contain bg-gray-100 dark:bg-gray-900"
                />
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={cancelPreview}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  {isEnglish ? 'Cancel' : 'বাতিল'}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isEnglish ? 'Uploading...' : 'আপলোড হচ্ছে...'}
                    </>
                  ) : (
                    <>
                      <Upload size={18} weight="bold" />
                      {isEnglish ? 'Send' : 'পাঠান'}
                    </>
                  )}
                </button>
              </div>

              {/* Compression info */}
              <div className="px-4 pb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {isEnglish
                    ? 'Image will be compressed to max 1 MB'
                    : 'ছবি সর্বোচ্চ ১ MB আকারে সংকুচিত হবে'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
