import { create } from "zustand";

type SessionState = {
  cards: any[];
  currentIndex: number;
  completed: number;

  deckId: string | null;

  startSession: (cards: any[], deckId: string) => void;
  nextCard: () => void;
  resetSession: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  cards: [],
  currentIndex: 0,
  completed: 0,
  deckId: null,

  startSession: (cards, deckId) =>
    set({
      cards,
      currentIndex: 0,
      completed: 0,
      deckId,
    }),

  nextCard: () =>
    set((state) => ({
      currentIndex: state.currentIndex + 1,
      completed: state.completed + 1,
    })),

  resetSession: () =>
    set({
      cards: [],
      currentIndex: 0,
      completed: 0,
      deckId: null,
    }),
}));