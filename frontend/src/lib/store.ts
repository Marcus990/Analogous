import { create } from "zustand";
import { Analogy } from "./supabase";

interface AppState {
  cards: string[];
  addCard: (card: string) => void;
  removeCard: (index: number) => void;
  topicCard: string | null;
  audienceCard: string | null;
  setTopicCard: (card: string | null) => void;
  setAudienceCard: (card: string | null) => void;
  analogies: Analogy[];
  setAnalogies: (analogies: Analogy[]) => void;
  addAnalogy: (analogy: Analogy) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  cards: [],
  addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
  removeCard: (index) =>
    set((state) => ({
      cards: state.cards.filter((_, i) => i !== index),
    })),

  topicCard: null,
  audienceCard: null,
  setTopicCard: (card) => set({ topicCard: card }),
  setAudienceCard: (card) => set({ audienceCard: card }),

  analogies: [],
  setAnalogies: (analogies) => set({ analogies }),
  addAnalogy: (analogy) =>
    set((state) => ({
      analogies: [analogy, ...state.analogies],
    })),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
