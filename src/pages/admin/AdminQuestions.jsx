import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/AppContext';
import QuestionCard from '../../components/QuestionCard';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { X, Upload } from 'phosphor-react';

export default function AdminQuestions() {
  const { language } = useLanguage();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question_text_en: '',
    question_text_bn: '',
    question_type: 'mcq',
    option_a_en: '',
    option_a_bn: '',
    option_b_en: '',
    option_b_bn: '',
    option_c_en: '',
    option_c_bn: '',
    option_d_en: '',
    option_d_bn: '',
    correct_answer: 'A',
    is_active: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isEnglish = language === 'en';

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error(isEnglish ? 'Failed to load questions' : 'প্রশ্ন লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setFormData({
      question_text_en: '',
      question_text_bn: '',
      question_type: 'mcq',
      option_a_en: '',
      option_a_bn: '',
      option_b_en: '',
      option_b_bn: '',
      option_c_en: '',
      option_c_bn: '',
      option_d_en: '',
      option_d_bn: '',
      correct_answer: 'A',
      is_active: true,
    });
    setImageFile(null);
    setShowAddModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setFormData({
      question_text_en: question.question_text_en,
      question_text_bn: question.question_text_bn,
      question_type: question.question_type,
      option_a_en: question.option_a_en,
      option_a_bn: question.option_a_bn,
      option_b_en: question.option_b_en,
      option_b_bn: question.option_b_bn,
      option_c_en: question.option_c_en,
      option_c_bn: question.option_c_bn,
      option_d_en: question.option_d_en,
      option_d_bn: question.option_d_bn,
      correct_answer: question.correct_answer,
      is_active: question.is_active,
    });
    setImageFile(null);
    setShowAddModal(true);
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm(isEnglish ? 'Are you sure you want to delete this question?' : 'আপনি কি এই প্রশ্নটি মুছে ফেলতে চান?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(isEnglish ? 'Question deleted successfully' : 'প্রশ্ন সফলভাবে মুছে ফেলা হয়েছে');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error(isEnglish ? 'Failed to delete question' : 'প্রশ্ন মুছতে ব্যর্থ');
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `road-signs/${fileName}`;

      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(filePath, imageFile);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = editingQuestion?.image_url || null;

      // Upload image if it's a road sign question and image is provided
      if (formData.question_type === 'road_sign' && imageFile) {
        imageUrl = await uploadImage();
      }

      const questionData = {
        ...formData,
        image_url: imageUrl,
      };

      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast.success(isEnglish ? 'Question updated successfully' : 'প্রশ্ন সফলভাবে আপডেট হয়েছে');
      } else {
        // Add new question
        const { error } = await supabase
          .from('questions')
          .insert([questionData]);

        if (error) throw error;
        toast.success(isEnglish ? 'Question added successfully' : 'প্রশ্ন সফলভাবে যোগ করা হয়েছে');
      }

      setShowAddModal(false);
      fetchQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error(isEnglish ? 'Failed to save question' : 'প্রশ্ন সংরক্ষণ করতে ব্যর্থ');
    } finally {
      setUploading(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filter !== 'all' && q.question_type !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return q.question_text_en.toLowerCase().includes(query) || q.question_text_bn.includes(searchQuery);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEnglish ? 'Question Management' : 'প্রশ্ন ব্যবস্থাপনা'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEnglish 
              ? 'Manage exam questions for driving license applicants'
              : 'ড্রাইভিং লাইসেন্স আবেদনকারীদের জন্য পরীক্ষার প্রশ্ন পরিচালনা করুন'
            }
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddQuestion}
          className="px-6 py-3 bg-gradient-to-r from-primary to-green-600 hover:from-green-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-md transition-all"
        >
          {isEnglish ? '+ Add Question' : '+ প্রশ্ন যোগ করুন'}
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-primary dark:text-green-400">{questions.length}</div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">{isEnglish ? 'Total Questions' : 'মোট প্রশ্ন'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-green-700 dark:text-green-500">
            {questions.filter(q => q.question_type === 'mcq').length}
          </div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">{isEnglish ? 'MCQ Questions' : 'এমসিকিউ প্রশ্ন'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">
            {questions.filter(q => q.question_type === 'road_sign').length}
          </div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">{isEnglish ? 'Road Signs' : 'রোড সাইন'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-teal-600 dark:text-teal-500">
            {questions.filter(q => q.is_active).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">{isEnglish ? 'Active' : 'সক্রিয়'}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder={isEnglish ? 'Search questions...' : 'প্রশ্ন খুঁজুন...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-6 py-3 rounded-lg font-semibold transition-all ${filter === 'all' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {isEnglish ? 'All' : 'সব'}
            </button>
            <button onClick={() => setFilter('mcq')} className={`px-6 py-3 rounded-lg font-semibold transition-all ${filter === 'mcq' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {isEnglish ? 'MCQ' : 'এমসিকিউ'}
            </button>
            <button onClick={() => setFilter('road_sign')} className={`px-6 py-3 rounded-lg font-semibold transition-all ${filter === 'road_sign' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {isEnglish ? 'Road Signs' : 'রোড সাইন'}
            </button>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {isEnglish ? `Showing ${filteredQuestions.length} of ${questions.length} questions` : `${questions.length} টি প্রশ্নের মধ্যে ${filteredQuestions.length} টি দেখানো হচ্ছে`}
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400">{isEnglish ? 'No questions found' : 'কোনো প্রশ্ন পাওয়া যায়নি'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredQuestions.map((question, index) => (
            <motion.div key={question.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <QuestionCard question={question} showAnswer={true} isAdmin={true} onEdit={handleEditQuestion} onDelete={handleDeleteQuestion} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingQuestion ? (isEnglish ? 'Edit Question' : 'প্রশ্ন সম্পাদনা') : (isEnglish ? 'Add New Question' : 'নতুন প্রশ্ন যোগ করুন')}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <X size={24} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Question Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {isEnglish ? 'Question Type' : 'প্রশ্নের ধরন'}
                  </label>
                  <select value={formData.question_type} onChange={(e) => setFormData({ ...formData, question_type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary" required>
                    <option value="mcq">{isEnglish ? 'MCQ' : 'এমসিকিউ'}</option>
                    <option value="road_sign">{isEnglish ? 'Road Sign' : 'রোড সাইন'}</option>
                  </select>
                </div>

                {/* Question Text */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {isEnglish ? 'Question (English)' : 'প্রশ্ন (ইংরেজি)'}
                    </label>
                    <textarea value={formData.question_text_en} onChange={(e) => setFormData({ ...formData, question_text_en: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary" rows="3" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {isEnglish ? 'Question (Bangla)' : 'প্রশ্ন (বাংলা)'}
                    </label>
                    <textarea value={formData.question_text_bn} onChange={(e) => setFormData({ ...formData, question_text_bn: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary" rows="3" required />
                  </div>
                </div>

                {/* Image Upload for Road Signs */}
                {formData.question_type === 'road_sign' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {isEnglish ? 'Upload Road Sign Image' : 'রোড সাইন ছবি আপলোড করুন'}
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-3 bg-primary hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors">
                        <Upload size={20} />
                        <span>{isEnglish ? 'Choose Image' : 'ছবি নির্বাচন করুন'}</span>
                        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" />
                      </label>
                      {imageFile && <span className="text-sm text-gray-600 dark:text-gray-400">{imageFile.name}</span>}
                      {editingQuestion?.image_url && !imageFile && (
                        <a href={editingQuestion.image_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          {isEnglish ? 'View Current Image' : 'বর্তমান ছবি দেখুন'}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Options */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{isEnglish ? 'Answer Options' : 'উত্তরের বিকল্প'}</h4>
                  {['a', 'b', 'c', 'd'].map((option) => (
                    <div key={option} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          {isEnglish ? `Option ${option.toUpperCase()} (English)` : `বিকল্প ${option.toUpperCase()} (ইংরেজি)`}
                        </label>
                        <input type="text" value={formData[`option_${option}_en`]} onChange={(e) => setFormData({ ...formData, [`option_${option}_en`]: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary" required />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          {isEnglish ? `Option ${option.toUpperCase()} (Bangla)` : `বিকল্প ${option.toUpperCase()} (বাংলা)`}
                        </label>
                        <input type="text" value={formData[`option_${option}_bn`]} onChange={(e) => setFormData({ ...formData, [`option_${option}_bn`]: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary" required />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Correct Answer & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {isEnglish ? 'Correct Answer' : 'সঠিক উত্তর'}
                    </label>
                    <select value={formData.correct_answer} onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary" required>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {isEnglish ? 'Status' : 'অবস্থা'}
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary" />
                      <span className="text-gray-900 dark:text-white">{isEnglish ? 'Active' : 'সক্রিয়'}</span>
                    </label>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={uploading} className="flex-1 py-3 bg-gradient-to-r from-primary to-green-600 hover:from-green-700 hover:to-green-700 text-white font-semibold rounded-lg transition-all shadow-md disabled:opacity-50">
                    {uploading ? (isEnglish ? 'Saving...' : 'সংরক্ষণ করা হচ্ছে...') : (editingQuestion ? (isEnglish ? 'Update Question' : 'প্রশ্ন আপডেট করুন') : (isEnglish ? 'Add Question' : 'প্রশ্ন যোগ করুন'))}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                    {isEnglish ? 'Cancel' : 'বাতিল'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
