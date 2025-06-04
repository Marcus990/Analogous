'use client';

import { useState, DragEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { HoloCard } from '@/components/HoloCard';

export default function Home() {
  const { topicCard, audienceCard, setTopicCard, setAudienceCard, cards, addCard } = useStore();
  const [newCard, setNewCard] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAnalogy, setGeneratedAnalogy] = useState('');

  const handleSubmit = async () => {
    if (!topicCard || !audienceCard) return;

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/generate-analogy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topicCard,
          audience: audienceCard,
        }),
      });

      const data = await response.json();
      setGeneratedAnalogy(data.analogy);
    } catch (error) {
      console.error('Error generating analogy:', error);
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

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, setCard: (card: string) => void) => {
    e.preventDefault();
    const card = e.dataTransfer.getData('text/plain');
    setCard(card);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, card: string, setCard: (card: string | null) => void) => {
    e.dataTransfer.setData('text/plain', card);
    setCard(null);
  };

  return (
    <div className="flex flex-col items-center space-y-8">
      <h1 className="text-4xl font-bold text-center">
        Explain to me{' '}
        <span className="text-purple-400">
          {topicCard || '[drag topic here]'}
        </span>{' '}
        like I'm a{' '}
        <span className="text-purple-400">
          {audienceCard || '[drag audience here]'}
        </span>
      </h1>

      <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
        <div
          className="h-32 border-2 border-dashed border-purple-400 rounded-lg flex items-center justify-center bg-black/20"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, setTopicCard)}
        >
          {topicCard ? (
            <HoloCard
              text={topicCard}
              className="cursor-move"
              draggable
              onDragStart={(e) => handleDragStart(e, topicCard, setTopicCard)}
            />
          ) : (
            <span className="text-gray-400">Drop topic here</span>
          )}
        </div>

        <div
          className="h-32 border-2 border-dashed border-purple-400 rounded-lg flex items-center justify-center bg-black/20"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, setAudienceCard)}
        >
          {audienceCard ? (
            <HoloCard
              text={audienceCard}
              className="cursor-move"
              draggable
              onDragStart={(e) => handleDragStart(e, audienceCard, setAudienceCard)}
            />
          ) : (
            <span className="text-gray-400">Drop audience here</span>
          )}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-6 py-3 rounded-lg font-medium ${
          topicCard && audienceCard
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'bg-gray-600 cursor-not-allowed'
        }`}
        onClick={handleSubmit}
        disabled={!topicCard || !audienceCard || isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Analogy'}
      </motion.button>

      {generatedAnalogy && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl p-6 bg-black/20 rounded-lg border border-purple-400"
        >
          <h2 className="text-xl font-semibold mb-4">Generated Analogy</h2>
          <p className="text-gray-300">{generatedAnalogy}</p>
        </motion.div>
      )}

      <div className="w-full max-w-4xl mt-8">
        <form onSubmit={handleAddCard} className="flex gap-4">
          <input
            type="text"
            value={newCard}
            onChange={(e) => setNewCard(e.target.value)}
            placeholder="Enter a new card..."
            className="flex-1 px-4 py-2 rounded-lg bg-black/20 border border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 font-medium"
          >
            Add Card
          </button>
        </form>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {cards.map((card: string, index: number) => (
            <HoloCard
              key={index}
              text={card}
              className="cursor-move"
              draggable
              onDragStart={(e: DragEvent<HTMLDivElement>) => {
                e.dataTransfer.setData('text/plain', card);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
