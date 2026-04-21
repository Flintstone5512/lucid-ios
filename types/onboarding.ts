export type UserType = "solo" | "parent" | "child";

export type DeckSourceType = "anki" | "ai" | "starter";

export type RulePreset = {
  cardsRequired: number;
  minutesUnlocked: number;
  dailyMaxMinutes: number;
  allowParentOverrides: boolean;
};

export type Permissions = {
  iosAuthorized?: boolean;
  androidUsageAccess?: boolean;
  androidOverlayAccess?: boolean;
  androidAccessibilityAccess?: boolean;
};

export type OnboardingState = {
  userType: UserType | null;
  deckSource: DeckSourceType | null;
  selectedStarterDeck: string | null;
  rules: RulePreset;
  permissions: Permissions;
  supportedOriginsGranted: string[];
};