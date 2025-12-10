import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Robot, X } from 'phosphor-react';
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
            className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-gradient-to-br from-primary to-green-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-primary/50 transition-all duration-300"
            style={{
              boxShadow: '0 8px 32px rgba(0, 106, 78, 0.4)',
            }}
          >
            <Robot size={32} weight="duotone" />
            
            {/* Notification Badge */}
            {hasNewMessage && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white"
              />
            )}

            {/* Pulse Animation */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
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
