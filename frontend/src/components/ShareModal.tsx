import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MovingBorderButton } from "./MovingBorder";
import { BackgroundGradient } from "./BackgroundGradient";
import { IconX, IconShare, IconLink, IconGlobe, IconLock } from "@tabler/icons-react";
import { useAuth } from "@/lib/auth";
import { useNotification } from "@/lib/notificationContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  analogy: any;
  isPublic: boolean;
  onPublicStatusChange: (isPublic: boolean) => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  analogy,
  isPublic,
  onPublicStatusChange,
}: ShareModalProps) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();
  const [isUpdatingPublicStatus, setIsUpdatingPublicStatus] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleTogglePublicStatus = async () => {
    if (!analogy) return;

    // Check if user is authenticated
    if (!user) {
      showNotification({
        title: "Authentication Required",
        message: "Please log in to update analogy settings.",
        type: "error",
        confirmText: "OK",
      });
      router.push("/login");
      return;
    }

    try {
      setIsUpdatingPublicStatus(true);
      const newPublicStatus = !isPublic;
      
      await api.updateAnalogyPublicStatus(analogy.id, newPublicStatus);
      
      onPublicStatusChange(newPublicStatus);
      showNotification({
        title: "Success",
        message: `Analogy ${newPublicStatus ? 'made public' : 'made private'} successfully`,
        type: "success",
        confirmText: "OK",
      });
    } catch (error) {
      console.error("Error updating public status:", error);
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to update public status",
        type: "error",
        confirmText: "OK",
      });
    } finally {
      setIsUpdatingPublicStatus(false);
    }
  };

  const handleShareAnalogy = () => {
    if (!analogy) return;

    if (!isPublic) {
      showNotification({
        title: "Make Public First",
        message: "You need to make this analogy public before sharing it.",
        type: "warning",
        confirmText: "OK",
      });
      return;
    }

    const shareUrl = `${window.location.origin}/shared/${analogy.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: analogy.analogy.title,
        text: `Check out this analogy: ${analogy.analogy.title}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      showNotification({
        title: "Link Copied",
        message: "Share link copied to clipboard!",
        type: "success",
        confirmText: "OK",
      });
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-md sm:max-w-lg"
          >
            <BackgroundGradient containerClassName="rounded-lg p-[2px]">
              <div className="relative bg-[#1a1a1a] rounded-lg p-6 sm:p-8 w-full">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors duration-200"
                >
                  <IconX className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <IconShare className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        Share Analogy
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        Make your analogy public and share it with others
                      </p>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    {/* Public/Private Toggle */}
                    <div className="bg-[#1f1f1f] p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {isPublic ? (
                            <IconGlobe className="w-5 h-5 text-green-400" />
                          ) : (
                            <IconLock className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-white font-medium">
                            {isPublic ? "Public" : "Private"}
                          </span>
                        </div>
                        <button
                          onClick={handleTogglePublicStatus}
                          disabled={isUpdatingPublicStatus}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                            isPublic ? 'bg-purple-600' : 'bg-gray-600'
                          } ${isUpdatingPublicStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isPublic ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-sm text-gray-400">
                        {isPublic 
                          ? "Anyone with the link can view and regenerate this analogy"
                          : "Only you can view this analogy"
                        }
                      </p>
                    </div>

                    {/* Share Link Section */}
                    {isPublic && (
                      <div className="bg-[#1f1f1f] p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-3">
                          <IconLink className="w-5 h-5 text-purple-400" />
                          <span className="text-white font-medium">Share Link</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/shared/${analogy?.id}`}
                            className="flex-1 bg-gray-800 text-gray-300 text-sm px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-purple-500"
                          />
                          <button
                            onClick={handleShareAnalogy}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors duration-200 flex items-center space-x-2"
                          >
                            <IconShare className="w-4 h-4" />
                            <span>{isCopied ? "Copied!" : "Share"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Status Indicator */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isPublic ? 'bg-green-400' : 'bg-gray-400'}`} />
                      <span className="text-sm text-gray-400">
                        {isPublic ? 'Public - Ready to share' : 'Private - Only you can view'}
                      </span>
                    </div>
                  </motion.div>

                  {/* Action Button */}
                  <div className="flex items-center justify-center">
                    <MovingBorderButton
                      onClick={onClose}
                      borderRadius="0.5rem"
                      duration={3000}
                      containerClassName="w-auto h-auto"
                      borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                      className="min-w-[240px] px-8 py-3 rounded-lg font-medium transition bg-purple-700 hover:bg-purple-800 border border-purple-500/50 text-white shadow-md text-base"
                    >
                      Done
                    </MovingBorderButton>
                  </div>
                </div>
              </div>
            </BackgroundGradient>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 