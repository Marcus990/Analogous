"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, SharedAnalogyResponse } from "@/lib/api";
import { MovingBorderButton } from "@/components/MovingBorder";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { Carousel } from "@/components/Carousel";
import {
  BentoGridItemResultsPage,
  BentoGridResultsPage,
} from "@/components/BentoGrid";
import {
  IconAlignJustified,
  IconSignature,
  IconBook,
  IconShare,
  IconX,
  IconSquare,
  IconRefresh,
  IconUser,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useStreak } from "@/lib/streakContext";
import { useNotification } from "@/lib/notificationContext";
import "../page.css";

export default function SharedAnalogyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { refreshStreakData } = useStreak();
  const { showNotification } = useNotification();
  const [analogy, setAnalogy] = useState<SharedAnalogyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateAbortController, setRegenerateAbortController] =
    useState<AbortController | null>(null);
  const [activeLearnMoreTab, setActiveLearnMoreTab] = useState<
    "text" | "video"
  >("text");

  // Use ref to track if analogy has been fetched to prevent multiple calls
  const hasFetchedAnalogy = useRef(false);

  // Helper function to convert relative image URLs to absolute backend URLs
  const getFullImageUrl = useCallback((relativeUrl: string) => {
    if (relativeUrl.startsWith("http")) {
      return relativeUrl; // Already absolute
    }
    // Convert relative URL to absolute backend URL
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${backendUrl}${relativeUrl}`;
  }, []);

  const handleShowOverlay = useCallback(
    (type: "carousel" | "text" | "learnMore") => {
      console.log("handleShowOverlay called with type:", type);
      if (type === "carousel") {
        setShowCarousel(true);
      } else if (type === "text") {
        setShowText(true);
      } else if (type === "learnMore") {
        console.log("Setting showLearnMore to true");
        setShowLearnMore(true);
        setActiveLearnMoreTab("text"); // Reset to text tab when opening
      }
      // Reset animation state after animation completes
      setTimeout(() => {}, 800);
    },
    []
  );

  const handleHideOverlay = useCallback(() => {
    setShowCarousel(false);
    setShowText(false);
    setShowLearnMore(false);
    setTimeout(() => {}, 300);
  }, []);

  const TextViewSkeleton = () => {
    const variants = {
      initial: {
        width: 0,
      },
      animate: {
        width: "100%",
        transition: {
          duration: 0.2,
        },
      },
      hover: {
        width: ["0%", "100%"],
        transition: {
          duration: 2,
        },
      },
    };
    const arr = new Array(6).fill(0);
    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2"
      >
        {arr.map((_, i) => (
          <motion.div
            key={"skelenton-two" + i}
            variants={variants}
            style={{
              maxWidth: Math.random() * (100 - 40) + 40 + "%",
            }}
            className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2  items-center space-x-2 bg-neutral-100 dark:bg-black w-full h-4"
          ></motion.div>
        ))}
      </motion.div>
    );
  };

  const ImageViewSkeleton = () => {
    const first = {
      initial: {
        x: 20,
        rotate: -5,
      },
      hover: {
        x: 0,
        rotate: 0,
      },
    };
    const second = {
      initial: {
        x: -20,
        rotate: 5,
      },
      hover: {
        x: 0,
        rotate: 0,
      },
    };

    const commonCardStyle =
      "h-full w-1/3 relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/[0.1] flex items-center justify-center text-center";

    // Use actual analogy images if available, otherwise fallback to placeholders
    const imageUrls = analogy?.analogy_images || [];
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const getImageUrl = (index: number) => {
      if (imageUrls[index]) {
        const relativeUrl = imageUrls[index];
        return relativeUrl.startsWith("http")
          ? relativeUrl
          : `${backendUrl}${relativeUrl}`;
      }
      // Fallback to frontend placeholder images for preview
      return `/assets/placeholder_image${index + 1}.png`;
    };

    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="flex w-full h-[8rem] md:h-40 space-x-4"
      >
        <motion.div variants={first} className={cn(commonCardStyle, "z-10")}>
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-top z-0"
            style={{ backgroundImage: `url('${getImageUrl(0)}')` }}
          />
        </motion.div>

        <motion.div className={cn(commonCardStyle, "z-0")}>
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-top z-0"
            style={{
              backgroundImage: `url('${getImageUrl(1)}')`,
            }}
          />
        </motion.div>

        <motion.div variants={second} className={cn(commonCardStyle, "z-10")}>
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-top z-0"
            style={{
              backgroundImage: `url('${getImageUrl(2)}')`,
            }}
          />
        </motion.div>
      </motion.div>
    );
  };

  const LearnMoreSkeleton = () => {
    const variants = {
      initial: {
        x: 0,
      },
      animate: {
        x: 10,
        rotate: 5,
        transition: {
          duration: 0.2,
        },
      },
    };
    const variantsSecond = {
      initial: {
        x: 0,
      },
      animate: {
        x: -10,
        rotate: -5,
        transition: {
          duration: 0.2,
        },
      },
    };

    return (
      <motion.div
        initial="initial"
        whileHover="animate"
        className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2"
      >
        {/* Tab-like header */}
        <motion.div
          variants={variants}
          className="flex justify-center space-x-2 mb-2"
        >
          <div className="w-16 h-6 bg-purple-500/30 rounded-lg"></div>
          <div className="w-16 h-6 bg-gray-700/50 rounded-lg"></div>
        </motion.div>

        {/* Content items */}
        <motion.div
          variants={variants}
          className="flex flex-row rounded-2xl border border-neutral-100 dark:border-white/[0.2] p-2 items-start space-x-2 bg-white dark:bg-black"
        >
          <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
          <div className="flex flex-col space-y-1 flex-1">
            <div className="w-3/4 h-3 bg-gray-300 rounded"></div>
            <div className="w-1/2 h-2 bg-gray-200 rounded"></div>
          </div>
        </motion.div>

        <motion.div
          variants={variantsSecond}
          className="flex flex-row rounded-2xl border border-neutral-100 dark:border-white/[0.2] p-2 items-start space-x-2 bg-white dark:bg-black"
        >
          <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
          <div className="flex flex-col space-y-1 flex-1">
            <div className="w-2/3 h-3 bg-gray-300 rounded"></div>
            <div className="w-1/3 h-2 bg-gray-200 rounded"></div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const RegenerateSkeleton = () => {
    const variants = {
      initial: {
        scale: 1,
        rotate: 0,
      },
      hover: {
        scale: 1.1,
        rotate: 180,
        transition: {
          duration: 0.6,
          ease: "easeInOut",
        },
      },
    };

    const textVariants = {
      initial: {
        width: 0,
      },
      animate: {
        width: "100%",
        transition: {
          duration: 0.2,
        },
      },
      hover: {
        width: ["0%", "100%"],
        transition: {
          duration: 1.5,
        },
      },
    };

    const arr = new Array(4).fill(0);
    const widths = ["90%", "75%", "60%", "45%"];

    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-row items-center space-x-6 p-4"
      >
        {/* Large Regenerate Icon */}
        <motion.div
          variants={variants}
          className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
        >
          <IconRefresh className="w-10 h-10 text-white" />
        </motion.div>

        {/* Animated Text Bars */}
        <div className="flex flex-col space-y-3 flex-1">
          {arr.map((_, i) => (
            <motion.div
              key={"regenerate-text-" + i}
              variants={textVariants}
              style={{
                maxWidth: widths[i],
              }}
              className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 bg-neutral-100 dark:bg-black w-full h-4"
            ></motion.div>
          ))}
        </div>

        {/* Status Indicator */}
        <div className="flex flex-col items-center space-y-2 flex-shrink-0">
          <div className="w-4 h-4 bg-purple-400 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
      </motion.div>
    );
  };

  useEffect(() => {
    const fetchSharedAnalogy = async () => {
      // Prevent multiple fetches for the same analogy
      if (hasFetchedAnalogy.current) {
        return;
      }

      try {
        const id = params.id as string;
        hasFetchedAnalogy.current = true;

        const data = await api.getSharedAnalogy(id);
        setAnalogy(data);

        // Debug: Log the analogy data and image URLs
        console.log("Fetched shared analogy data:", data);
        console.log("Analogy images:", data.analogy_images);
      } catch (err) {
        console.error("Error fetching shared analogy:", err);
        if (err instanceof Error) {
          if (err.message.includes("not public")) {
            setError("This analogy is not public and cannot be shared.");
          } else if (err.message.includes("not found")) {
            setError("Analogy not found.");
          } else {
            setError("Failed to load shared analogy");
          }
        } else {
          setError("Failed to load shared analogy");
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id && !hasFetchedAnalogy.current) {
      fetchSharedAnalogy();
    }
  }, [params.id]);

  // Reset the fetch flag when params.id changes
  useEffect(() => {
    console.log("Analogy ID changed to:", params.id);
    hasFetchedAnalogy.current = false;
  }, [params.id]);

  const handleRegenerateAnalogy = useCallback(async () => {
    if (!analogy || !user) {
      showNotification({
        title: "Authentication Required",
        message: "Please log in to regenerate analogies.",
        type: "error",
        confirmText: "OK",
      });
      router.push("/login");
      return;
    }

    try {
      setIsRegenerating(true);
      const controller = new AbortController();
      setRegenerateAbortController(controller);

      const getUserTimezone = () => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (error) {
          console.warn(
            "Could not get user timezone, falling back to UTC:",
            error
          );
          return "UTC";
        }
      };

      const timezoneStr = getUserTimezone();

      const newAnalogy = await api.regenerateAnalogy(
        analogy.id,
        timezoneStr,
        controller.signal
      );

      console.log("Successfully regenerated analogy:", newAnalogy);

      // Refresh streak data
      try {
        await refreshStreakData();
      } catch (error) {
        console.error("Error refreshing streak data:", error);
        // Continue with redirect even if streak refresh fails
      }

      // Navigate to the new analogy's results page
      router.push(`/results/${newAnalogy.id}`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Analogy regeneration was cancelled by user");
        // Don't show error message for user-initiated cancellation
      } else if (
        error instanceof Error &&
        error.message.includes("Authentication required")
      ) {
        console.error("Authentication error:", error);
        showNotification({
          title: "Authentication Required",
          message: "Please log in to regenerate analogies.",
          type: "error",
          confirmText: "OK",
        });
        // Redirect to login page
        router.push("/login");
      } else if (
        error instanceof Error &&
        error.message.includes("Access denied")
      ) {
        console.error("Authorization error:", error);
        showNotification({
          title: "Access Denied",
          message: "You don't have permission to regenerate this analogy.",
          type: "error",
          confirmText: "OK",
        });
      } else {
        console.error("Error regenerating analogy:", error);
        console.log("Error type:", typeof error);
        console.log("Error instanceof Error:", error instanceof Error);
        console.log("Error message:", error instanceof Error ? error.message : "No message");
        console.log("Full error object:", error);
        
        // Display the specific error message from the backend
        const errorMessage = error instanceof Error ? error.message : "Failed to regenerate analogy. Please try again.";
        
        console.log("Final error message to display:", errorMessage);
        
        showNotification({
          title: "Regeneration Failed",
          message: errorMessage,
          type: "error",
          confirmText: "OK",
        });
      }
    } finally {
      setIsRegenerating(false);
      setRegenerateAbortController(null);
    }
  }, [analogy, refreshStreakData, router, showNotification, user]);

  const handleStopRegeneration = useCallback(() => {
    if (regenerateAbortController) {
      regenerateAbortController.abort();
      console.log("Cancelling analogy regeneration...");
    }
    setIsRegenerating(false);
    setRegenerateAbortController(null);
    // Note: The actual API call cannot be cancelled, but we stop the UI state
    // The user can now regenerate again
  }, [regenerateAbortController]);

  const showOverlay = showText || showCarousel || showLearnMore;

  useEffect(() => {
    if (showOverlay) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showOverlay]);

  const handleGenerateNew = useCallback(() => {
    router.push("/");
  }, [router]);

  const ExitButton = useCallback(
    ({ onClick }: { onClick: () => void }) => (
      <button
        onClick={onClick}
        className="absolute w-8 h-8 top-4 right-4 text-white hover:text-gray-300 hover:scale-110 transition-all duration-200 z-[999] bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm"
        title="Exit"
      >
        <IconX className="w-5 h-5" />
      </button>
    ),
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading shared analogy...</p>
        </div>
      </div>
    );
  }

  if (error || !analogy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-400 mb-8">{error || "Analogy not found"}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <MovingBorderButton
              onClick={handleGenerateNew}
              borderRadius="0.5rem"
              duration={3000}
              containerClassName="w-auto h-auto"
              borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
              className="min-w-[240px] px-8 py-3 rounded-lg font-medium transition bg-purple-700 hover:bg-purple-800 border border-purple-500/50 text-white shadow-md text-base"
            >
              Generate New Analogy
            </MovingBorderButton>
            {!user && (
              <MovingBorderButton
                onClick={() => router.push("/login")}
                borderRadius="0.5rem"
                duration={3000}
                containerClassName="w-auto h-auto"
                borderClassName="bg-[radial-gradient(#10b981_40%,transparent_60%)] opacity-90 blur-sm"
                className="min-w-[240px] px-8 py-3 rounded-lg font-medium transition bg-green-700 hover:bg-green-800 border border-green-500/50 text-white shadow-md text-base"
              >
                Log In
              </MovingBorderButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredAnalogy = Object.fromEntries(
    Object.entries(analogy.analogy).filter(
      ([_, val]) => typeof val === "string"
    )
  ) as Record<string, string>;

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center px-4">
      <div className="w-full max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-purple-400 text-md mt-2 mb-6 flex items-center justify-center gap-2">
            <IconUser className="w-5 h-5" />
            Created by @{analogy.creator_username}
          </p>
          <div className="neonText">
            <span
              className={
                "leading-tight font-[PlantinMTProSemiBold] text-[3rem] md:text-[5rem] transition-transform duration-300 hover:scale-105"
              }
            >
              {analogy.analogy.title}
            </span>
          </div>
          <p className="text-gray-400 text-lg">
            Explain {analogy.topic} like I&apos;m a {analogy.audience}
          </p>
        </motion.div>

        {/* BentoGrid to access views */}
        <BentoGridResultsPage className="max-w-6xl mx-auto md:auto-rows-[20rem]">
          {/* Comic Book - takes up 2 columns */}
          <div
            onClick={() => handleShowOverlay("carousel")}
            className="cursor-pointer md:col-span-2"
          >
            <BentoGridItemResultsPage
              title="Comic Book"
              description="Experience your analogy as a comic book."
              header={<ImageViewSkeleton />}
              icon={<IconBook className="h-4 w-4 text-white" />}
            />
          </div>

          {/* Text View - takes 1 column */}
          <div
            onClick={() => handleShowOverlay("text")}
            className="cursor-pointer md:col-span-1"
          >
            <BentoGridItemResultsPage
              title="Text View"
              description="Read the entire analogy as plain text."
              header={<TextViewSkeleton />}
              icon={<IconAlignJustified className="h-4 w-4 text-white" />}
            />
          </div>

          {/* Learn More - takes 1 column */}
          <div
            onClick={() => {
              console.log("Learn More clicked!");
              handleShowOverlay("learnMore");
            }}
            className="cursor-pointer md:col-span-1"
            style={{ pointerEvents: "auto" }}
          >
            <BentoGridItemResultsPage
              title="Learn More"
              description="Explore relevant real-world resources."
              header={<LearnMoreSkeleton />}
              icon={<IconSignature className="h-4 w-4 text-white" />}
            />
          </div>

          {/* Regenerate - takes 2 columns */}
          <div
            onClick={handleRegenerateAnalogy}
            className="cursor-pointer md:col-span-2"
          >
            <BentoGridItemResultsPage
              title="Regenerate"
              description="Create your own version of this analogy."
              header={<RegenerateSkeleton />}
              icon={<IconRefresh className="h-4 w-4 text-white" />}
            />
          </div>
        </BentoGridResultsPage>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex flex-col md:flex-row gap-4 justify-center items-center"
        >
          {/** Button Wrapper */}
          <div className="flex flex-wrap items-center justify-center gap-4 my-6">
            {/* Generate New Analogy */}
            <button
              onClick={handleGenerateNew}
              disabled={isRegenerating}
              className="min-w-[240px] px-8 py-4 rounded-lg font-medium text-base leading-none transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              Generate New Analogy
            </button>

            {/* Stop Regeneration */}
            {isRegenerating && (
              <button
                onClick={handleStopRegeneration}
                className="w-12 h-12 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md flex items-center justify-center"
                title="Stop Regeneration"
              >
                <IconSquare className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.div>

        {analogy.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-500">Analogy ID: {analogy.id}</p>
          </motion.div>
        )}

        {showOverlay && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleHideOverlay}
          >
            {/* Background Blur & Disable Interaction */}
            <motion.div
              className="absolute inset-0 bg-black pointer-events-none"
              initial={{
                backdropFilter: "blur(0px)",
                backgroundColor: "rgba(0, 0, 0, 0)",
              }}
              animate={{
                backdropFilter: "blur(4px)",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
              }}
              exit={{
                backdropFilter: "blur(0px)",
                backgroundColor: "rgba(0, 0, 0, 0)",
              }}
              transition={{ duration: 0.5 }}
            />

            <motion.div
              className="relative z-10 w-full max-w-4xl sm:max-w-5xl h-[90vh] sm:h-[95vh] flex flex-col items-center px-2 sm:px-4 scrollbar-gray"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.2,
                ease: "easeOut",
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
            >
              {showText && (
                <>
                  <BackgroundGradient containerClassName="absolute top-1/2 -translate-y-1/2 rounded-lg p-[4px] backdrop-blur-sm shadow-2xl h-[90%] overflow-hidden w-full relative scrollbar-gray">
                    <ExitButton onClick={handleHideOverlay} />
                    <div className="p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto scrollbar-gray h-[90%] space-y-6 sm:space-y-8 md:space-y-10">
                      <div className="flex justify-between items-start mb-4">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-400 mb-2">
                          {analogy.analogy.title}
                        </h1>
                        <button
                          onClick={() => {
                            const textToCopy = [
                              analogy.analogy.title,
                              "",
                              "Chapter 1",
                              analogy.analogy.chapter1section1,
                              analogy.analogy.chapter1section2,
                              "",
                              "Chapter 2",
                              analogy.analogy.chapter2section1,
                              analogy.analogy.chapter2section2,
                              "",
                              "Chapter 3",
                              analogy.analogy.chapter3section1,
                              analogy.analogy.chapter3section2,
                            ].join("\n");
                            navigator.clipboard.writeText(textToCopy);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{isCopied ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>
                      {[1, 2, 3].map((chapterNum) => {
                        const section1 =
                          analogy.analogy[`chapter${chapterNum}section1`];
                        const section2 =
                          analogy.analogy[`chapter${chapterNum}section2`];

                        const renderFormattedText = (text: string) =>
                          text.split(/\*\*(.*?)\*\*/g).map((part, idx) =>
                            idx % 2 === 1 ? (
                              <span
                                key={idx}
                                className="font-bold"
                                style={{
                                  fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
                                }}
                              >
                                {part}
                              </span>
                            ) : (
                              <span key={idx}>{part}</span>
                            )
                          );

                        return (
                          <motion.div
                            key={chapterNum}
                            className="space-y-3 sm:space-y-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.5,
                              delay: 0.4 + chapterNum * 0.1,
                            }}
                          >
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-400 mb-2">
                              Chapter {chapterNum}
                            </h2>
                            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 leading-relaxed text-left">
                              {renderFormattedText(section1 as string)}
                            </p>
                            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 leading-relaxed text-left">
                              {renderFormattedText(section2 as string)}
                            </p>
                            {chapterNum < 3 && (
                              <hr className="border-gray-600 mt-4 sm:mt-6" />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </BackgroundGradient>
                </>
              )}

              {showCarousel && (
                <>
                  <ExitButton onClick={handleHideOverlay} />
                  <motion.div
                    className="relative w-full h-full scrollbar-gray flex justify-center items-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.4,
                      ease: "easeOut",
                    }}
                  >
                    <div className="w-full">
                      <Carousel
                        slides={analogy.analogy_images.map((src, i) => {
                          const fullSrc = getFullImageUrl(src);
                          const backgroundImageUrl = analogy.background_image
                            ? getFullImageUrl(analogy.background_image)
                            : undefined;

                          // Debug: Log the background image URL
                          console.log("Background image URL:", {
                            original: analogy.background_image,
                            fullUrl: backgroundImageUrl,
                          });

                          const slide = {
                            src: fullSrc,
                            id: `${analogy.id}`,
                            analogy: filteredAnalogy,
                            background_image: backgroundImageUrl,
                          };
                          return slide;
                        })}
                      />
                    </div>
                  </motion.div>
                </>
              )}

              {showLearnMore && (
                <>
                  <BackgroundGradient containerClassName="absolute top-1/2 -translate-y-1/2 rounded-lg p-[4px] backdrop-blur-sm shadow-2xl h-[90%] overflow-hidden w-full relative scrollbar-gray">
                    <ExitButton onClick={handleHideOverlay} />
                    <div className="w-full p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto scrollbar-gray h-[90%] space-y-6 sm:space-y-8 md:space-y-10">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="text-center space-y-4"
                      >
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-400 mb-2">
                          External Resources
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-gray-300">
                          Explore these real-world resources to learn more!
                        </p>
                      </motion.div>

                      {/* Tab Navigation */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="flex justify-center space-x-2"
                      >
                        <button
                          onClick={() => setActiveLearnMoreTab("text")}
                          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                            activeLearnMoreTab === "text"
                              ? "bg-purple-600 text-white shadow-lg"
                              : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                            <span>Text Sources</span>
                            {analogy.analogy.textLinks &&
                              analogy.analogy.textLinks.length > 0 && (
                                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                                  {analogy.analogy.textLinks.length}
                                </span>
                              )}
                          </div>
                        </button>
                        <button
                          onClick={() => setActiveLearnMoreTab("video")}
                          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                            activeLearnMoreTab === "video"
                              ? "bg-purple-600 text-white shadow-lg"
                              : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            <span>Video Sources</span>
                            {analogy.analogy.videoLinks &&
                              analogy.analogy.videoLinks.length > 0 && (
                                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                                  {analogy.analogy.videoLinks.length}
                                </span>
                              )}
                          </div>
                        </button>
                      </motion.div>

                      {/* Tab Content */}
                      <div className="space-y-4 sm:space-y-6">
                        {activeLearnMoreTab === "text" ? (
                          // Text Sources Tab
                          analogy.analogy.textLinks &&
                          analogy.analogy.textLinks.length > 0 ? (
                            analogy.analogy.textLinks.map(
                              (link: any, index: number) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.5,
                                    delay: 0.6 + index * 0.1,
                                  }}
                                  className="group"
                                >
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 sm:p-6 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-purple-500/50 rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                                  >
                                    <div className="flex items-start space-x-3 sm:space-x-4">
                                      <div className="flex-shrink-0">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors duration-300">
                                          <svg
                                            className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                            />
                                          </svg>
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-sm sm:text-base md:text-lg text-gray-200 group-hover:text-white transition-colors duration-300 font-medium mb-1">
                                          {link.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 mb-2 line-clamp-2">
                                          {link.description}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                          {link.source && (
                                            <span className="bg-gray-700/50 px-2 py-1 rounded">
                                              {link.source}
                                            </span>
                                          )}
                                          {link.publisher && (
                                            <span className="bg-gray-700/50 px-2 py-1 rounded">
                                              {link.publisher}
                                            </span>
                                          )}
                                          {link.creator && (
                                            <span className="bg-gray-700/50 px-2 py-1 rounded">
                                              {link.creator}
                                            </span>
                                          )}
                                          {link.published && (
                                            <span className="bg-gray-700/50 px-2 py-1 rounded">
                                              {link.published}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0">
                                        <svg
                                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-purple-400 transition-colors duration-300"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                          />
                                        </svg>
                                      </div>
                                    </div>
                                  </a>
                                </motion.div>
                              )
                            )
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 0.6 }}
                              className="text-center py-8 sm:py-12"
                            >
                              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                  />
                                </svg>
                              </div>
                              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-300 mb-2">
                                No Text Sources Available
                              </h3>
                              <p className="text-sm sm:text-base text-gray-400">
                                Check back later for additional text resources
                              </p>
                            </motion.div>
                          )
                        ) : // Video Sources Tab
                        analogy.analogy.videoLinks &&
                          analogy.analogy.videoLinks.length > 0 ? (
                          analogy.analogy.videoLinks.map(
                            (link: any, index: number) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.5,
                                  delay: 0.6 + index * 0.1,
                                }}
                                className="group"
                              >
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-4 sm:p-6 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-purple-500/50 rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                                >
                                  <div className="flex items-start space-x-3 sm:space-x-4">
                                    <div className="flex-shrink-0">
                                      {link.thumbnail ? (
                                        <img
                                          src={link.thumbnail}
                                          alt={link.title}
                                          className="w-16 h-12 sm:w-20 sm:h-15 rounded-lg object-cover"
                                        />
                                      ) : (
                                        <div className="w-16 h-12 sm:w-20 sm:h-15 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors duration-300">
                                          <svg
                                            className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-sm sm:text-base md:text-lg text-gray-200 group-hover:text-white transition-colors duration-300 font-medium mb-1">
                                        {link.title}
                                      </h3>
                                      <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 mb-2 line-clamp-2">
                                        {link.description}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        {link.source && (
                                          <span className="bg-gray-700/50 px-2 py-1 rounded">
                                            {link.source}
                                          </span>
                                        )}
                                        {link.publisher && (
                                          <span className="bg-gray-700/50 px-2 py-1 rounded">
                                            {link.publisher}
                                          </span>
                                        )}
                                        {link.creator && (
                                          <span className="bg-gray-700/50 px-2 py-1 rounded">
                                            {link.creator}
                                          </span>
                                        )}
                                        {link.published && (
                                          <span className="bg-gray-700/50 px-2 py-1 rounded">
                                            {link.published}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                      <svg
                                        className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-purple-400 transition-colors duration-300"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                </a>
                              </motion.div>
                            )
                          )
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            className="text-center py-8 sm:py-12"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
                              <svg
                                className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-300 mb-2">
                              No Video Sources Available
                            </h3>
                            <p className="text-sm sm:text-base text-gray-400">
                              Check back later for additional video resources
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </BackgroundGradient>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
