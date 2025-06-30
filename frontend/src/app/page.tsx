'use client';

import { useState, DragEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { HoloCard } from '@/components/HoloCard';
import ExplainWords from '@/components/ExplainWords';
import { LampContainer } from '@/components/LampContainer';
import { FadeInStagger } from '@/components/FadeInStagger';
import { MovingBorderButton } from '@/components/MovingBorder';
import { FollowerPointerCard } from '@/components/FollowingPointer';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    topicCard,
    audienceCard,
    setTopicCard,
    setAudienceCard,
    cards,
    addCard,
  } = useStore();

  const [newCard, setNewCard] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lampFinished, setLampFinished] = useState(false);

  const handleSubmit = async () => {
    if (!topicCard || !audienceCard) return;
    
    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await api.generateAnalogy({
        topic: topicCard,
        audience: audienceCard,
        user_id: user.id,
      });
      
      // Redirect to results page with the analogy ID
      if (response.id) {
        router.push(`/results/${response.id}`);
      } else {
        // Fallback: redirect to results with a temporary ID
        router.push(`/results/temp-${Date.now()}`);
      }
    } catch (error) {
      console.error('Error generating analogy:', error);
      // Handle error - you might want to show a toast notification
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCard = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newCard.trim()) {
      addCard(newCard.trim());
      setNewCard('');
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
    setCard: (card: string) => void
  ) => {
    e.preventDefault();
    const card = e.dataTransfer.getData('text/plain');
    setCard(card);
  };

  const handleDragStart = (
    e: DragEvent<HTMLDivElement>,
    card: string,
    clearCard: (card: string | null) => void
  ) => {
    e.dataTransfer.setData('text/plain', card);
    clearCard(null);
  };

  return (
    <LampContainer onFinish={() => setLampFinished(true)}>
      <FadeInStagger delayStart={lampFinished}>
        <div className="pt-32 px-4 md:px-12 max-w-screen-lg mx-auto">
          <ExplainWords
            onDragOver={handleDragOver}
            onDropTopic={(e) => handleDrop(e, setTopicCard)}
            onDropAudience={(e) => handleDrop(e, setAudienceCard)}
            topicCard={topicCard}
            audienceCard={audienceCard}
            onDragStartTopic={(e) => {
              if (topicCard) handleDragStart(e, topicCard, setTopicCard);
            }}
            onDragStartAudience={(e) => {
              if (audienceCard) handleDragStart(e, audienceCard, setAudienceCard);
            }}
          />

          <div className="mt-12 flex flex-col items-center space-y-8">
            <div className="my-6">
              {topicCard && audienceCard ? (
                <MovingBorderButton
                  onClick={handleSubmit}
                  disabled={isGenerating}
                  borderRadius="0.5rem"
                  duration={3000}
                  containerClassName="w-auto h-auto"
                  borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                  className="min-w-[220px] px-8 py-3 rounded-lg font-medium transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md"
                >
                  {isGenerating ? 'Generating...' : 'Generate Analogy'}
                </MovingBorderButton>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="min-w-[220px] px-8 py-3 rounded-lg font-medium transition bg-gray-600 cursor-not-allowed border border-white/50 text-white"
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

              <div className="rounded-lg border border-white/10 bg-white/5 p-6 my-6 ">
              <div className="pt-6 pb-12 z-[100] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 relative overflow-hidden">
                {cards.map((card: string, index: number) => (
                  <FollowerPointerCard
                    key={index}
                    title="Drag & Drop!"
                    className="w-full h-full"
                  >
                    <HoloCard
                      text={card}
                      className="cursor-move w-full h-full"
                      draggable
                      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                        e.dataTransfer.setData("text/plain", card);
                      }}
                    />
                  </FollowerPointerCard>
                ))}
              </div>
              </div>

            </div>
          </div>
        </div>
      </FadeInStagger>
    </LampContainer>
  );
}
