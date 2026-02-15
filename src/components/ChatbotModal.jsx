import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PaperPlaneRight, Robot, Sparkle, User as UserIcon, Microphone, SpeakerHigh, Stop } from 'phosphor-react';
import { useLanguage } from '../contexts/AppContext';
import { chatbotService } from '../services/chatbotService';
import toast from 'react-hot-toast';
import ChatTypeSelector from './chat/ChatTypeSelector';
import LiveChatModal from './chat/LiveChatModal';

export default function ChatbotModal({ isOpen, onClose, user, userProfile, onNewMessage }) {
  const { language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [showLanguageSelect, setShowLanguageSelect] = useState(true);
  const [showChatTypeSelect, setShowChatTypeSelect] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const isEnglish = language === 'en';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input after initialization
  useEffect(() => {
    if (isInitialized && !showLanguageSelect && !showChatTypeSelect) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isInitialized, showLanguageSelect, showChatTypeSelect]);

  // Handle language selection - show chat type selector next
  const handleLanguageSelect = (lang) => {
    setSelectedLanguage(lang);
    setShowLanguageSelect(false);
    setShowChatTypeSelect(true);
  };

  // Handle chat type selection
  const handleChatTypeSelect = (type) => {
    if (type === 'live_chat') {
      // Open live chat modal
      setShowLiveChat(true);
      onClose(); // Close the chatbot modal
    } else {
      // Initialize AI chatbot
      setShowChatTypeSelect(false);
      initializeChatbot(selectedLanguage);
    }
  };

  // Initialize chatbot when AI chat selected
  const initializeChatbot = async (lang) => {
    try {
      setIsLoading(true);


      // Prepare user context
      const userContext = {
        name: userProfile?.full_name || userProfile?.full_name_en || 'User',
        name_bn: userProfile?.full_name_bn || 'ব্যবহারকারী',
        userId: user?.id,
        email: user?.email,
        role: userProfile?.role || 'user',
      };

      // Initialize chat service
      await chatbotService.initializeChat(userContext);

      // Get quick actions
      const actions = chatbotService.getQuickActions(userContext, lang);
      setQuickActions(actions);

      // Send greeting message
      const greeting = lang === 'en'
        ? `Hello ${userContext.name}! 👋\n\nI'm your BRTA AI Assistant. I can help you with:\n• License applications & tracking\n• Vehicle registration & services\n• Traffic violations & fines\n• Route permits\n• Ownership transfer\n• Renewals (License & Tax Token)\n• Online exam & physical test booking\n• QR code verification\n\nHow can I assist you today?`
        : `নমস্কার ${userContext.name_bn}! 👋\n\nআমি আপনার BRTA AI সহায়ক। আমি আপনাকে সাহায্য করতে পারি:\n• লাইসেন্স আবেদন এবং ট্র্যাকিং\n• যানবাহন নিবন্ধন এবং সেবা\n• ট্রাফিক লঙ্ঘন এবং জরিমানা\n• রুট পারমিট\n• মালিকানা স্থানান্তর\n• নবায়ন (লাইসেন্স এবং ট্যাক্স টোকেন)\n• অনলাইন পরীক্ষা এবং শারীরিক পরীক্ষা বুকিং\n• QR কোড যাচাইকরণ\n\nআজ আমি কীভাবে আপনাকে সাহায্য করতে পারি?`;

      setMessages([
        {
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize chatbot:', error);
      toast.error(lang === 'en' ? 'Failed to initialize chatbot' : 'চ্যাটবট শুরু করতে ব্যর্থ');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending message (extracted for reuse)
  const handleMessageSend = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = messageText.trim();

    // Add user message to UI
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      setIsLoading(true);
      setIsStreaming(true);
      setStreamingMessage('');

      // Get AI response
      const response = await chatbotService.sendMessage(userMessage, selectedLanguage);

      // Animate the response character by character
      let currentText = '';
      const words = response.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        setStreamingMessage(currentText);
        
        // Adjust speed: faster for shorter words, slower for longer
        const delay = words[i].length > 8 ? 40 : 25;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Add complete AI response to messages
      const newAssistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      
      setIsStreaming(false);
      setStreamingMessage('');
      setMessages((prev) => [...prev, newAssistantMessage]);

      if (onNewMessage) onNewMessage();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(selectedLanguage === 'en' ? 'Failed to get response' : 'প্রতিক্রিয়া পেতে ব্যর্থ');

      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: selectedLanguage === 'en'
          ? 'Sorry, I encountered an error. Please try again.'
          : 'দুঃখিত, একটি ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        timestamp: new Date().toISOString(),
      };
      setIsStreaming(false);
      setStreamingMessage('');
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Refocus input after message is sent and loading is done
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Handle sending message from input
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    
    await handleMessageSend(messageText);
  };

  // Handle quick action click
  const handleQuickAction = async (actionId) => {
    try {
      setIsLoading(true);
      setIsStreaming(true);
      setStreamingMessage('');

      const response = await chatbotService.handleQuickAction(actionId, user?.id, selectedLanguage);
      
      // Debug log
      console.log('Quick action response:', response, 'Type:', typeof response);

      // Ensure response is a string
      const content = typeof response === 'string' 
        ? response 
        : JSON.stringify(response, null, 2);

      // Animate the quick action response
      let currentText = '';
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        currentText += (i === 0 ? '' : '\n') + lines[i];
        setStreamingMessage(currentText);
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      // Add to chat history so AI remembers this context
      chatbotService.addAssistantMessage(content);

      const newMessage = {
        role: 'assistant',
        content: content,
        timestamp: new Date().toISOString(),
      };
      
      setIsStreaming(false);
      setStreamingMessage('');
      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error('Failed to handle quick action:', error);
      toast.error(selectedLanguage === 'en' ? 'Failed to process action' : 'অ্যাকশন প্রক্রিয়া করতে ব্যর্থ');
      setIsStreaming(false);
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice Input - Speech to Text
  const startListening = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error(selectedLanguage === 'en' 
          ? 'Voice input not supported. Try Chrome browser.' 
          : 'ভয়েস ইনপুট সমর্থিত নয়। Chrome ব্রাউজার ব্যবহার করুন।');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage === 'en' ? 'en-US' : 'bn-BD';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.success(selectedLanguage === 'en' ? '🎙️ Listening...' : '🎙️ শুনছি...', {
          duration: 3000
        });
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        
        // Auto-send the message immediately
        handleMessageSend(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event);
        setIsListening(false);
        
        // Don't show error for user-initiated abort or no-speech
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }
        
        // Specific error messages
        let errorMsg = '';
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            errorMsg = selectedLanguage === 'en' 
              ? 'Microphone permission denied. Please allow microphone access.' 
              : 'মাইক্রোফোন অনুমতি অস্বীকৃত। মাইক্রোফোন অ্যাক্সেসের অনুমতি দিন।';
            break;
          case 'network':
            errorMsg = selectedLanguage === 'en' 
              ? 'Network error. Check your internet connection.' 
              : 'নেটওয়ার্ক ত্রুটি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।';
            break;
          case 'audio-capture':
            errorMsg = selectedLanguage === 'en' 
              ? 'No microphone found. Please connect a microphone.' 
              : 'মাইক্রোফোন পাওয়া যায়নি। একটি মাইক্রোফোন সংযুক্ত করুন।';
            break;
          default:
            errorMsg = selectedLanguage === 'en' 
              ? 'Voice input failed. Please try again.' 
              : 'ভয়েস ইনপুট ব্যর্থ। আবার চেষ্টা করুন।';
        }
        
        toast.error(errorMsg, { duration: 4000 });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Failed to start voice input:', error);
      setIsListening(false);
      toast.error(selectedLanguage === 'en' 
        ? 'Voice input not available. Use Chrome browser.' 
        : 'ভয়েস ইনপুট উপলব্ধ নয়। Chrome ব্রাউজার ব্যবহার করুন।');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Voice Output - Text to Speech
  const speakMessage = (text, messageIndex) => {
    try {
      // If already speaking this message, stop it
      if (isSpeaking && speakingMessageIndex === messageIndex) {
        stopSpeaking();
        return;
      }

      // Stop any ongoing speech first
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      // Check browser support
      if (!window.speechSynthesis) {
        toast.error(selectedLanguage === 'en' 
          ? 'Text-to-speech not supported in this browser' 
          : 'টেক্সট-টু-স্পিচ এই ব্রাউজারে সমর্থিত নয়');
        return;
      }

      // Wait for voices to be loaded
      let voices = window.speechSynthesis.getVoices();
      
      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language
        if (selectedLanguage === 'en') {
          utterance.lang = 'en-US';
        } else {
          // Try Bangla, fallback to Hindi (similar phonetics), then default
          utterance.lang = 'bn-BD';
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Find best voice for the language
        voices = window.speechSynthesis.getVoices();
        
        if (selectedLanguage === 'en') {
          // For English - prefer female voice
          const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) 
                       || voices.find(v => v.lang.startsWith('en'));
          if (enVoice) utterance.voice = enVoice;
        } else {
          // For Bangla - try multiple fallbacks
          const bnVoice = voices.find(v => v.lang.startsWith('bn'))
                       || voices.find(v => v.lang.startsWith('hi')) // Hindi as fallback
                       || voices.find(v => v.lang.includes('Bengali'))
                       || voices.find(v => v.name.includes('Bengali'));
          
          if (bnVoice) {
            utterance.voice = bnVoice;
            console.log('🔊 Using voice:', bnVoice.name, bnVoice.lang);
          } else {
            console.warn('⚠️ No Bangla/Hindi voice found. Available voices:', voices.map(v => `${v.name} (${v.lang})`));
            // Will use system default
          }
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setSpeakingMessageIndex(messageIndex);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingMessageIndex(null);
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          setIsSpeaking(false);
          setSpeakingMessageIndex(null);
          
          // Silently handle interruption/cancellation (user clicked stop)
          if (event.error === 'interrupted' || event.error === 'canceled' || event.error === 'cancelled') {
            // Don't show any error - this is expected when user stops audio
            return;
          }
          
          // Only show error for unexpected failures
          if (event.error !== 'synthesis-unavailable') {
            toast.error(selectedLanguage === 'en' 
              ? 'Audio playback failed' 
              : 'অডিও বাজাতে ব্যর্থ', { duration: 2000 });
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      // If voices not loaded yet, wait for them
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          speak();
        };
      } else {
        speak();
      }
    } catch (error) {
      console.error('Failed to speak message:', error);
      setIsSpeaking(false);
      setSpeakingMessageIndex(null);
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMessageIndex(null);
  };

  // Cleanup speech on unmount or close
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Stop speech when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      stopListening();
    }
  }, [isOpen]);

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                  <img src="/bot.png" alt="Bot" className="w-8 h-8 object-cover rounded-full" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {isEnglish ? 'BRTA AI Assistant' : 'BRTA AI সহায়ক'}
                  </h3>
                  <p className="text-white/80 text-xs">
                    {isLoading ? (
                      isEnglish ? 'Typing...' : 'টাইপ করছে...'
                    ) : (
                      isEnglish ? 'Online' : 'অনলাইন'
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Language Selection */}
            {showLanguageSelect && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 overflow-hidden">
                    <img src="/bot.png" alt="Bot" className="w-16 h-16 object-cover rounded-full" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {isEnglish ? 'Welcome!' : 'স্বাগতম!'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    {isEnglish
                      ? 'Choose your preferred language to get started'
                      : 'শুরু করতে আপনার পছন্দের ভাষা নির্বাচন করুন'}
                  </p>
                  <div className="flex gap-4 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLanguageSelect('en')}
                      className="px-8 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                      English
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLanguageSelect('bn')}
                      className="px-8 py-4 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                      বাংলা
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Type Selection */}
            {showChatTypeSelect && (
              <ChatTypeSelector
                language={selectedLanguage}
                onSelectType={handleChatTypeSelect}
                onClose={() => {
                  setShowChatTypeSelect(false);
                  setShowLanguageSelect(true);
                }}
              />
            )}

            {/* Messages Area */}
            {!showLanguageSelect && !showChatTypeSelect && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex items-start gap-2 max-w-[80%] ${
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                            message.role === 'user'
                              ? 'bg-primary text-white'
                              : 'bg-gradient-to-br from-primary to-green-600 text-white'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <UserIcon size={18} weight="bold" />
                          ) : (
                            <img src="/bot.png" alt="Bot" className="w-6 h-6 object-cover rounded-full" />
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-primary text-white rounded-tr-none'
                              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-none shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm whitespace-pre-wrap flex-1">{message.content}</p>
                            
                            {/* Voice playback button for assistant messages */}
                            {message.role === 'assistant' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => isSpeaking && speakingMessageIndex === index 
                                  ? stopSpeaking() 
                                  : speakMessage(message.content, index)}
                                className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                                  isSpeaking && speakingMessageIndex === index
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                                title={selectedLanguage === 'en' 
                                  ? (isSpeaking && speakingMessageIndex === index ? 'Stop' : 'Play audio') 
                                  : (isSpeaking && speakingMessageIndex === index ? 'বন্ধ করুন' : 'অডিও চালান')}
                              >
                                {isSpeaking && speakingMessageIndex === index ? (
                                  <Stop size={14} weight="fill" />
                                ) : (
                                  <SpeakerHigh size={14} weight="fill" />
                                )}
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Streaming message */}
                  {isStreaming && streamingMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-start gap-2 max-w-[80%]">
                        {/* Avatar */}
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-green-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img src="/bot.png" alt="Bot" className="w-6 h-6 object-cover rounded-full" />
                        </div>

                        {/* Message Bubble */}
                        <div className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-2xl rounded-tl-none shadow-md">
                          <p className="text-sm whitespace-pre-wrap">{streamingMessage}<span className="animate-pulse">▋</span></p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isLoading && !streamingMessage && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-green-600 rounded-full flex items-center justify-center overflow-hidden">
                          <img src="/bot.png" alt="Bot" className="w-6 h-6 object-cover rounded-full" />
                        </div>
                        <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none shadow-md">
                          <div className="flex gap-1">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                              className="w-2 h-2 bg-primary rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                              className="w-2 h-2 bg-primary rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                              className="w-2 h-2 bg-primary rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {quickActions.length > 0 && (
                  <div className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {selectedLanguage === 'en' ? 'Quick Actions:' : 'দ্রুত অ্যাকশন:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((action) => (
                        <motion.button
                          key={action.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleQuickAction(action.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {action.icon} {action.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        selectedLanguage === 'en'
                          ? 'Type your message...'
                          : 'আপনার বার্তা টাইপ করুন...'
                      }
                      disabled={isLoading || isListening}
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                    />
                    
                    {/* Voice Input Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={isListening ? stopListening : startListening}
                      disabled={isLoading}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isListening
                          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      title={selectedLanguage === 'en' 
                        ? (isListening ? 'Stop listening' : 'Voice input') 
                        : (isListening ? 'শোনা বন্ধ করুন' : 'ভয়েস ইনপুট')}
                    >
                      <Microphone size={20} weight={isListening ? 'fill' : 'bold'} />
                    </motion.button>
                    
                    {/* Send Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim() || isListening}
                      className="w-12 h-12 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PaperPlaneRight size={20} weight="bold" />
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Live Chat Modal */}
    {showLiveChat && (
      <LiveChatModal
        isOpen={showLiveChat}
        onClose={() => setShowLiveChat(false)}
        user={user}
        userProfile={userProfile}
        language={selectedLanguage}
      />
    )}
    </>
  );
}
