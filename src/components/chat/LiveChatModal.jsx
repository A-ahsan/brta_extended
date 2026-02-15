import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PaperPlaneRight, UserCircle, Image as ImageIcon, CheckCircle } from 'phosphor-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUploader from './ImageUploader';
import RatingModal from './RatingModal';
import toast from 'react-hot-toast';

export default function LiveChatModal({ isOpen, onClose, user, userProfile, language }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [adminTyping, setAdminTyping] = useState(false);
  const [adminJoinNotified, setAdminJoinNotified] = useState(false);
  const [chatStatus, setChatStatus] = useState('pending'); // pending, active, closed
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isEnglish = language === 'en';
  const MAX_IMAGES = 3;

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    setSessionId(null);
    setMessages([]);
    setInputMessage('');
    setAdminInfo(null);
    setAdminTyping(false);
    setAdminJoinNotified(false);
    setChatStatus('pending');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, adminTyping]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);

      // Create new chat session
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          session_type: 'live_chat',
          language: language || 'en',
          status: 'pending',
          user_name: userProfile?.full_name || userProfile?.full_name_en || user?.email?.split('@')[0] || 'User',
          user_email: user?.email || '',
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }

      setSessionId(session.id);
      setChatStatus(session.status);

      // Load existing messages first
      await loadMessages(session.id);

      // Send initial system message
      const systemMessage = isEnglish
        ? '⏳ Your chat request has been received. An admin will join shortly...'
        : '⏳ আপনার চ্যাট অনুরোধ গৃহীত হয়েছে। একজন প্রশাসক শীঘ্রই যোগ দিবেন...';
      
      await sendSystemMessage(session.id, systemMessage);

      // Setup real-time subscriptions
      setupRealtimeSubscriptions(session.id);

      // Check if admin assigned immediately
      if (session.admin_id) {
        fetchAdminInfo(session.admin_id);
        setChatStatus('active');
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      toast.error(
        isEnglish
          ? 'Failed to start chat. Please try again.'
          : 'চ্যাট শুরু করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      const { data: existingMessages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && existingMessages) {
        setMessages(existingMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const setupRealtimeSubscriptions = (sessionId) => {
    // Subscribe to messages
    const messagesChannel = supabase
      .channel(`chat-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new;
          setMessages((prev) => [...prev, newMessage]);

          // Mark as read if from admin
          if (newMessage.sender_type === 'admin') {
            markMessageAsRead(newMessage.id);
          }

          // Play sound notification
          if (newMessage.sender_type === 'admin') {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    // Subscribe to session updates (admin assignment, status changes)
    const sessionChannel = supabase
      .channel(`chat-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedSession = payload.new;
          
          // Admin joined (only notify once)
          if (updatedSession.admin_id && !adminJoinNotified) {
            setAdminJoinNotified(true);
            fetchAdminInfo(updatedSession.admin_id);
            toast.success(
              isEnglish ? 'Admin joined the chat!' : 'প্রশাসক চ্যাটে যোগ দিয়েছেন!'
            );
          }

          // Status changed
          if (updatedSession.status !== chatStatus) {
            setChatStatus(updatedSession.status);
            
            if (updatedSession.status === 'closed') {
              // Show rating modal
              setTimeout(() => {
                setShowRatingModal(true);
              }, 500);
            }
          }

          // Rating added (real-time update)
          if (updatedSession.rating && updatedSession.rating > 0) {
            console.log('Chat rated:', updatedSession.rating, 'stars');
          }
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const indicator = payload.new || payload.old;
          if (indicator && indicator.user_id !== user.id) {
            setAdminTyping(indicator.is_typing || false);
            
            // Clear typing after 3 seconds
            if (indicator.is_typing) {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                setAdminTyping(false);
              }, 3000);
            }
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(typingChannel);
    };
  };

  const fetchAdminInfo = async (adminId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, full_name_en, email')
        .eq('id', adminId)
        .single();

      if (data) {
        setAdminInfo({
          name: data.full_name || data.full_name_en || 'Admin',
          email: data.email,
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin info:', error);
    }
  };

  const sendSystemMessage = async (sessionId, text) => {
    try {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_id: user.id,
        sender_type: 'system',
        sender_name: 'System',
        message_text: text,
      });
    } catch (error) {
      console.error('Failed to send system message:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    try {
      // Send typing indicator off
      await updateTypingIndicator(false);

      // Insert message
      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_id: user.id,
        sender_type: 'user',
        sender_name: userProfile?.full_name || userProfile?.full_name_en || 'User',
        message_text: messageText,
      });

      if (error) throw error;

      // Refocus input
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(
        isEnglish
          ? 'Failed to send message. Please try again.'
          : 'বার্তা পাঠাতে ব্যর্থ। অনুয্রহ করে আবার চেষ্টা করুন।'
      );
      setInputMessage(messageText);
    }
  };

  const handleImageUploaded = async (imageUrl) => {
    if (!sessionId) return;

    try {
      // Send message with image
      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_id: user.id,
        sender_type: 'user',
        sender_name: userProfile?.full_name || userProfile?.full_name_en || 'User',
        attachment_url: imageUrl,
        attachment_type: 'image',
      });

      if (error) throw error;

      setImageCount((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to send image:', error);
      toast.error(
        isEnglish
          ? 'Failed to send image. Please try again.'
          : 'ছবি পাঠাতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    }
  };

  const updateTypingIndicator = async (isTyping) => {
    if (!sessionId) return;

    try {
      await supabase.from('typing_indicators').upsert({
        session_id: sessionId,
        user_id: user.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update typing indicator:', error);
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    updateTypingIndicator(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to false after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingIndicator(false);
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Cannot play sound:', error);
    }
  };

  const handleCloseChat = () => {
    if (chatStatus === 'closed' || !sessionId) {
      onClose();
      return;
    }

    // Show custom confirmation dialog
    setShowCloseConfirm(true);
  };

  const confirmCloseChat = async () => {
    setShowCloseConfirm(false);

    try {
      // Update session status to closed
      await supabase
        .from('chat_sessions')
        .update({
          status: 'closed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Stop typing indicator
      await updateTypingIndicator(false);

      // Show rating modal
      setShowRatingModal(true);
    } catch (error) {
      console.error('Failed to close chat:', error);
      toast.error(
        isEnglish
          ? 'Failed to close chat. Please try again.'
          : 'চ্যাট বন্ধ করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseChat}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
          />

          {/* Chat Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 right-8 w-[450px] h-[650px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[70] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-green-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                    <UserCircle size={32} weight="duotone" className="text-white" />
                  </div>
                  {/* Online indicator */}
                  {chatStatus === 'active' && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">
                    {adminInfo
                      ? adminInfo.name
                      : isEnglish
                      ? 'BRTA Live Chat'
                      : 'BRTA লাইভ চ্যাট'}
                  </h3>
                  <p className="text-white/80 text-xs">
                    {chatStatus === 'pending' && (isEnglish ? 'Connecting...' : 'সংযোগ হচ্ছে...')}
                    {chatStatus === 'active' && adminTyping && (isEnglish ? 'Typing...' : 'টাইপ করছেন...')}
                    {chatStatus === 'active' && !adminTyping && (isEnglish ? 'Online' : 'অনলাইন')}
                    {chatStatus === 'closed' && (isEnglish ? 'Chat ended' : 'চ্যাট শেষ')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseChat}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.sender_type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender_type === 'system' ? (
                    // System message
                    <div className="px-4 py-2 bg-primary/10 dark:bg-primary/20 text-primary dark:text-green-300 rounded-xl text-xs text-center max-w-[80%]">
                      {message.message_text}
                    </div>
                  ) : (
                    // User/Admin message
                    <div
                      className={`flex items-end gap-2 max-w-[80%] ${
                        message.sender_type === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.sender_type === 'user'
                            ? 'bg-primary text-white'
                            : 'bg-green-600 text-white'
                        }`}
                      >
                        {message.sender_name?.charAt(0).toUpperCase() || 'U'}
                      </div>

                      {/* Message Bubble */}
                      <div>
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.sender_type === 'user'
                              ? 'bg-primary text-white rounded-br-none'
                              : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none shadow-md'
                          }`}
                        >
                          {message.attachment_url ? (
                            <img
                              src={message.attachment_url}
                              alt="Attachment"
                              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(message.attachment_url, '_blank')}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                          )}
                        </div>
                        <p
                          className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
                            message.sender_type === 'user' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {adminTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-end gap-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                      {adminInfo?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="px-4 py-3 bg-white dark:bg-gray-700 rounded-2xl rounded-bl-none shadow-md">
                      <div className="flex gap-1">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {chatStatus !== 'closed' && (
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      isEnglish ? 'Type your message...' : 'আপনার বার্তা টাইপ করুন...'
                    }
                    disabled={isLoading || chatStatus === 'pending'}
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                  />

                  {/* Image Upload */}
                  {imageCount < MAX_IMAGES && (
                    <ImageUploader
                      sessionId={sessionId}
                      onImageUploaded={handleImageUploaded}
                      language={language}
                      disabled={isLoading || chatStatus === 'pending'}
                    />
                  )}

                  {/* Send Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim() || chatStatus === 'pending'}
                    className="px-4 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperPlaneRight size={20} weight="bold" />
                  </motion.button>
                </div>

                {/* Image count indicator */}
                {imageCount >= MAX_IMAGES && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2 text-center">
                    {isEnglish
                      ? `Maximum ${MAX_IMAGES} images per chat reached`
                      : `প্রতি চ্যাটে সর্বোচ্চ ${MAX_IMAGES}টি ছবি`}
                  </p>
                )}
              </div>
            )}

            {/* Chat closed message */}
            {chatStatus === 'closed' && (
              <div className="p-4 bg-gray-100 dark:bg-gray-700 text-center">
                <CheckCircle size={32} weight="duotone" className="text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {isEnglish ? 'Chat has ended' : 'চ্যাট শেষ হয়েছে'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isEnglish
                    ? 'Thank you for contacting BRTA'
                    : 'BRTA-তে যোগাযোগ করার জন্য ধন্যবাদ'}
                </p>
              </div>
            )}
          </motion.div>

          {/* Close Confirmation Modal */}
          <AnimatePresence>
            {showCloseConfirm && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
                  onClick={() => setShowCloseConfirm(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[90] overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary to-green-600 p-6 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <X size={32} weight="bold" className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {isEnglish ? 'End Chat?' : 'চ্যাট শেষ করবেন?'}
                    </h3>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-gray-700 dark:text-gray-300 text-center mb-6">
                      {isEnglish
                        ? 'Are you sure you want to end this chat session?'
                        : 'আপনি কি নিশ্চিত যে আপনি এই চ্যাট সেশনটি শেষ করতে চান?'}
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCloseConfirm(false)}
                        className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                      >
                        {isEnglish ? 'Cancel' : 'বাতিল'}
                      </button>
                      <button
                        onClick={confirmCloseChat}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                      >
                        {isEnglish ? 'End Chat' : 'চ্যাট শেষ করুন'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Rating Modal */}
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => {
              setShowRatingModal(false);
              onClose();
            }}
            sessionId={sessionId}
            language={language}
          />
        </>
      )}
    </AnimatePresence>
  );
}
