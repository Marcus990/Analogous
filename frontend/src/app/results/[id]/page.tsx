"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, GenerateAnalogyResponse } from "@/lib/api";
import { MovingBorderButton } from "@/components/MovingBorder";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { Carousel } from "@/components/Carousel";
import StreakModal from "@/components/StreakModal";
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
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useStreak } from "@/lib/streakContext";
import "../page.css";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { refreshStreakData } = useStreak();
  const [analogy, setAnalogy] = useState<GenerateAnalogyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [hasShownStreakModal, setHasShownStreakModal] = useState(false);
  const [regenerateAbortController, setRegenerateAbortController] = useState<AbortController | null>(null);

  const handleShowOverlay = (type: "carousel" | "text" | "learnMore") => {
    console.log("handleShowOverlay called with type:", type);
    if (type === "carousel") {
      setShowCarousel(true);
    } else if (type === "text") {
      setShowText(true);
    } else if (type === "learnMore") {
      console.log("Setting showLearnMore to true");
      setShowLearnMore(true);
    }
    // Reset animation state after animation completes
    setTimeout(() => {}, 800);
  };

  const handleHideOverlay = () => {
    setShowCarousel(false);
    setShowText(false);
    setShowLearnMore(false);
    setTimeout(() => {}, 300);
  };

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
            style={{ backgroundImage: "url('/assets/placeholder_image1.png')" }}
          />
        </motion.div>

        <motion.div className={cn(commonCardStyle, "z-0")}>
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-top z-0"
            style={{
              backgroundImage: "url('/assets/placeholder_image2.png')",
            }}
          />
        </motion.div>

        <motion.div variants={second} className={cn(commonCardStyle, "z-10")}>
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-bottom z-0"
            style={{
              backgroundImage: "url('/assets/placeholder_image3.png')",
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
        <motion.div
          variants={variants}
          className="flex flex-row rounded-2xl border border-neutral-100 dark:border-white/[0.2] p-2  items-start space-x-2 bg-white dark:bg-black"
        >
          <img
            src="/assets/GoogleLogo.jpeg"
            alt="avatar"
            height="100"
            width="100"
            className="rounded-full h-10 w-10"
          />
          <p className="text-xs text-neutral-500">
            Training a machine learning model is a complex process that requires
            data, time, and resources.
          </p>
        </motion.div>
        <motion.div
          variants={variantsSecond}
          className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center justify-end space-x-2 w-3/4 ml-auto bg-white dark:bg-black"
        >
          <p className="text-xs text-neutral-500">Nvidia RTX 4090</p>
          <img
            src="/assets/RedditLogo.png"
            alt="avatar"
            height="60"
            width="60"
            className="rounded-full h-6 w-6"
          />
        </motion.div>
      </motion.div>
    );
  };

  const ShareSkeleton = () => {
    const variants = {
      initial: {
        backgroundPosition: "0 50%",
      },
      animate: {
        backgroundPosition: ["0, 50%", "100% 50%", "0 50%"],
      },
    };
    return (
      <motion.div
        initial="initial"
        animate="animate"
        variants={variants}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] rounded-lg bg-dot-black/[0.2] flex-col space-y-2"
        style={{
          background:
            "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
          backgroundSize: "400% 400%",
        }}
      >
        <motion.div className="h-full w-full rounded-lg"></motion.div>
      </motion.div>
    );
  };

  useEffect(() => {
    const fetchAnalogy = async () => {
      try {
        const id = params.id as string;
        const data = await api.getAnalogy(id);
        setAnalogy(data);
        
        // Check if this analogy should show the streak popup
        if (data.streak_popup_shown === false && user && !hasShownStreakModal) {
          // Refresh streak data before showing the modal to ensure we have the latest data
          await refreshStreakData();
          // Show the streak modal for analogies that haven't shown the popup yet
          setShowStreakModal(true);
          setHasShownStreakModal(true);
        }
      } catch (err) {
        setError("Failed to load analogy");
        console.error("Error fetching analogy:", err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAnalogy();
    }
  }, [params.id, user, hasShownStreakModal, refreshStreakData]);

  // Handle modal close and mark popup as shown
  const handleStreakModalClose = async () => {
    setShowStreakModal(false);
    
    // Mark the streak popup as shown in the database
    if (analogy && user) {
      try {
        await api.markStreakPopupShown(analogy.id, user.id);
      } catch (error) {
        console.error("Error marking streak popup as shown:", error);
      }
    }
  };

  const showOverlay = showText || showCarousel || showLearnMore;

  useEffect(() => {
    if (showOverlay) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showOverlay]);

  const handleGenerateNew = () => {
    router.push("/");
  };

  const handleRegenerateAnalogy = async () => {
    if (!analogy) return;

    try {
      setIsRegenerating(true);
      
      // Create a new AbortController for this request
      const controller = new AbortController();
      setRegenerateAbortController(controller);
      
      const newAnalogy = await api.regenerateAnalogy(analogy.id, controller.signal);

      // Wait a moment for the backend to complete all updates (streak, lifetime count, etc.)
      // This ensures the database is fully updated before we fetch the latest data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh streak data to get the latest information before redirecting
      // This ensures the new results page will have the most up-to-date streak data
      try {
        await refreshStreakData();
      } catch (error) {
        console.error("Error refreshing streak data:", error);
        // Continue with redirect even if streak refresh fails
      }

      // Navigate to the new analogy's results page
      router.push(`/results/${newAnalogy.id}`);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Analogy regeneration was cancelled by user");
        // Don't show error message for user-initiated cancellation
      } else {
        console.error("Error regenerating analogy:", error);
        alert("Failed to regenerate analogy. Please try again.");
      }
    } finally {
      setIsRegenerating(false);
      setRegenerateAbortController(null);
    }
  };

  const handleStopRegeneration = () => {
    if (regenerateAbortController) {
      regenerateAbortController.abort();
      console.log("Cancelling analogy regeneration...");
    }
    setIsRegenerating(false);
    setRegenerateAbortController(null);
    // Note: The actual API call cannot be cancelled, but we stop the UI state
    // The user can now regenerate again
  };

  const ExitButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="absolute w-8 h-8 top-4 right-4 text-white hover:text-gray-300 hover:scale-110 transition-all duration-200 z-[999] bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm"
      title="Exit"
    >
      <IconX className="w-5 h-5" />
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your analogy...</p>
        </div>
      </div>
    );
  }

  if (error || !analogy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Oops!</h1>
          <p className="text-gray-400 mb-8">{error || "Analogy not found"}</p>
          <MovingBorderButton
            onClick={handleGenerateNew}
            borderRadius="0.5rem"
            duration={3000}
            containerClassName="w-auto h-auto"
            borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
            className="bg-purple-700 hover:bg-purple-700 px-6 py-3 font-medium border border-white/50 text-white shadow-md transition"
          >
            Generate New Analogy
          </MovingBorderButton>
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
      <StreakModal
        isOpen={showStreakModal}
        onClose={handleStreakModalClose}
        isNewStreak={true}
      />

      <div className="w-full max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
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
          {/* Cinematic Storybook - takes up 2 columns */}
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

          {/* Share - takes 2 columns */}
          <div className="md:col-span-2">
            <BentoGridItemResultsPage
              title="Share"
              description="Share this analogy with your friends and followers."
              header={<ShareSkeleton />}
              icon={<IconShare className="h-4 w-4 text-white" />}
            />
          </div>
        </BentoGridResultsPage>
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
                backdropFilter: "blur(8px)",
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
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.4,
                      ease: "easeOut",
                    }}
                  >
                    <div className="w-full">
                      <Carousel
                        slides={analogy.analogy_images.map((src, i) => ({
                          src,
                          id: `${analogy.id}`,
                          analogy: filteredAnalogy,
                        }))}
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

                      <div className="space-y-4 sm:space-y-6">
                        {analogy.analogy.learnMoreLinks &&
                        analogy.analogy.learnMoreLinks.length > 0 ? (
                          analogy.analogy.learnMoreLinks.map(
                            (link: string, index: number) => (
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
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-4 sm:p-6 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-purple-500/50 rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                                >
                                  <div className="flex items-center space-x-3 sm:space-x-4">
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
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                          />
                                        </svg>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm sm:text-base md:text-lg text-gray-200 group-hover:text-white transition-colors duration-300 font-medium truncate">
                                        {new URL(link).hostname.replace(
                                          "www.",
                                          ""
                                        )}
                                      </p>
                                      <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 truncate">
                                        {link}
                                      </p>
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
                                          d="M9 5l7 7-7 7"
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
                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                              </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-300 mb-2">
                              No Resources Available
                            </h3>
                            <p className="text-sm sm:text-base text-gray-400">
                              Check back later for additional learning resources
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
              className="min-w-[240px] px-8 py-4 rounded-lg font-medium text-base leading-none transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md flex items-center justify-center"
            >
              Generate New Analogy
            </button>

            {/* Re-Generate Analogy */}
            <button
              onClick={handleRegenerateAnalogy}
              disabled={isRegenerating}
              className="min-w-[240px] px-8 py-4 rounded-lg font-medium text-base leading-none transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isRegenerating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Regenerating...</span>
                </div>
              ) : (
                <span className="leading-none">Re-Generate Analogy</span>
              )}
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
      </div>
    </div>
  );
}
