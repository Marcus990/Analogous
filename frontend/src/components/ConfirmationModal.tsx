import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import { MovingBorderButton } from './MovingBorder';
import { BackgroundGradient } from './BackgroundGradient';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isLoading = false,
  icon,
  type = 'info'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
      default:
        return 'text-purple-400';
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 border-red-500/50';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 border-yellow-500/50';
      case 'info':
      default:
        return 'bg-purple-600 hover:bg-purple-700 border-purple-500/50';
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case 'danger':
        return <IconAlertTriangle size={24} />;
      case 'warning':
        return <IconAlertTriangle size={24} />;
      case 'info':
      default:
        return <IconAlertCircle size={24} />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg"
        >
          <BackgroundGradient containerClassName="rounded-lg p-[2px]">
            <div className="relative bg-black rounded-lg p-4 sm:p-6 lg:p-8">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors duration-200"
                disabled={isLoading}
              >
                <IconX className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>

              {/* Content */}
              <div className="pt-2 sm:pt-0">
                {/* Icon */}
                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center ${getIconColor()}`}>
                    {icon || getDefaultIcon()}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white text-center mb-2 sm:mb-3">
                  {title}
                </h3>

                {/* Message */}
                <p className="text-sm sm:text-base text-gray-300 text-center mb-4 sm:mb-6 leading-relaxed px-2">
                  {message}
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Cancel Button */}
                  <div className="w-full sm:w-1/2">
                    <button
                      onClick={onClose}
                      disabled={isLoading}
                      className="w-full h-12 px-4 rounded-lg font-medium transition bg-gray-700 hover:bg-gray-600 border border-gray-600/50 text-white shadow-md text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelText}
                    </button>
                  </div>

                  {/* Confirm Button */}
                  <div className="w-full sm:w-1/2">
                    <MovingBorderButton
                      onClick={onConfirm}
                      borderRadius="0.5rem"
                      duration={3000}
                      containerClassName="w-full h-12"
                      borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                      className={`w-full h-full px-4 rounded-lg font-medium transition border text-white shadow-md text-base ${getConfirmButtonStyle()} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                      disabled={isLoading}
                    >
                      {isLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      <span>{confirmText}</span>
                    </MovingBorderButton>
                  </div>
                </div>
              </div>
            </div>
          </BackgroundGradient>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
