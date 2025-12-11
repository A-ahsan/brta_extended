import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'phosphor-react';
import ChatbotModal from './ChatbotModal';

export default function ChatbotWidget({ user, userProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-gradient-to-br from-primary to-green-600 rounded-full shadow-2xl flex items-center justify-center overflow-hidden hover:shadow-primary/50 transition-all duration-300"
            style={{
              boxShadow: '0 8px 32px rgba(0, 106, 78, 0.4)',
            }}
          >
            {/* Bot Image */}
            <img 
              src="/bot.png" 
              alt="Chatbot" 
              className="w-12 h-12 object-cover rounded-full"
            />
            
            {/* Notification Badge */}
            {hasNewMessage && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white"
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <ChatbotModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        user={user}
        userProfile={userProfile}
        onNewMessage={() => setHasNewMessage(false)}
      />
    </>
  );
}
