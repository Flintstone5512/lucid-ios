import { create } from "zustand";

type EnforcementMode = "soft" | "strict" | "off";
type AdMode = "none" | "ad_supported" | null;

type RefocusState = {
  context: any;
  streak: any;
  usage: any;

  plan: string | null;
  adMode: AdMode;
  limits: any;
  features: any;

  sessionCount: number;

  unlockedUntil: number;
  selectedDeckId: string | null;
  enforcementMode: EnforcementMode;

  setSelectedDeck: (deckId: string) => void;
  setEnforcementMode: (mode: EnforcementMode) => void;
  incrementSessionCount: () => void;
  resetSessionCount: () => void;
  setStatePatch: (patch: Partial<RefocusState>) => void;
};

export const useRefocusStore = create<RefocusState>((set) => ({
  context: null,
  streak: null,
  usage: null,

  plan: null,
  adMode: null,
  limits: {},
  features: {},

  sessionCount: 0,

  unlockedUntil: 0,
  selectedDeckId: null,
  enforcementMode: "soft",

  setSelectedDeck: (deckId) =>
    set({ selectedDeckId: deckId }),

  setEnforcementMode: (mode) =>
    set({ enforcementMode: mode }),

  incrementSessionCount: () =>
    set((state) => ({
      sessionCount: state.sessionCount + 1,
    })),

  resetSessionCount: () =>
    set({ sessionCount: 0 }),

  setStatePatch: (patch) =>
    set((state) => ({
      ...state,
      ...patch,

      plan: patch.context?.settings?.billing?.plan ?? state.plan,
      adMode: patch.context?.settings?.adMode ?? state.adMode,
      limits: patch.context?.settings?.limits ?? state.limits,
      features: patch.context?.settings?.features ?? state.features,
    })),
}));