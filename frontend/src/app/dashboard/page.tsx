"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { LampContainer } from "@/components/LampContainer";
import { BentoGridItem, BentoGridDashboard } from "@/components/BentoGrid";
import Modal from "@/components/Modal";
import OnboardingFlow from "@/components/OnboardingFlow";
import { MovingBorderButton } from "@/components/MovingBorder";
import { api } from "@/lib/api";
import ConfirmationModal from "@/components/ConfirmationModal";
import StreakModal from "@/components/StreakModal";
import { useStreak } from "@/lib/streakContext";
import { useNotification } from "@/lib/notificationContext";
import {
  HiOutlineUserCircle,
  HiOutlineLightBulb,
  HiOutlineCog,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineFire,
  HiOutlineTrash,
} from "react-icons/hi";
import { motion } from "framer-motion";

// Typewriter effect component
const TypewriterHeading = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [typingMode, setTypingMode] = useState<"full" | "audience" | "topic">(
    "full"
  );
  const [currentTopic, setCurrentTopic] = useState("");
  const [currentAudience, setCurrentAudience] = useState("");
  const [lastTopic, setLastTopic] = useState("");
  const [lastAudience, setLastAudience] = useState("");

  const topics = [
    "quantum physics",
    "machine learning",
    "blockchain technology",
    "climate change",
    "artificial intelligence",
    "cryptocurrency",
    "genetic engineering",
    "space exploration",
    "neural networks",
    "quantum computing",
    "virtual reality",
    "augmented reality",
    "biotechnology",
    "nanotechnology",
    "robotics",
    "cybersecurity",
    "data science",
    "cloud computing",
    "internet of things",
    "5G technology",
    "autonomous vehicles",
    "renewable energy",
    "nuclear fusion",
    "quantum entanglement",
    "dark matter",
    "black holes",
    "evolution",
    "DNA sequencing",
    "cancer research",
    "vaccine development",
  ];

  const audiences = [
    "5-year-old",
    "grandparent",
    "teenager",
    "business executive",
    "high school student",
    "retiree",
    "middle schooler",
    "singer",
    "superhero",
    "baseball player",
    "chef",
    "musician",
    "doctor",
    "engineer",
    "teacher",
    "firefighter",
    "police officer",
    "nurse",
    "scientist",
    "architect",
    "lawyer",
    "journalist",
    "photographer",
    "pilot",
    "marine biologist",
    "psychologist",
    "veterinarian",
    "gardener",
    "mechanic",
    "plumber",
    "carpenter",
    "painter",
    "sculptor",
    "dancer",
    "writer",
    "poet",
  ];

  // Initialize current topic and audience
  useEffect(() => {
    if (topics.length > 0 && audiences.length > 0) {
      setCurrentTopic(topics[0]);
      setCurrentAudience(audiences[0]);
      setLastTopic(topics[0]);
      setLastAudience(audiences[0]);
    }
  }, []);

  const getRandomTopic = () => {
    const availableTopics = topics.filter((topic) => topic !== lastTopic);
    return availableTopics[Math.floor(Math.random() * availableTopics.length)];
  };

  const getRandomAudience = () => {
    const availableAudiences = audiences.filter(
      (audience) => audience !== lastAudience
    );
    return availableAudiences[
      Math.floor(Math.random() * availableAudiences.length)
    ];
  };

  const fullText = `Explain ${currentTopic} like I'm a ${currentAudience}`;
  const topicText = `Explain ${currentTopic} like I'm a `;
  const audienceText = `${currentAudience}`;

  useEffect(() => {
    const typeSpeed = isDeleting ? 50 : 100;
    const deleteSpeed = 30;
    const pauseTime = 2000;

    const timer = setTimeout(
      () => {
        if (!isDeleting && currentText === fullText) {
          // Pause at the end of typing with blinking cursor
          setIsPaused(true);
          setTimeout(() => {
            setIsPaused(false);
            setIsDeleting(true);
            // Randomly choose next typing mode and update topic/audience
            const modes: ("full" | "audience" | "topic")[] = [
              "full",
              "audience",
              "topic",
            ];
            const randomMode = modes[Math.floor(Math.random() * modes.length)];
            setTypingMode(randomMode);

            // Update topic and/or audience based on mode
            if (randomMode === "audience") {
              const newAudience = getRandomAudience();
              setLastAudience(currentAudience);
              setCurrentAudience(newAudience);
            } else if (randomMode === "topic") {
              const newTopic = getRandomTopic();
              setLastTopic(currentTopic);
              setCurrentTopic(newTopic);
            } else {
              // Full mode - randomly update both or just one
              const shouldUpdateTopic = Math.random() > 0.5;
              const shouldUpdateAudience = Math.random() > 0.5;
              if (shouldUpdateTopic) {
                const newTopic = getRandomTopic();
                setLastTopic(currentTopic);
                setCurrentTopic(newTopic);
              }
              if (shouldUpdateAudience) {
                const newAudience = getRandomAudience();
                setLastAudience(currentAudience);
                setCurrentAudience(newAudience);
              }
            }
          }, pauseTime);
        } else if (isDeleting && currentText === "") {
          // Move to next phrase after deleting
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % 1000); // Use large number for variety
          setTypingMode("full");
          // Always update both topic and audience for full cycles
          const newTopic = getRandomTopic();
          const newAudience = getRandomAudience();
          setLastTopic(currentTopic);
          setLastAudience(currentAudience);
          setCurrentTopic(newTopic);
          setCurrentAudience(newAudience);
        } else if (isDeleting) {
          // Delete character based on typing mode
          let targetText = "";
          if (typingMode === "audience") {
            targetText = topicText;
          } else if (typingMode === "topic") {
            targetText = "Explain ";
          } else {
            targetText = "";
          }

          if (currentText === targetText) {
            // Start typing the new content
            setIsDeleting(false);
          } else {
            setCurrentText(currentText.slice(0, currentText.length - 1));
          }
        } else {
          // Type character based on typing mode
          let targetText = "";
          if (typingMode === "audience") {
            targetText = topicText + audienceText;
          } else if (typingMode === "topic") {
            targetText = fullText;
          } else {
            targetText = fullText;
          }

          if (currentText === targetText) {
            // Pause before next action
            setIsPaused(true);
            setTimeout(() => {
              setIsPaused(false);
              setIsDeleting(true);
              // Randomly choose next typing mode and update topic/audience
              const modes: ("full" | "audience" | "topic")[] = [
                "full",
                "audience",
                "topic",
              ];
              const randomMode =
                modes[Math.floor(Math.random() * modes.length)];
              setTypingMode(randomMode);

              // Update topic and/or audience based on mode
              if (randomMode === "audience") {
                const newAudience = getRandomAudience();
                setLastAudience(currentAudience);
                setCurrentAudience(newAudience);
              } else if (randomMode === "topic") {
                const newTopic = getRandomTopic();
                setLastTopic(currentTopic);
                setCurrentTopic(newTopic);
              } else {
                // Full mode - randomly update both or just one
                const shouldUpdateTopic = Math.random() > 0.5;
                const shouldUpdateAudience = Math.random() > 0.5;
                if (shouldUpdateTopic) {
                  const newTopic = getRandomTopic();
                  setLastTopic(currentTopic);
                  setCurrentTopic(newTopic);
                }
                if (shouldUpdateAudience) {
                  const newAudience = getRandomAudience();
                  setLastAudience(currentAudience);
                  setCurrentAudience(newAudience);
                }
              }
            }, pauseTime);
          } else {
            setCurrentText(targetText.slice(0, currentText.length + 1));
          }
        }
      },
      isDeleting ? deleteSpeed : typeSpeed
    );

    return () => clearTimeout(timer);
  }, [
    currentText,
    isDeleting,
    fullText,
    currentIndex,
    typingMode,
    topicText,
    audienceText,
    currentTopic,
    currentAudience,
    lastTopic,
    lastAudience,
  ]);

  // Handle blinking cursor when paused
  useEffect(() => {
    let blinkInterval: NodeJS.Timeout;
    let blinkDelay: NodeJS.Timeout;

    if (isPaused) {
      // Delay before starting to blink
      setIsBlinking(true);
      blinkDelay = setTimeout(() => {
        blinkInterval = setInterval(() => {
          setIsBlinking((prev) => !prev);
        }, 500); // Blink every 500ms
      }, 300); // 800ms delay before blinking starts
    } else {
      setIsBlinking(false); // Always visible when not paused
    }

    return () => {
      if (blinkInterval) {
        clearInterval(blinkInterval);
      }
      if (blinkDelay) {
        clearTimeout(blinkDelay);
      }
    };
  }, [isPaused]);

  return (
    <div className="text-left mb-12">
      <h1 className="font-bold text-white font-[PlantinMTProSemiBold] text-[1rem] md:text-[2rem] lg:text-[3rem] leading-none">
        {currentText}
        <span
          className={`${
            isPaused
              ? isBlinking
                ? "opacity-100"
                : "opacity-0"
              : "opacity-100"
          } transition-none`}
        >
          |
        </span>
      </h1>
    </div>
  );
};

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

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [recentAnalogies, setRecentAnalogies] = useState<AnalogyData[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [allUserAnalogies, setAllUserAnalogies] = useState<AnalogyData[]>([]);
  const [loadingRecentAnalogies, setLoadingRecentAnalogies] = useState(false);
  const [deletingAnalogy, setDeletingAnalogy] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [analogyToDelete, setAnalogyToDelete] = useState<string | null>(null);
  const { streakData, loadingStreak } = useStreak();
  const [showStreakModal, setShowStreakModal] = useState(false);

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
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchFirstName = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("user_information")
          .select("first_name")
          .eq("id", user.id)
          .single();

        if (!error && data?.first_name) {
          setFirstName(data.first_name);
        } else {
          console.warn("Failed to fetch first name:", error?.message);
        }
      }
    };

    fetchFirstName();
  }, [user]);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("personality_answers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        const dismissed =
          sessionStorage.getItem("onboarding-dismissed") === "true";

        if ((!data || error) && !dismissed) {
          setShowOnboarding(true);
        } else if ((!data || error) && dismissed) {
          setShowReminder(true);
        }
      }
    };

    checkOnboarding();
  }, [user]);

  // Utility function to refresh analogies
  const refreshAnalogies = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingRecentAnalogies(true);
      const response: UserAnalogiesResponse = await api.getUserAnalogies(
        user.id
      );

      // Store all analogies for potential replacement
      setAllUserAnalogies(response.analogies);

      // Get the 3 most recent analogies
      const recent = response.analogies.slice(0, 3);
      setRecentAnalogies(recent);
    } catch (err) {
      console.error("Error refreshing analogies:", err);
    } finally {
      setLoadingRecentAnalogies(false);
    }
  }, [user]);

  useEffect(() => {
    const fetchRecentAnalogies = async () => {
      if (user) {
        try {
          setLoadingRecentAnalogies(true);
          console.log("Fetching recent analogies for user:", user.id);
          const response: UserAnalogiesResponse = await api.getUserAnalogies(
            user.id
          );
          console.log("API response:", response);

          // Store all analogies for potential replacement
          setAllUserAnalogies(response.analogies);

          // Get the 3 most recent analogies
          const recent = response.analogies.slice(0, 3);
          console.log("Recent analogies:", recent);
          setRecentAnalogies(recent);
        } catch (err) {
          console.error("Error fetching recent analogies:", err);
        } finally {
          setLoadingRecentAnalogies(false);
        }
      }
    };

    fetchRecentAnalogies();
  }, [user]);

  // Refresh analogies when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        refreshAnalogies();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refreshAnalogies();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, refreshAnalogies]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleViewAnalogy = (analogyId: string) => {
    router.push(`/results/${analogyId}`);
  };

  const handleDeleteAnalogy = async (
    analogyId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent card click

    setAnalogyToDelete(analogyId);
    setShowDeleteModal(true);
  };

  const confirmDeleteAnalogy = async () => {
    if (!analogyToDelete) return;

    try {
      setDeletingAnalogy(analogyToDelete);
      await api.deleteAnalogy(analogyToDelete);

      // Update both states atomically
      setAllUserAnalogies((prev) => {
        const updatedAllAnalogies = prev.filter(
          (analogy) => analogy.id !== analogyToDelete
        );

        // Update recent analogies based on the updated all analogies
        setRecentAnalogies((currentRecent) => {
          const filtered = currentRecent.filter(
            (analogy) => analogy.id !== analogyToDelete
          );

          // If we have fewer than 3 analogies and there are more available, add the next one
          if (
            filtered.length < 3 &&
            updatedAllAnalogies.length > filtered.length
          ) {
            const nextAnalogy = updatedAllAnalogies[filtered.length]; // Get the next analogy after the current filtered ones

            if (nextAnalogy) {
              return [...filtered, nextAnalogy];
            }
          }

          return filtered;
        });

        return updatedAllAnalogies;
      });

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

  const handleStreakClick = () => {
    setShowStreakModal(true);
  };

  if (loading || !user) {
    return null;
  }

  return (
    <>
      {showOnboarding && (
        <Modal
          isOpen={showOnboarding}
          onClose={() => {
            sessionStorage.setItem("onboarding-dismissed", "true");
            setShowOnboarding(false);
            setShowReminder(true);
          }}
        >
          <OnboardingFlow
            onComplete={() => {
              sessionStorage.setItem("onboarding-dismissed", "true");
              setShowOnboarding(false);
              setShowReminder(false);
            }}
          />
        </Modal>
      )}

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

      <StreakModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        isNewStreak={false}
      />

      {showReminder && (
        <div className="fixed bottom-6 right-6 z-40">
          <MovingBorderButton
            onClick={() => {
              setShowOnboarding(true);
              setShowReminder(false);
            }}
            borderRadius="3rem"
            duration={3000}
            containerClassName="w-auto h-auto"
            borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
            className="bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md px-4 py-3 font-medium transition"
          >
            <HiOutlineUserCircle className="mr-1 text-2xl" /> Getting to Know
            You
          </MovingBorderButton>
        </div>
      )}

      <LampContainer>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="min-h-screen w-full pt-32 px-6 pb-12 sm:px-10 lg:px-24"
        >
          <motion.div
            className="space-y-12"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.2,
                },
              },
            }}
          >
            {/* Welcome Section */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-6"
            >
              <div className="relative w-fit after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-white">
                <h2 className="font-bold text-white mb-1 font-[PlantinMTProSemiBold] text-[3rem] md:text-[4rem] leading-none">
                  Welcome{firstName ? `, ${firstName}` : ""}
                </h2>
              </div>
              <p className="text-xl text-gray-400">
                Ready to explore complex topics through powerful analogies?
              </p>
            </motion.div>

            {/* Typewriter Heading */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <TypewriterHeading />
            </motion.div>

            {/* BentoGrid Dashboard */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <BentoGridDashboard className="max-w-6xl mx-auto">
                {/* Generate New Analogy */}
                <BentoGridItem
                  className="md:col-span-3 cursor-pointer group"
                  title="Generate New Analogy"
                  description="Create a fresh analogy by selecting your topic and audience"
                  icon={
                    <HiOutlineLightBulb className="text-4xl text-white transition-colors" />
                  }
                  header={
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white font-medium">
                        Create
                      </div>
                      <div className="text-xs text-white">AI-Powered</div>
                    </div>
                  }
                  onClick={() => router.push("/")}
                  skeleton={
                    <motion.div
                      className="absolute -top-10 -right-10 w-32 h-32 opacity-20"
                      whileHover={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 2,
                        ease: "linear",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-full h-full"
                      >
                        <path d="M9 18h6" />
                        <path d="M10 22h4" />
                        <path d="M12 2a7 7 0 0 0-4.9 11.9c.6.6.9 1.3.9 2.1v.5h8v-.5c0-.8.3-1.5.9-2.1A7 7 0 0 0 12 2z" />
                      </svg>
                    </motion.div>
                  }
                />

                {/* User Settings */}
                <BentoGridItem
                  className="md:col-span-2 cursor-pointer group"
                  title="User Settings"
                  description="Customize your profile and preferences"
                  icon={
                    <HiOutlineCog className="text-4xl text-white transition-colors" />
                  }
                  header={
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white font-medium">
                        Configure
                      </div>
                      <div className="text-xs text-white">Personal</div>
                    </div>
                  }
                  onClick={() => router.push("/settings")}
                  skeleton={
                    <motion.div
                      className="absolute -top-12 -right-12 w-32 h-32 opacity-20"
                      whileHover={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 2,
                        ease: "linear",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        className="w-full h-full"
                      >
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                      </svg>
                    </motion.div>
                  }
                />

                {/* View Past Analogies */}
                <BentoGridItem
                  className="md:col-span-2 cursor-pointer group"
                  title="View Past Analogies"
                  description="Browse and manage your previously created analogies"
                  icon={
                    <HiOutlineClock className="text-4xl text-white transition-colors" />
                  }
                  header={
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white font-medium">
                        History
                      </div>
                      <div className="text-xs text-white">Your Collection</div>
                    </div>
                  }
                  onClick={() => router.push("/past-analogies")}
                  skeleton={
                    <motion.div
                      className="absolute -top-12 -right-12 w-32 h-32 opacity-20"
                      whileHover={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 3,
                        ease: "linear",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        className="w-full h-full"
                        style={{ transform: "rotate(160deg)" }}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                    </motion.div>
                  }
                />

                {/* Manage Pricing Plan */}
                <BentoGridItem
                  className="md:col-span-2 cursor-pointer group"
                  title="Manage Pricing Plan"
                  description="Generate unlimited analogies"
                  icon={
                    <HiOutlineCreditCard className="text-4xl text-white transition-colors" />
                  }
                  header={
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white font-medium">
                        Upgrade
                      </div>
                      <div className="text-xs text-white">Plan</div>
                    </div>
                  }
                  onClick={() => router.push("/pricing")}
                  skeleton={
                    <motion.div
                      className="absolute -top-10 -right-10 w-32 h-32 opacity-20"
                      whileHover={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 2,
                        ease: "linear",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-full h-full"
                      >
                        <rect
                          x="1"
                          y="4"
                          width="22"
                          height="16"
                          rx="2"
                          ry="2"
                        />

                        <line x1="1" y1="9" x2="23" y2="9" />

                        <rect x="3" y="11" width="4" height="3" rx="0.5" />

                        <line x1="10" y1="13" x2="14" y2="13" />
                        <line x1="10" y1="15" x2="14" y2="15" />

                        <line x1="10" y1="17" x2="18" y2="17" />

                        <circle
                          cx="20"
                          cy="15"
                          r="1.5"
                          fill="white"
                          opacity="0.8"
                        />
                        <circle
                          cx="21.5"
                          cy="15"
                          r="1.5"
                          fill="white"
                          opacity="0.4"
                        />
                      </svg>
                    </motion.div>
                  }
                />

                {/* Daily Streak */}
                <BentoGridItem
                  className="cursor-pointer group"
                  title="Daily Streak"
                  description="Keep your streak alive"
                  icon={
                    <HiOutlineFire className="text-4xl text-white transition-colors" />
                  }
                  header={
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white font-medium">
                        Daily
                      </div>
                      <div className="text-xs text-white">
                        {loadingStreak
                          ? "..."
                          : `${streakData?.current_streak_count || 0} ${
                              (streakData?.current_streak_count || 0) === 1
                                ? "day"
                                : "days"
                            }`}
                      </div>
                    </div>
                  }
                  onClick={handleStreakClick}
                  skeleton={
                    <motion.div
                      className="absolute -top-12 -right-12 w-32 h-32 opacity-20"
                      whileHover={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 2,
                        ease: "linear",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        className="w-full h-full"
                      >
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                      </svg>
                    </motion.div>
                  }
                />
              </BentoGridDashboard>
            </motion.div>

            {/* Recent Activity Section */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="rounded-lg border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Recent Activity
                </h3>
                {recentAnalogies.length > 0 && (
                  <button
                    onClick={() => router.push("/past-analogies")}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View All
                  </button>
                )}
              </div>

              {loadingRecentAnalogies ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((id) => (
                    <div
                      key={id}
                      className="bg-black/20 rounded-lg p-6 border border-white/10 animate-pulse"
                    >
                      <div className="h-4 bg-gray-700 rounded mb-3"></div>
                      <div className="h-3 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : recentAnalogies.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HiOutlineLightBulb className="w-8 h-8 text-purple-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-300 mb-2">
                    No Recent Activity
                  </h4>
                  <p className="text-gray-500 mb-6">
                    Create your first analogy to see it appear here
                  </p>
                  <MovingBorderButton
                    onClick={() => router.push("/")}
                    borderRadius="0.5rem"
                    duration={3000}
                    containerClassName="w-auto h-auto"
                    borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                    className="px-6 py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md"
                  >
                    Create Your First Analogy
                  </MovingBorderButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentAnalogies.map((analogy, index) => (
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
                              <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">
                                {analogy.analogy_json.title}
                              </h4>
                              <p className="text-sm text-gray-400">
                                Explain {analogy.topic} like I&apos;m a{" "}
                                {analogy.audience}
                              </p>
                            </div>
                            <button
                              onClick={(e) =>
                                handleDeleteAnalogy(analogy.id, e)
                              }
                              disabled={deletingAnalogy === analogy.id}
                              className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete analogy"
                            >
                              {deletingAnalogy === analogy.id ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <HiOutlineTrash className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Summary */}
                          <p className="text-gray-300 text-sm mb-4 flex-1 line-clamp-3 transition duration-200 group-hover:translate-x-1">
                            {truncateText(analogy.analogy_json.summary, 100)}
                          </p>

                          {/* Preview Images */}
                          {analogy.image_urls &&
                            analogy.image_urls.length > 0 && (
                              <div className="flex space-x-2 mb-4 transition duration-200 group-hover:translate-x-1">
                                {analogy.image_urls.map((url, imgIndex) => (
                                  <div
                                    key={imgIndex}
                                    className="w-12 h-12 rounded-md overflow-hidden bg-gray-800 flex-shrink-0"
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
                              <HiOutlineClock className="w-3 h-3" />
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
            </motion.div>
          </motion.div>
        </motion.div>
      </LampContainer>
    </>
  );
}
