"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useNotification } from "@/lib/notificationContext";
import ConfirmationModal from "@/components/ConfirmationModal";
import { MovingBorderButton } from "@/components/MovingBorder";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import {
  IconArrowLeft,
  IconClock,
  IconUser,
  IconBook,
  IconEye,
  IconTrash,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import "./page.css";

interface AnalogyData {
  id: string;
  topic: string;
  audience: string;
  analogy_json: {
    title: string;
    summary: string;
    chapter1section1: string;
    chapter1quote: string;
    chapter2section1: string;
    chapter2quote: string;
    chapter3section1: string;
    chapter3quote: string;
    learnMoreLinks: string[];
  };
  image_urls: string[];
  created_at: string;
}

interface UserAnalogiesResponse {
  status: string;
  analogies: AnalogyData[];
  count: number;
}

export default function PastAnalogiesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showNotification } = useNotification();
  const [analogies, setAnalogies] = useState<AnalogyData[]>([]);
  const [loadingAnalogies, setLoadingAnalogies] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingAnalogy, setDeletingAnalogy] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [analogyToDelete, setAnalogyToDelete] = useState<string | null>(null);

  // Helper function to convert relative image URLs to absolute backend URLs
  const getFullImageUrl = (relativeUrl: string) => {
    if (relativeUrl.startsWith('http')) {
      return relativeUrl; // Already absolute
    }
    // Convert relative URL to absolute backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${backendUrl}${relativeUrl}`;
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      fetchUserAnalogies();
    }
  }, [user, loading, router]);

  const fetchUserAnalogies = async () => {
    try {
      setLoadingAnalogies(true);
      console.log("Fetching user analogies for user:", user!.id);
      const response: UserAnalogiesResponse = await api.getUserAnalogies(
        user!.id
      );
      console.log("API response:", response);
      setAnalogies(response.analogies);
    } catch (err) {
      console.error("Error fetching user analogies:", err);
      setError("Failed to load your analogies");
    } finally {
      setLoadingAnalogies(false);
    }
  };

  const handleDeleteAnalogy = async (analogyId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    setAnalogyToDelete(analogyId);
    setShowDeleteModal(true);
  };

  const confirmDeleteAnalogy = async () => {
    if (!analogyToDelete) return;

    try {
      setDeletingAnalogy(analogyToDelete);
      await api.deleteAnalogy(analogyToDelete);
      
      // Remove the analogy from the local state
      setAnalogies(prev => prev.filter(analogy => analogy.id !== analogyToDelete));
      
      console.log("Analogy deleted successfully");
    } catch (err) {
      console.error("Error deleting analogy:", err);
      showNotification({
        title: "Delete Failed",
        message: "Failed to delete analogy. Please try again.",
        type: "error",
        confirmText: "OK"
      });
    } finally {
      setDeletingAnalogy(null);
      setAnalogyToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getHoursAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours === 0) {
      return "Recent";
    } else if (diffInHours === 1) {
      return "1 hour ago";
    } else {
      return `${diffInHours} hours ago`;
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleViewAnalogy = (analogyId: string) => {
    router.push(`/results/${analogyId}`);
  };

  const handleGoBack = () => {
    router.push("/dashboard");
  };

  const handleCreateNew = () => {
    router.push("/");
  };

  if (loading || loadingAnalogies) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your analogies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Oops!</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <MovingBorderButton
            onClick={handleGoBack}
            borderRadius="0.5rem"
            duration={3000}
            containerClassName="w-auto h-auto"
            borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
            className="bg-purple-700 hover:bg-purple-700 px-6 py-3 font-medium border border-white/50 text-white shadow-md transition"
          >
            Go Back
          </MovingBorderButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setAnalogyToDelete(null);
        }}
        onConfirm={confirmDeleteAnalogy}
        title="Delete Analogy"
        message="Are you sure you want to delete this analogy? This action cannot be undone and the analogy will be permanently removed from your collection."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Header */}
      <div className="relative z-10">
        <div className="relative z-20 px-4 py-8 max-w-7xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleGoBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>

            <MovingBorderButton
              onClick={handleCreateNew}
              borderRadius="0.5rem"
              duration={3000}
              containerClassName="w-auto h-auto"
              borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
              className="px-6 py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md"
            >
              Generate New Analogy
            </MovingBorderButton>
          </div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="neonText">
              <span
                className={
                  "font-[PlantinMTProSemiBold] text-[3rem] md:text-[5rem] transition-transform duration-300 hover:scale-105"
                }
              >
                Your Analogies
              </span>
            </div>
            <p className="text-gray-400 text-lg">
              {analogies.length === 0
                ? "You haven't created any analogies yet"
                : `${analogies.length} ${
                    analogies.length === 1 ? "analogy" : "analogies"
                  } created`}
            </p>
          </motion.div>

          {/* Analogies Grid */}
          {analogies.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center py-20"
            >
              <div className="max-w-md mx-auto">
                <IconBook className="w-24 h-24 text-gray-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-300 mb-4">
                  No Analogies Yet
                </h3>
                <p className="text-gray-500 mb-8">
                  Start creating your first analogy to see it appear here!
                </p>
                <MovingBorderButton
                  onClick={handleCreateNew}
                  borderRadius="0.5rem"
                  duration={3000}
                  containerClassName="w-auto h-auto"
                  borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                  className="px-8 py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md"
                >
                  Create Your First Analogy
                </MovingBorderButton>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analogies.map((analogy, index) => (
                <motion.div
                  key={analogy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => handleViewAnalogy(analogy.id)}
                >
                  <BackgroundGradient containerClassName="rounded-lg p-[2px] h-full">
                    <div className="w-full bg-black rounded-lg p-6 h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                            {analogy.analogy_json.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            Explain {analogy.topic} like I'm a{" "}
                            {analogy.audience}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteAnalogy(analogy.id, e)}
                          disabled={deletingAnalogy === analogy.id}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete analogy"
                        >
                          {deletingAnalogy === analogy.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <IconTrash className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Summary */}
                      <p className="text-gray-300 text-sm mb-4 flex-1 line-clamp-3 transition duration-200 group-hover:translate-x-1">
                        {truncateText(analogy.analogy_json.summary, 120)}
                      </p>

                      {/* Preview Images */}
                      {analogy.image_urls && analogy.image_urls.length > 0 && (
                        <div className="flex space-x-2 mb-4 transition duration-200 group-hover:translate-x-1">
                          {analogy.image_urls.map((url, imgIndex) => (
                            <div
                              key={imgIndex}
                              className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0"
                            >
                              <img
                                src={getFullImageUrl(url)}
                                alt={`Chapter ${imgIndex + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Use fallback image instead of hiding
                                  const fallbackImage = `/static/assets/default_image${imgIndex % 3}.jpeg`;
                                  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                                  e.currentTarget.src = `${backendUrl}${fallbackImage}`;
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-auto transition duration-200 group-hover:translate-x-1">
                        <div className="flex items-center space-x-1">
                          <IconClock className="w-4 h-4" />
                          <span>{formatDateTime(analogy.created_at)}</span>
                        </div>
                        <div className="text-purple-400 transition-colors">
                          View Details →
                        </div>
                      </div>
                    </div>
                  </BackgroundGradient>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
