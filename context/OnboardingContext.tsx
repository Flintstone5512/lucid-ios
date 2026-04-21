import React, { createContext, useContext, useMemo, useState } from "react";

/* 🔥 TYPES */
type GoalType = "language" | "money" | "memory" | "faith" | null;
type DeckSourceType = "anki" | "ai" | "starter" | null;
type UserType = "solo" | "parent" | "child" | null;
type UserIntent = "solo" | "child" | "parent" | null;

type RulePreset = {
  cardsRequired: number;

  // 🔥 keep BOTH for backward compatibility
  unlockMinutes: number;        // old (mobile)
  minutesUnlocked: number;      // new (extension)

  dailyMaxMinutes?: number;
  allowParentOverrides?: boolean;
};

type PermissionState = {
  iosAuthorized: boolean;
  androidUsageAccess: boolean;
  androidOverlayAccess: boolean;
  androidAccessibilityAccess: boolean;
};

type OnboardingState = {
  goal: GoalType;
  userType: UserType; // 🔥 NEW
  intent: UserIntent; // 🔥 NEW

  deckSource: DeckSourceType;

  permissions: PermissionState;

  rules: RulePreset;

  firstSessionCompleted: boolean;
};

type OnboardingContextType = {
  state: OnboardingState;

  setGoal: (goal: GoalType) => void;
  setUserType: (type: UserType) => void; // 🔥 NEW
  setIntent: (intent: UserIntent) => void;

  setDeckSource: (source: DeckSourceType) => void;

  setPermissions: (permissions: Partial<PermissionState>) => void;

  setRules: (rules: RulePreset) => void;

  setFirstSessionCompleted: (value: boolean) => void;

  resetOnboarding: () => void;
};

/* 🔥 DEFAULT STATE */
const defaultState: OnboardingState = {
  goal: null,
  userType: null, // 🔥 NEW
  intent: null,   // 🔥 NEW

  deckSource: null,

  permissions: {
    iosAuthorized: false,
    androidUsageAccess: false,
    androidOverlayAccess: false,
    androidAccessibilityAccess: false,
  },

  rules: {
    cardsRequired: 5,

    // 🔥 BOTH synced
    unlockMinutes: 10,
    minutesUnlocked: 10,

    dailyMaxMinutes: 60,
    allowParentOverrides: true,
  },

  firstSessionCompleted: false,
};

/* 🔥 CONTEXT */
const OnboardingContext = createContext<OnboardingContextType | null>(null);

/* 🔥 PROVIDER */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);

  const value = useMemo(
    () => ({
      state,

      setGoal: (goal: GoalType) =>
        setState((prev) => ({ ...prev, goal })),

      setUserType: (userType: UserType) =>
        setState((prev) => ({ ...prev, userType })),

      setIntent: (intent: UserIntent) =>
        setState((prev) => ({ ...prev, intent })),
      

      setDeckSource: (deckSource: DeckSourceType) =>
        setState((prev) => ({ ...prev, deckSource })),

      setPermissions: (permissions: Partial<PermissionState>) =>
        setState((prev) => ({
          ...prev,
          permissions: { ...prev.permissions, ...permissions },
        })),

      setRules: (rules: RulePreset) =>
        setState((prev) => ({
          ...prev,
          rules: {
            ...rules,

            // 🔥 keep both in sync
            unlockMinutes: rules.unlockMinutes ?? rules.minutesUnlocked,
            minutesUnlocked: rules.minutesUnlocked ?? rules.unlockMinutes,
          },
        })),

      setFirstSessionCompleted: (firstSessionCompleted: boolean) =>
        setState((prev) => ({ ...prev, firstSessionCompleted })),

      resetOnboarding: () => setState(defaultState),
    }),
    [state]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

/* 🔥 HOOK */
export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  }
  return ctx;
}