import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatCircleDots,
  PaperPlaneRight,
  Clock,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Star,
  Image as ImageIcon,
  X,
  ArrowLeft,
  CaretDown,
  Lightning,
  Paperclip,
} from 'phosphor-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/AppContext';

export default function AdminLiveChats({ user }) {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  
  const [activeTab, setActiveTab] = useState('pending');
  const [chats, setChats] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Cannot play sound:', error);
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chats based on tab
  useEffect(() => {
    loadChats();
    const subscription = supabase
      .channel('admin-chats')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_sessions' 
      }, loadChats)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeTab]);

  // Load quick replies
  useEffect(() => {
    loadQuickReplies();
  }, []);

  // Set admin presence
  useEffect(() => {
    if (!user?.id) return;

    const setupPresence = async () => {
      try {
        // Set admin as online
        const { error } = await supabase
          .from('admin_presence')
          .upsert({
            admin_id: user.id,
            is_available: true,
            last_seen: new Date().toISOString(),
            current_active_chats: 0,
            max_concurrent_chats: 5
          });

        if (error) {
          console.error('Error setting admin presence:', error);
        }
      } catch (error) {
        console.error('Failed to setup presence:', error);
      }
    };

    setupPresence();

    // Update presence every 30 seconds
    const interval = setInterval(() => {
      supabase
        .from('admin_presence')
        .update({ 
          last_seen: new Date().toISOString() 
        })
        .eq('admin_id', user.id)
        .then();
    }, 30000);

    // Cleanup: Set offline when component unmounts
    return () => {
      clearInterval(interval);
      supabase
        .from('admin_presence')
        .update({ 
          is_available: false,
          last_seen: new Date().toISOString()
        })
        .eq('admin_id', user.id)
        .then();
    };
  }, [user?.id]);

  const loadQuickReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Quick replies error:', error);
        // Set empty array if table doesn't exist or has errors
        setQuickReplies([]);
      } else {
        setQuickReplies(data || []);
      }
    } catch (error) {
      console.error('Failed to load quick replies:', error);
      setQuickReplies([]);
    }
  };

  const loadChats = async () => {
    let query = supabase
      .from('chat_sessions')
      .select(`
        *,
        chat_messages(count)
      `)
      .eq('session_type', 'live_chat')
      .order('created_at', { ascending: false });

    if (activeTab === 'pending') {
      query = query.eq('status', 'pending').is('admin_id', null);
    } else if (activeTab === 'active') {
      query = query.eq('status', 'active').eq('admin_id', user.id);
    } else if (activeTab === 'closed') {
      query = query.eq('status', 'closed').eq('admin_id', user.id);
    }

    const { data, error } = await query;
    if (!error && data) {
      setChats(data);
    } else if (error) {
      console.error('Error loading chats:', error);
    }

    // Load counts for all tabs
    loadChatCounts();
  };

  const loadChatCounts = async () => {
    // Count pending chats
    const { count: pCount } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('session_type', 'live_chat')
      .eq('status', 'pending')
      .is('admin_id', null);

    // Count active chats for this admin
    const { count: aCount } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('session_type', 'live_chat')
      .eq('status', 'active')
      .eq('admin_id', user.id);

    // Count closed chats for this admin
    const { count: cCount } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('session_type', 'live_chat')
      .eq('status', 'closed')
      .eq('admin_id', user.id);

    setPendingCount(pCount || 0);
    setActiveCount(aCount || 0);
    setClosedCount(cCount || 0);
  };

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    loadMessages();
    loadUserContext();

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel(`chat-messages-${selectedChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${selectedChat.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        
        // Play sound for user messages
        if (payload.new.sender_type === 'user') {
          playNotificationSound();
        }
      })
      .subscribe();

    // Subscribe to typing indicators
    const typingSubscription = supabase
      .channel(`typing-${selectedChat.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `session_id=eq.${selectedChat.id}`
      }, (payload) => {
        if (payload.new?.user_id === selectedChat.user_id && payload.new?.is_typing) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      typingSubscription.unsubscribe();
    };
  }, [selectedChat]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', selectedChat.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      
      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('session_id', selectedChat.id)
        .eq('sender_type', 'user')
        .eq('is_read', false);
    }
  };

  const loadUserContext = async () => {
    if (!selectedChat?.user_id) return;
    
    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedChat.user_id)
        .single();

      if (profileError) console.error('Profile error:', profileError);

      // Fetch user's applications
      const { data: applications} = await supabase
        .from('license_applications')
        .select('*')
        .eq('user_id', selectedChat.user_id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch user's vehicles
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', selectedChat.user_id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch user's violations (only if has vehicles)
      let violations = [];
      if (vehicles && vehicles.length > 0) {
        const { data: viols } = await supabase
          .from('violations')
          .select('*')
          .eq('vehicle_id', vehicles[0].id)
          .order('created_at', { ascending: false })
          .limit(5);
        violations = viols || [];
      }

      setUserContext({
        profile: profile || null,
        applications: applications || [],
        vehicles: vehicles || [],
        violations: violations
      });
    } catch (error) {
      console.error('Error loading user context:', error);
      setUserContext({
        profile: null,
        applications: [],
        vehicles: [],
        violations: []
      });
    }
  };

  // Accept chat
  const handleAcceptChat = async (chat) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({
          admin_id: user.id,
          status: 'active',
          assigned_at: new Date().toISOString()
        })
        .eq('id', chat.id)
        .select()
        .single();

      if (error) {
        console.error('Accept error:', error);
        throw error;
      }

      // Send system message
      await supabase
        .from('chat_messages')
        .insert({
          session_id: chat.id,
          sender_type: 'system',
          sender_id: user.id,
          sender_name: 'System',
          message_text: chat.language === 'bn' 
            ? '✅ প্রশাসক চ্যাটে যোগদান করেছেন'
            : '✅ Admin joined the chat'
        });

      setSelectedChat({ ...chat, admin_id: user.id, status: 'active' });
      await loadChats();
      setActiveTab('active');
      toast.success(isEnglish ? 'Chat accepted' : 'চ্যাট গৃহীত হয়েছে');
      
      // Play notification sound
      playNotificationSound();
    } catch (error) {
      console.error('Error accepting chat:', error);
      toast.error(isEnglish ? 'Failed to accept chat. Please run RLS policies in Supabase.' : 'চ্যাট গ্রহণ করতে ব্যর্থ');
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChat || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: selectedChat.id,
          sender_type: 'admin',
          sender_id: user.id,
          sender_name: user.email || 'Admin',
          message_text: messageText
        });

      if (error) throw error;

      // Update session updated_at
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedChat.id);

    } catch (error) {
      toast.error(isEnglish ? 'Failed to send message' : 'বার্তা পাঠাতে ব্যর্থ');
      setInputMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  // Send typing indicator
  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    supabase
      .from('typing_indicators')
      .upsert({
        session_id: selectedChat.id,
        user_id: user.id,
        is_typing: true,
        updated_at: new Date().toISOString()
      });

    typingTimeoutRef.current = setTimeout(() => {
      supabase
        .from('typing_indicators')
        .update({ is_typing: false })
        .eq('session_id', selectedChat.id)
        .eq('user_id', user.id);
    }, 2000);
  };

  // Close chat
  const handleCloseChat = async () => {
    if (!selectedChat) return;

    const { error } = await supabase
      .from('chat_sessions')
      .update({
        status: 'closed',
        ended_at: new Date().toISOString()
      })
      .eq('id', selectedChat.id);

    if (!error) {
      setSelectedChat(null);
      setMessages([]);
      toast.success(isEnglish ? 'Chat closed' : 'চ্যাট বন্ধ হয়েছে');
      loadChats();
    } else {
      console.error('Close chat error:', error);
      toast.error(isEnglish ? 'Failed to close chat' : 'চ্যাট বন্ধ করতে ব্যর্থ');
    }
  };

  // Use quick reply
  const handleQuickReply = (reply) => {
    const text = selectedChat?.language === 'bn' ? reply.text_bn : reply.text_en;
    setInputMessage(text);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return isEnglish ? 'Just now' : 'এইমাত্র';
    if (diffMins < 60) return `${diffMins} ${isEnglish ? 'min ago' : 'মিনিট আগে'}`;
    
    return date.toLocaleTimeString(isEnglish ? 'en-US' : 'bn-BD', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ChatCircleDots size={36} weight="fill" className="text-primary" />
            {isEnglish ? 'Live Chat Support' : 'লাইভ চ্যাট সাপোর্ট'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isEnglish
              ? 'Manage real-time conversations with users'
              : 'ব্যবহারকারীদের সাথে রিয়েল-টাইম কথোপকথন পরিচালনা করুন'}
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Chat List */}
          <div className="col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {['pending', 'active', 'closed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedChat(null);
                  }}
                  className={`flex-1 px-4 py-3 font-medium text-sm transition-all ${
                    activeTab === tab
                      ? 'bg-primary text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab === 'pending' && (isEnglish ? 'Pending' : 'অপেক্ষমাণ')}
                  {tab === 'active' && (isEnglish ? 'Active' : 'সক্রিয়')}
                  {tab === 'closed' && (isEnglish ? 'Closed' : 'বন্ধ')}
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {tab === 'pending' ? pendingCount : tab === 'active' ? activeCount : closedCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Chat Items */}
            <div className="overflow-y-auto h-[calc(100vh-250px)]">
              {chats.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <ChatCircleDots size={48} className="mx-auto mb-3 opacity-50" />
                  <p>{isEnglish ? 'No chats found' : 'কোন চ্যাট পাওয়া যায়নি'}</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    whileHover={{ backgroundColor: 'rgba(0, 106, 78, 0.05)' }}
                    onClick={() => {
                      if (activeTab === 'pending') {
                        handleAcceptChat(chat);
                      } else {
                        setSelectedChat(chat);
                      }
                    }}
                    className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-all ${
                      selectedChat?.id === chat.id
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                          {chat.user_name?.[0] || 'U'}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {chat.user_name || (isEnglish ? 'User' : 'ব্যবহারকারী')}
                          </h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={12} />
                            {formatTime(chat.created_at)}
                          </p>
                        </div>
                      </div>
                      {chat.status === 'waiting' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          {isEnglish ? 'New' : 'নতুন'}
                        </span>
                      )}
                    </div>
                    {chat.chat_messages?.[0]?.count > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {chat.chat_messages[0].count} {isEnglish ? 'messages' : 'বার্তা'}
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="col-span-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-primary to-green-600 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
                    >
                      <ArrowLeft size={20} className="text-white" />
                    </button>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                      {selectedChat.user_name?.[0] || 'U'}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">
                        {selectedChat.user_name || (isEnglish ? 'User' : 'ব্যবহারকারী')}
                      </h3>
                      <p className="text-white/80 text-sm flex items-center gap-1">
                        {selectedChat.language === 'bn' ? '🇧🇩 বাংলা' : '🇬🇧 English'}
                      </p>
                    </div>
                  </div>
                  {selectedChat.status === 'active' && (
                    <button
                      onClick={handleCloseChat}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                    >
                      {isEnglish ? 'Close Chat' : 'চ্যাট বন্ধ করুন'}
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                  {messages.map((message) => {
                    const isAdmin = message.sender_type === 'admin';
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isAdmin
                              ? 'bg-primary text-white rounded-br-none'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
                          }`}
                        >
                          {message.attachment_url && (
                            <div className="mb-2">
                              <img
                                src={message.attachment_url}
                                alt="Attachment"
                                className="rounded-lg max-w-full h-auto"
                              />
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isAdmin ? 'text-white/70' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3">
                        <div className="flex gap-1">
                          <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                          />
                          <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, delay: 0.2, repeat: Infinity }}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                          />
                          <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, delay: 0.4, repeat: Infinity }}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {selectedChat.status === 'active' && (
                  <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    {/* Quick Replies */}
                    <AnimatePresence>
                      {showQuickReplies && quickReplies.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-3 space-y-2"
                        >
                          {quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              onClick={() => handleQuickReply(reply)}
                              className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <Lightning size={16} className="text-primary" weight="fill" />
                                <span className="text-gray-900 dark:text-white">
                                  {selectedChat.language === 'bn' ? reply.text_bn : reply.text_en}
                                </span>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        title={isEnglish ? 'Quick Replies' : 'দ্রুত উত্তর'}
                      >
                        <Lightning size={20} weight="fill" />
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => {
                          setInputMessage(e.target.value);
                          handleTyping();
                        }}
                        placeholder={
                          isEnglish
                            ? 'Type your message...'
                            : 'আপনার বার্তা টাইপ করুন...'
                        }
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={!inputMessage.trim() || isLoading}
                        className="px-6 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PaperPlaneRight size={20} weight="fill" />
                      </motion.button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <ChatCircleDots size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {isEnglish ? 'Select a chat to start' : 'শুরু করতে একটি চ্যাট নির্বাচন করুন'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* User Context Sidebar */}
          <div className="col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-primary to-green-600">
              <h3 className="text-white font-bold flex items-center gap-2">
                <UserIcon size={20} weight="fill" />
                {isEnglish ? 'User Context' : 'ব্যবহারকারীর তথ্য'}
              </h3>
            </div>
            
            <div className="overflow-y-auto h-[calc(100vh-250px)] p-4">
              {selectedChat && userContext ? (
                <div className="space-y-4">
                  {/* Profile */}
                  {userContext.profile && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isEnglish ? 'Profile' : 'প্রোফাইল'}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Name:</span> {userContext.profile.full_name}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Email:</span> {userContext.profile.email}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Phone:</span> {userContext.profile.phone || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Applications */}
                  {userContext.applications.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isEnglish ? 'Applications' : 'আবেদন'}
                      </h4>
                      <div className="space-y-2">
                        {userContext.applications.map((app) => (
                          <div
                            key={app.id}
                            className="text-sm bg-white dark:bg-gray-800 rounded p-2"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">
                              {app.license_type}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-xs">
                              Status: <span className="capitalize">{app.status}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vehicles */}
                  {userContext.vehicles.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isEnglish ? 'Vehicles' : 'যানবাহন'}
                      </h4>
                      <div className="space-y-2">
                        {userContext.vehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="text-sm bg-white dark:bg-gray-800 rounded p-2"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">
                              {vehicle.registration_number}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-xs">
                              {vehicle.make} {vehicle.model}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Violations */}
                  {userContext.violations.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isEnglish ? 'Violations' : 'লঙ্ঘন'}
                      </h4>
                      <div className="space-y-2">
                        {userContext.violations.map((violation) => (
                          <div
                            key={violation.id}
                            className="text-sm bg-white dark:bg-gray-800 rounded p-2"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">
                              {violation.violation_type}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-xs">
                              Fine: ৳{violation.fine_amount}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rating (if closed) */}
                  {selectedChat.status === 'closed' && selectedChat.rating && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                        {isEnglish ? 'User Rating' : 'ব্যবহারকারীর রেটিং'}
                      </h4>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={20}
                            weight={star <= selectedChat.rating ? 'fill' : 'regular'}
                            className={
                              star <= selectedChat.rating
                                ? 'text-yellow-500'
                                : 'text-gray-300'
                            }
                          />
                        ))}
                      </div>
                      {selectedChat.feedback && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                          "{selectedChat.feedback}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <p className="text-center">
                    {isEnglish
                      ? 'Select a chat to view user details'
                      : 'ব্যবহারকারীর বিবরণ দেখতে একটি চ্যাট নির্বাচন করুন'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
