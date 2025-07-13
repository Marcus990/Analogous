"use client";

import { useState, DragEvent, FormEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useStreak } from "@/lib/streakContext";
import { api } from "@/lib/api";
import { HoloCard } from "@/components/HoloCard";
import ExplainWords from "@/components/ExplainWords";
import { LampContainer } from "@/components/LampContainer";
import { FadeInStagger } from "@/components/FadeInStagger";
import { MovingBorderButton } from "@/components/MovingBorder";
import { FollowerPointerCard } from "@/components/FollowingPointer";
import { IconSquare } from "@tabler/icons-react";

interface CardPosition {
  id: string;
  x: number;
  y: number;
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshStreakData } = useStreak();
  const {
    topicCard,
    audienceCard,
    setTopicCard,
    setAudienceCard,
    cards,
    addCard,
    removeCard,
  } = useStore();

  const [newCard, setNewCard] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lampFinished, setLampFinished] = useState(false);
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cardWithOpenMenu, setCardWithOpenMenu] = useState<string | null>(null);
  const [canStopGeneration, setCanStopGeneration] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Initialize card positions when cards change
  useEffect(() => {
    // Only initialize positions for new cards that don't already have positions
    const existingPositions = cardPositions.filter((pos) =>
      cards.includes(pos.id)
    );

    const newCards = cards.filter(
      (card) => !cardPositions.some((pos) => pos.id === card)
    );

    if (newCards.length > 0) {
      const newPositions = newCards.map((card) => {
        const position = findUnoccupiedPosition();
        return {
          id: card,
          x: position.x,
          y: position.y,
        };
      });

      setCardPositions((prev) => [...prev, ...newPositions]);
    }

    // Clean up positions for cards that no longer exist
    const validPositions = cardPositions.filter((pos) =>
      cards.includes(pos.id)
    );
    if (validPositions.length !== cardPositions.length) {
      setCardPositions(validPositions);
    }
  }, [cards, cardPositions]);

  const handleMouseDown = (e: React.MouseEvent, cardId: string) => {
    const card = cardPositions.find((pos) => pos.id === cardId);
    if (!card || !workspaceRef.current) return;

    const workspaceRect = workspaceRef.current.getBoundingClientRect();
    const offsetX = e.clientX - workspaceRect.left - card.x;
    const offsetY = e.clientY - workspaceRect.top - card.y;

    setDraggedCard(cardId);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggedCard || !workspaceRef.current) return;

    const workspaceRect = workspaceRef.current.getBoundingClientRect();
    const newX = e.clientX - workspaceRect.left - dragOffset.x;
    const newY = e.clientY - workspaceRect.top - dragOffset.y;

    // Use responsive card dimensions
    const cardWidth = Math.min(180, workspaceRect.width * 0.15); // Responsive width
    const cardHeight = Math.min(90, cardWidth * 0.64); // Maintain aspect ratio

    // Account for the actual card container dimensions from CSS
    const actualCardWidth = 180; // Fixed width from CSS clamp
    const actualCardHeight = 90; // Fixed height from CSS clamp

    // Use the full workspace area - cards can touch all borders
    const maxX = workspaceRect.width - actualCardWidth;
    const maxY = workspaceRect.height - actualCardHeight;

    // Ensure cards stay fully within the workspace bounds
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    setCardPositions((prev) =>
      prev.map((pos) =>
        pos.id === draggedCard
          ? { ...pos, x: constrainedX, y: constrainedY }
          : pos
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedCard(null);
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (draggedCard) {
      const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
      const handleGlobalMouseUp = () => handleMouseUp();

      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [draggedCard, dragOffset]);

  // Add global drop handler for cards dropped outside drop boxes
  useEffect(() => {
    const handleDocumentDrop = (e: Event) => {
      if (draggedCard) {
        // Return card to original position if dropped outside drop boxes
        setCardPositions((prev) =>
          prev.map((pos) =>
            pos.id === draggedCard
              ? { ...pos, x: pos.x, y: pos.y } // Keep original position
              : pos
          )
        );
        setDraggedCard(null);
      }
    };

    document.addEventListener("drop", handleDocumentDrop);
    return () => {
      document.removeEventListener("drop", handleDocumentDrop);
    };
  }, [draggedCard]);

  const handleSubmit = async () => {
    if (!topicCard || !audienceCard) return;

    // Check if user is authenticated
    if (!user) {
      router.push("/login");
      return;
    }

    setIsGenerating(true);
    setCanStopGeneration(true);
    
    // Create a new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      const response = await api.generateAnalogy({
        topic: topicCard,
        audience: audienceCard,
        user_id: user.id,
      }, controller.signal);

      // Wait a moment for the backend to complete all updates (streak, lifetime count, etc.)
      // This ensures the database is fully updated before we fetch the latest data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh streak data to get the latest information before redirecting
      // This ensures the results page will have the most up-to-date streak data
      try {
        await refreshStreakData();
      } catch (error) {
        console.error("Error refreshing streak data:", error);
        // Continue with redirect even if streak refresh fails
      }

      // Redirect to results page with the analogy ID
      if (response.id) {
        router.push(`/results/${response.id}`);
      } else {
        // Fallback: redirect to results with a temporary ID
        router.push(`/results/temp-${Date.now()}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Analogy generation was cancelled by user");
        // Don't show error message for user-initiated cancellation
      } else {
        console.error("Error generating analogy:", error);
        // Handle error - you might want to show a toast notification
        alert("Failed to generate analogy. Please try again.");
      }
    } finally {
      setIsGenerating(false);
      setCanStopGeneration(false);
      setAbortController(null);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      console.log("Cancelling analogy generation...");
    }
    setIsGenerating(false);
    setCanStopGeneration(false);
    setAbortController(null);
    // Note: The actual API call cannot be cancelled, but we stop the UI state
    // The user can now modify their topic/audience cards again
  };

  const handleAddCard = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newCard.trim()) {
      addCard(newCard.trim());
      setNewCard("");
    }
  };

  const handleRemoveTopic = (cardText: string) => {
    if (isGenerating) return; // Disable removal during generation
    
    setTopicCard(null);
    // Add the card back to the workspace in an unoccupied position
    if (!cards.includes(cardText)) {
      addCard(cardText);
      const position = findUnoccupiedPosition();
      setCardPositions((prev) => [
        ...prev,
        { id: cardText, x: position.x, y: position.y },
      ]);
    }
  };

  const handleRemoveAudience = (cardText: string) => {
    if (isGenerating) return; // Disable removal during generation
    
    setAudienceCard(null);
    // Add the card back to the workspace in an unoccupied position
    if (!cards.includes(cardText)) {
      addCard(cardText);
      const position = findUnoccupiedPosition();
      setCardPositions((prev) => [
        ...prev,
        { id: cardText, x: position.x, y: position.y },
      ]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
    setCard: (card: string) => void,
    currentCard: string | null
  ) => {
    e.preventDefault();
    const card = e.dataTransfer.getData("text/plain");

    // If there's already a card in the dropbox, return it to workspace
    if (currentCard && currentCard !== card) {
      // Add the existing card back to the workspace
      if (!cards.includes(currentCard)) {
        addCard(currentCard);
        const position = findUnoccupiedPosition();
        setCardPositions((prev) => [
          ...prev,
          { id: currentCard, x: position.x, y: position.y },
        ]);
      }
    }

    setCard(card);

    // If this was a physical drag from workspace, remove the card from workspace
    if (draggedCard && draggedCard === card) {
      const cardIndex = cards.findIndex((c) => c === card);
      if (cardIndex !== -1) {
        removeCard(cardIndex);
      }
      setCardPositions((prev) => prev.filter((pos) => pos.id !== card));
      setDraggedCard(null);
    }
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    card: string,
    clearCard: (card: string | null) => void
  ) => {
    e.dataTransfer.setData("text/plain", card);
    clearCard(null);
  };

  // Handle dropping cards outside drop boxes
  const handleGlobalDrop = (e: Event) => {
    if (draggedCard) {
      // Return card to original position if dropped outside drop boxes
      setCardPositions((prev) =>
        prev.map((pos) =>
          pos.id === draggedCard
            ? { ...pos, x: pos.x, y: pos.y } // Keep original position
            : pos
        )
      );
      setDraggedCard(null);
    }
  };

  const handleDropToTopic = (cardText: string) => {
    // If there's already a card in the topic dropbox, return it to workspace
    if (topicCard && topicCard !== cardText) {
      // Add the existing topic card back to the workspace
      if (!cards.includes(topicCard)) {
        addCard(topicCard);
        const position = findUnoccupiedPosition();
        setCardPositions((prev) => [
          ...prev,
          { id: topicCard, x: position.x, y: position.y },
        ]);
      }
    }

    setTopicCard(cardText);
    // Remove the new card from workspace
    const cardIndex = cards.findIndex((card) => card === cardText);
    if (cardIndex !== -1) {
      removeCard(cardIndex);
    }
    // Remove from positions
    setCardPositions((prev) => prev.filter((pos) => pos.id !== cardText));
  };

  const handleDropToAudience = (cardText: string) => {
    // If there's already a card in the audience dropbox, return it to workspace
    if (audienceCard && audienceCard !== cardText) {
      // Add the existing audience card back to the workspace
      if (!cards.includes(audienceCard)) {
        addCard(audienceCard);
        const position = findUnoccupiedPosition();
        setCardPositions((prev) => [
          ...prev,
          { id: audienceCard, x: position.x, y: position.y },
        ]);
      }
    }

    setAudienceCard(cardText);
    // Remove the new card from workspace
    const cardIndex = cards.findIndex((card) => card === cardText);
    if (cardIndex !== -1) {
      removeCard(cardIndex);
    }
    // Remove from positions
    setCardPositions((prev) => prev.filter((pos) => pos.id !== cardText));
  };

  // Calculate dynamic workspace height based on actual card positions and content
  const calculateWorkspaceHeight = () => {
    if (cardPositions.length === 0) {
      return 200; // Minimum height when no cards
    }

    // Find the highest card position and add card height plus padding
    const maxY = Math.max(...cardPositions.map((pos) => pos.y));
    const cardHeight = 90;
    const bottomPadding = 0; // Space below the lowest card

    // Calculate height needed based on actual card positions
    const contentHeight = maxY + cardHeight + bottomPadding;

    // Ensure minimum height and add some breathing room
    const minHeight = Math.max(300, window.innerHeight * 0.3); // Responsive minimum
    const calculatedHeight = Math.max(minHeight, contentHeight);

    // Add some extra space for better visual balance
    return calculatedHeight;
  };

  const workspaceHeight = calculateWorkspaceHeight();

  // Find an unoccupied position for a new card
  const findUnoccupiedPosition = () => {
    const cardWidth = 180;
    const cardHeight = 90;
    const padding = 20; // Space between cards

    // Grid-based positioning with collision detection
    const gridCols = Math.floor(
      (workspaceRef.current?.clientWidth || 800) / (cardWidth + padding)
    );
    const gridRows = Math.ceil(
      (workspaceRef.current?.clientHeight || 400) / (cardHeight + padding)
    );

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = col * (cardWidth + padding);
        const y = row * (cardHeight + padding);

        // Check if this position is occupied
        const isOccupied = cardPositions.some((pos) => {
          const distance = Math.sqrt(
            Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2)
          );
          return distance < (cardWidth + padding) / 2;
        });

        if (!isOccupied) {
          return { x, y };
        }
      }
    }

    // If no grid position is available, find a random unoccupied spot
    const maxAttempts = 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x =
        Math.random() *
        ((workspaceRef.current?.clientWidth || 800) - cardWidth);
      const y =
        Math.random() *
        ((workspaceRef.current?.clientHeight || 400) - cardHeight);

      const isOccupied = cardPositions.some((pos) => {
        const distance = Math.sqrt(
          Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2)
        );
        return distance < (cardWidth + padding) / 2;
      });

      if (!isOccupied) {
        return { x, y };
      }
    }

    // Fallback: position at the bottom right
    return {
      x: (workspaceRef.current?.clientWidth || 800) - cardWidth - 20,
      y: (workspaceRef.current?.clientHeight || 400) - cardHeight - 20,
    };
  };

  // Handle card deletion
  const handleDeleteCard = (cardText: string) => {
    // Find the index of the card to remove
    const cardIndex = cards.findIndex((card) => card === cardText);
    if (cardIndex !== -1) {
      // Remove from store using index
      removeCard(cardIndex);
    }
    // Remove from positions
    setCardPositions((prev) => prev.filter((pos) => pos.id !== cardText));
    // Clear menu state if this card had an open menu
    if (cardWithOpenMenu === cardText) {
      setCardWithOpenMenu(null);
    }
  };

  // Handle menu open/close
  const handleMenuOpen = (cardText: string) => {
    setCardWithOpenMenu(cardText);
  };

  const handleMenuClose = () => {
    setCardWithOpenMenu(null);
  };

  return (
    <LampContainer onFinish={() => setLampFinished(true)}>
      <FadeInStagger delayStart={lampFinished}>
        <div className="pt-32 px-4 md:px-12 max-w-screen-lg mx-auto">
          <ExplainWords
            onDragOver={handleDragOver}
            onDropTopic={(e) => handleDrop(e, setTopicCard, topicCard)}
            onDropAudience={(e) => handleDrop(e, setAudienceCard, audienceCard)}
            topicCard={topicCard}
            audienceCard={audienceCard}
            onDragStartTopic={(e) => {
              if (topicCard) handleDragStart(e, topicCard, setTopicCard);
            }}
            onDragStartAudience={(e) => {
              if (audienceCard)
                handleDragStart(e, audienceCard, setAudienceCard);
            }}
            onRemoveTopic={handleRemoveTopic}
            onRemoveAudience={handleRemoveAudience}
            isGenerating={isGenerating}
          />

          <div className="mt-12 flex flex-col items-center space-y-8">
            <div className="my-6">
              {topicCard && audienceCard ? (
                <div className="flex items-center justify-center space-x-4">
                  <MovingBorderButton
                    onClick={handleSubmit}
                    disabled={isGenerating}
                    borderRadius="0.5rem"
                    duration={3000}
                    containerClassName="w-auto h-auto"
                    borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                    className="min-w-[240px] px-8 py-3 rounded-lg font-large transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating...</span>
                      </div>
                    ) : (
                      "Generate Analogy"
                    )}
                  </MovingBorderButton>
                  
                  {canStopGeneration && (
                    <button
                      onClick={handleStopGeneration}
                      className="w-12 h-12 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md flex items-center justify-center"
                      title="Stop Generation"
                    >
                      <IconSquare className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="min-w-[240px] px-8 py-3 rounded-lg font-large transition bg-gray-600 cursor-not-allowed border border-white/50 text-white"
                  disabled
                >
                  Generate Analogy
                </motion.button>
              )}
            </div>

            <div className="w-full max-w-4xl mt-8">
              <form onSubmit={handleAddCard} className="flex gap-4">
                <input
                  type="text"
                  value={newCard}
                  onChange={(e) => setNewCard(e.target.value)}
                  placeholder="Enter a new card..."
                  className="flex-1 px-4 py-2 rounded-lg bg-black/20 border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <MovingBorderButton
                  type="submit"
                  borderRadius="0.5rem"
                  duration={3000}
                  containerClassName="w-auto h-auto"
                  borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                  className="px-8 py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md"
                >
                  Add Card
                </MovingBorderButton>
              </form>

              <div
                ref={workspaceRef}
                className="rounded-lg border border-white/10 bg-white/5 my-6 relative overflow-visible"
                style={{ minHeight: `${workspaceHeight}px` }}
              >
                <div
                  className="relative w-full h-full"
                  style={{ minHeight: `${workspaceHeight}px` }}
                >
                  {cards.map((card: string, index: number) => {
                    const position = cardPositions.find(
                      (pos) => pos.id === card
                    );
                    if (!position) return null;

                    // Determine z-index based on card state
                    let zIndex = 1;
                    if (draggedCard === card) {
                      zIndex = 1000; // Dragged card gets highest priority
                    } else if (cardWithOpenMenu === card) {
                      zIndex = 999; // Card with open menu gets second highest priority
                    } else {
                      // For other cards, use index-based z-index
                      zIndex = index + 10;
                    }

                    return (
                      <div
                        key={index}
                        className="absolute"
                        style={{
                          left: position.x,
                          top: position.y,
                          zIndex: zIndex,
                          width: "clamp(100px, 15vw, 180px)",
                        }}
                      >
                        <FollowerPointerCard
                          key={`follower-${card}`}
                          title="Drag & Drop!"
                          className="w-full cursor-move"
                        >
                          <HoloCard
                            text={card}
                            className="w-full"
                            showMenu={true}
                            fixedSize={true}
                            onDropToTopic={handleDropToTopic}
                            onDropToAudience={handleDropToAudience}
                            onDelete={handleDeleteCard}
                            onMenuOpen={() => handleMenuOpen(card)}
                            onMenuClose={handleMenuClose}
                            onMouseDown={(e) => handleMouseDown(e, card)}
                          />
                        </FollowerPointerCard>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeInStagger>
    </LampContainer>
  );
}
