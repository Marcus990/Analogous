"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useNotification } from "@/lib/notificationContext";
import ConfirmationModal from "@/components/ConfirmationModal";
import CachedImage from "@/components/CachedImage";
import { MovingBorderButton } from "@/components/MovingBorder";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import {
  IconArrowLeft,
  IconClock,
  IconUser,
  IconDatabase,
  IconBook,
  IconEye,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
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
  background_image: string;
}

interface UserAnalogiesResponse {
  status: string;
  analogies: AnalogyData[];
  count: number;
}

interface PaginatedAnalogiesResponse {
  status: string;
  analogies: AnalogyData[];
  count: number;
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9); // 9 analogies per page (3 rows of 3 on desktop)
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  
  // User stats for storage limits
  const [userStats, setUserStats] = useState<{
    currentPlan: string;
    analogiesStoredTotal: number;
    dailyLimit: number;
    rateLimitSeconds: number;
  } | null>(null);

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
      fetchUserStats();
    }
  }, [user, loading, router, currentPage]);

  const fetchUserAnalogies = async () => {
    try {
      setLoadingAnalogies(true);
      console.log("Fetching paginated analogies for user:", user!.id, "page:", currentPage);
      const response: PaginatedAnalogiesResponse = await api.getUserAnalogiesPaginated(
        user!.id,
        currentPage,
        pageSize
      );
      console.log("API response:", response);
      setAnalogies(response.analogies);
      setTotalCount(response.total_count);
      setTotalPages(response.total_pages);
      setHasNext(response.has_next);
      setHasPrev(response.has_prev);
    } catch (err) {
      console.error("Error fetching user analogies:", err);
      setError("Failed to load your analogies");
    } finally {
      setLoadingAnalogies(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const response = await api.getUserPricingStats(user.id);
      setUserStats(response);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      // Don't set error state for this, as it's not critical for the page to function
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
      
      // Refresh the current page to get updated data
      await fetchUserAnalogies();
      
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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        title="Remove from Library"
        message="Are you sure you want to remove this analogy from your library? This action cannot be undone and the analogy will be permanently removed from your collection."
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
      />

      {/* Header */}
      <div className="relative z-10 top-6">
        <div className="relative z-20 px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
          {/* Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
            <button
              onClick={handleGoBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <IconArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Back to Dashboard</span>
            </button>

            <MovingBorderButton
              onClick={handleCreateNew}
              borderRadius="0.5rem"
              duration={3000}
              containerClassName="w-auto h-auto"
              borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md text-sm sm:text-base"
            >
              Generate New Analogy
            </MovingBorderButton>
          </div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="neonText">
              <span
                className={
                  "font-[PlantinMTProSemiBold] text-4xl sm:text-5xl md:text-6xl lg:text-7xl transition-transform duration-300 hover:scale-105"
                }
              >
                Your Personal Library
              </span>
            </div>
            <p className="text-gray-400 text-sm sm:text-base lg:text-lg px-4 mt-2">
              {totalCount === 0
                ? "Your library is waiting for your first analogy"
                : `${totalCount} ${
                    totalCount === 1 ? "analogy" : "analogies"
                  } in your collection`}
            </p>
            {totalPages > 1 && (
              <p className="text-gray-500 text-xs sm:text-sm mt-2">
                Page {currentPage} of {totalPages}
              </p>
            )}
            
            {/* Storage Usage Display */}
            {userStats && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 w-full sm:w-[80%] md:w-[60%] lg:w-[40%] mx-auto bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <IconDatabase className="w-3 h-3 sm:w-4 sm:h-4 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-medium text-gray-400">Storage Used</h3>
                      <p className="text-sm sm:text-lg font-semibold text-white text-left">
                        {userStats.analogiesStoredTotal} / {userStats.currentPlan === "scholar" ? "500" : "100"}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-gray-400">Plan: {userStats.currentPlan === "scholar" ? "Scholar" : "Curious"}</p>
                    <p className="text-xs text-gray-500">
                      {userStats.analogiesStoredTotal >= (userStats.currentPlan === "scholar" ? 500 : 100) 
                        ? "Storage limit reached" 
                        : `${Math.round((userStats.analogiesStoredTotal / (userStats.currentPlan === "scholar" ? 500 : 100)) * 100)}% used`}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2 mt-2 sm:mt-3">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                      userStats.analogiesStoredTotal >= (userStats.currentPlan === "scholar" ? 500 : 100)
                        ? "bg-red-500"
                        : userStats.analogiesStoredTotal >= (userStats.currentPlan === "scholar" ? 375 : 75)
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min((userStats.analogiesStoredTotal / (userStats.currentPlan === "scholar" ? 500 : 100)) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Library Collection */}
          {analogies.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center py-12 sm:py-20"
            >
              <div className="max-w-md mx-auto px-4">
                <IconBook className="w-16 h-16 sm:w-24 sm:h-24 text-gray-600 mx-auto mb-4 sm:mb-6" />
                <h3 className="text-xl sm:text-2xl font-bold text-gray-300 mb-3 sm:mb-4">
                  Your Library Awaits
                </h3>
                <p className="text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base">
                  Start creating your first analogy to add it to your personal library!
                </p>
                <MovingBorderButton
                  onClick={handleCreateNew}
                  borderRadius="0.5rem"
                  duration={3000}
                  containerClassName="w-auto h-auto"
                  borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                  className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md text-sm sm:text-base"
                >
                  Create Your First Analogy
                </MovingBorderButton>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {analogies.map((analogy, index) => (
                  <motion.div
                    key={analogy.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                    className="group cursor-pointer"
                    onClick={() => handleViewAnalogy(analogy.id)}
                  >
                    <BackgroundGradient containerClassName="rounded-lg p-[2px] h-full">
                      <div className="w-full bg-black rounded-lg p-4 sm:p-6 h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2">
                              {analogy.analogy_json.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-400">
                              Explain {analogy.topic} like I'm a{" "}
                              {analogy.audience}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteAnalogy(analogy.id, e)}
                            disabled={deletingAnalogy === analogy.id}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2"
                            title="Remove analogy from library"
                          >
                            {deletingAnalogy === analogy.id ? (
                              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <IconTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                          </button>
                        </div>

                        {/* Summary */}
                        <p className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4 flex-1 line-clamp-3 transition duration-200 group-hover:translate-x-1">
                          {truncateText(analogy.analogy_json.summary, 120)}
                        </p>

                        {/* Preview Images - Show only first image with indicator */}
                        {analogy.image_urls && analogy.image_urls.length > 0 && (
                          <div className="flex items-center space-x-2 mb-3 sm:mb-4 transition duration-200 group-hover:translate-x-1">
                            {/* First image */}
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
                              <CachedImage
                                src={getFullImageUrl(analogy.image_urls[0])}
                                alt="Chapter 1"
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                fallbackSrc={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/static/assets/default_image0.jpeg`}
                              />
                            </div>
                            
                            {/* Show indicator if there are more images */}
                            {analogy.image_urls.length > 1 && (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500 ml-1">
                                  +{analogy.image_urls.length - 1} more
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto transition duration-200 group-hover:translate-x-1">
                          <div className="flex items-center space-x-1">
                            <IconClock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs">{formatDateTime(analogy.created_at)}</span>
                          </div>
                          <div className="text-purple-400 transition-colors text-xs">
                            View →
                          </div>
                        </div>
                      </div>
                    </BackgroundGradient>
                  </motion.div>
                ))}
              </div>

              {/* Pagination Controls - Always Visible */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex items-center justify-center mt-8 sm:mt-12 mb-6 sm:mb-8 space-x-2 sm:space-x-4"
              >
                {/* Previous Page */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrev}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium transition-all duration-200",
                    hasPrev
                      ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      : "text-gray-500 cursor-not-allowed"
                  )}
                >
                  <IconChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1 sm:space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm",
                          currentPage === pageNum
                            ? "text-purple-400 bg-purple-500/10 border border-purple-500/30"
                            : "text-gray-400 hover:text-purple-400 hover:bg-purple-500/5"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNext}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium transition-all duration-200",
                    hasNext
                      ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      : "text-gray-500 cursor-not-allowed"
                  )}
                >
                  <IconChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
