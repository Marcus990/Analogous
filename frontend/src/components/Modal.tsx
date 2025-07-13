"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Modal({
  children,
  onClose,
  isOpen = true,
}: {
  children: ReactNode;
  onClose: () => void;
  isOpen?: boolean;
}) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-transparent text-white p-0 rounded-lg max-w-3xl w-[90%] relative"
          >
            {/* Optional close button */}
            <button
              onClick={onClose}
              className="z-50 absolute top-3 right-4 text-gray-400 hover:text-white text-2xl transition-colors duration-200"
            >
              &times;
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
