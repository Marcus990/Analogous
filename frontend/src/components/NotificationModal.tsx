import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MovingBorderButton } from "./MovingBorder";
import { BackgroundGradient } from "./BackgroundGradient";
import { IconX, IconAlertTriangle, IconInfoCircle, IconCircleCheck } from "@tabler/icons-react";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "success" | "warning" | "error" | "info";
  confirmText?: string;
  showConfirmButton?: boolean;
}

export default function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  confirmText = "OK",
  showConfirmButton = true,
}: NotificationModalProps) {
  const handleConfirm = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const getIconColor = () => {
    return "text-purple-400";
    // switch (type) {
    //   case "success":
    //     return "text-green-400";
    //   case "warning":
    //     return "text-yellow-400";
    //   case "error":
    //     return "text-red-400";
    //   case "info":
    //     return "text-blue-400";
    //   default:
    //     return "text-blue-400";
    // }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <IconCircleCheck className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "warning":
      case "error":
        return <IconAlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "info":
        return <IconInfoCircle className="w-5 h-5 sm:w-6 sm:h-6" />;
      default:
        return <IconInfoCircle className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  const getConfirmButtonStyle = () => {
    return "bg-purple-700 hover:bg-purple-800 border-purple-500/50";
    // switch (type) {
    //   case "success":
    //     return "bg-green-600 hover:bg-green-700 border-green-500/50";
    //   case "warning":
    //     return "bg-yellow-600 hover:bg-yellow-700 border-yellow-500/50";
    //   case "error":
    //     return "bg-red-600 hover:bg-red-700 border-red-500/50";
    //   case "info":
    //     return "bg-blue-600 hover:bg-blue-700 border-blue-500/50";
    //   default:
    //     return "bg-blue-600 hover:bg-blue-700 border-blue-500/50";
    // }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg"
          >
            <BackgroundGradient containerClassName="rounded-lg p-[2px]">
              <div className="w-full relative bg-black rounded-lg p-4 sm:p-6 lg:p-8">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors duration-200"
                >
                  <IconX className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>

                {/* Content */}
                <div className="pt-2 sm:pt-0">
                  {/* Icon */}
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center ${getIconColor()}`}
                    >
                      {getIcon()}
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

                  {/* Button */}
                  {showConfirmButton && (
                    <div className="flex justify-center">
                      <MovingBorderButton
                        onClick={handleConfirm}
                        borderRadius="0.5rem"
                        duration={3000}
                        containerClassName="w-full sm:w-auto"
                        borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                        className={`w-full sm:w-auto h-12 px-6 rounded-lg font-medium transition border text-white shadow-md text-base ${getConfirmButtonStyle()}`}
                      >
                        {confirmText}
                      </MovingBorderButton>
                    </div>
                  )}
                </div>
              </div>
            </BackgroundGradient>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 