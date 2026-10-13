// ─────────────────────────────────────────────────────────────
// Help & Support content
// Edit this file to update any help text — no UI changes needed.
// ─────────────────────────────────────────────────────────────

export type HelpItem = {
  question: string;
  answer: string;
};

export type HelpSection = {
  id: string;
  title: string;
  icon: string;
  items: HelpItem[];
};

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "blocking",
    title: "Blocking",
    icon: "🔒",
    items: [
      {
        question: "How does blocking work?",
        answer:
          "When blocking is ON, the apps you selected during setup are blocked from opening until you complete a study session. On iOS, this uses Apple's Screen Time API. On Android, it uses device usage access to restrict app usage.",
      },
      {
        question: "What's the difference between Soft and Strict mode?",
        answer:
          "Soft mode lets you dismiss the block screen after a short delay — it's a nudge, not a wall. Strict mode enforces the block until you have completed the required number of flashcards for that session.",
      },
      {
        question: "How do I turn blocking on or off?",
        answer:
          "Go to Control → Blocking and tap the large toggle. Green means blocking is active. Changes take effect immediately.",
      },
      {
        question: "Which apps can I block?",
        answer:
          "On iOS, go to Control → Blocked Apps → Re-select Blocked Apps to choose from your installed apps using Apple's Screen Time picker. On Android, the selection happens during the initial setup flow.",
      },
    ],
  },
  {
    id: "timer",
    title: "Timer Policy & Unlock",
    icon: "⏱",
    items: [
      {
        question: "What is Cards Required?",
        answer:
          "Cards Required is the number of flashcards you must review before your blocked apps unlock for the session. You set this number in Control → Timer Policy.",
      },
      {
        question: "What is Unlock Minutes?",
        answer:
          "After completing your required cards, your blocked apps unlock for this many minutes. When the timer expires, the block is automatically re-applied.",
      },
      {
        question: "What is Smart Blocking?",
        answer:
          "Smart Blocking automatically adjusts your Cards Required and Unlock Minutes based on your daily social media habits and learning performance. It looks at how much you've scrolled today, your retention rate, any active goals, and your XP balance — the smarter you study, the more flexibility you earn.",
      },
      {
        question: "How do I enable Smart Blocking?",
        answer:
          "In Control → Timer Policy, tap the Smart button on the right side of the section header. Smart Blocking will calculate a personalized policy and display the reasoning behind it. You can tap Recalculate Now at any time to refresh the values.",
      },
    ],
  },
  {
    id: "decks",
    title: "Decks & Flashcards",
    icon: "📚",
    items: [
      {
        question: "How do I create a deck?",
        answer:
          "Tap the Decks tab, then tap the + button. Give your deck a name and optionally a subject or goal. Once created, you can add cards manually or use AI generation.",
      },
      {
        question: "How do I add cards to a deck?",
        answer:
          "Open a deck and tap Add Card. Enter a front (question) and back (answer). You can also paste content and let the AI generate cards for you.",
      },
      {
        question: "What is the spaced repetition system?",
        answer:
          "The app uses a spaced repetition algorithm (similar to Anki) that shows you cards at the optimal time before you forget them. Cards you know well are shown less often; cards you struggle with appear more frequently.",
      },
      {
        question: "How do Card Limits work?",
        answer:
          "New Cards per Day limits how many brand-new cards you see daily. Max Reviews per Day caps how many previously seen cards can appear for review. Both are set in Control → Card Limits.",
      },
      {
        question: "What are study goals?",
        answer:
          "You can set a test date for a deck to create a goal. The app tracks your mastery percentage and uses it in Smart Blocking calculations to ensure you're on pace for your exam.",
      },
    ],
  },
  {
    id: "stats",
    title: "Stats & Analytics",
    icon: "📊",
    items: [
      {
        question: "What does the Stats screen show?",
        answer:
          "The Stats tab shows your study streak, XP earned, cards reviewed, retention rate, and daily/weekly study trends. Use it to track your learning momentum over time.",
      },
      {
        question: "What is my retention rate?",
        answer:
          "Retention rate is the percentage of review cards you answered correctly. A higher retention rate means your spaced repetition is working well. Aim for 80–90% — above 90% may mean you need harder cards.",
      },
      {
        question: "What is a streak?",
        answer:
          "A streak counts consecutive days you've completed at least one study session. Streaks are shown on your dashboard and contribute to XP rewards.",
      },
    ],
  },
  {
    id: "rewards",
    title: "Rewards & XP",
    icon: "🏆",
    items: [
      {
        question: "How do I earn XP?",
        answer:
          "You earn XP by completing study sessions, maintaining streaks, answering cards correctly, and hitting daily goals. XP reflects your overall study effort.",
      },
      {
        question: "What are rewards used for?",
        answer:
          "Rewards are tied to your XP level and can influence Smart Blocking — a higher XP balance may earn you more lenient unlock times. Future updates will expand reward redemption options.",
      },
      {
        question: "What happens if I miss a day?",
        answer:
          "Missing a day resets your daily streak to zero, but your total XP and card progress are never lost. Jump back in and the streak counter starts fresh.",
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: "🔔",
    items: [
      {
        question: "What kinds of notifications does the app send?",
        answer:
          "The app sends study reminders at your preferred study times, streak alerts, and motivational nudges when blocking is disabled for an extended period.",
      },
      {
        question: "How do I set study reminder times?",
        answer:
          "Go to Control and find the Scheduling section. Toggle reminders on and set your preferred study time. You can also specify how many minutes before your scheduled time you want to be reminded.",
      },
      {
        question: "What are guilt notifications?",
        answer:
          "When you turn blocking OFF, the app can send gentle nudges to remind you to re-enable it. These are designed to help you stay accountable. They stop automatically when you turn blocking back on.",
      },
    ],
  },
  {
    id: "tts",
    title: "Read Aloud",
    icon: "🔊",
    items: [
      {
        question: "What is Read Aloud?",
        answer:
          "When Read Aloud is enabled, the app speaks flashcard text aloud using text-to-speech. This is useful for auditory learners or hands-free study sessions.",
      },
      {
        question: "How do I enable Read Aloud?",
        answer:
          "Go to Control → Read Aloud and tap the toggle. Cards that already have recorded audio will use their audio file instead of text-to-speech.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Plan",
    icon: "👤",
    items: [
      {
        question: "What's included in the free plan?",
        answer:
          "The free plan includes access to a limited number of decks and core blocking features. Upgrade to get unlimited decks, advanced analytics, and priority support.",
      },
      {
        question: "How do I upgrade my plan?",
        answer:
          "Go to Control → Plan and tap Upgrade → Unlimited Access. You can also enable Ads for More Decks as a free alternative that supports the app with ads.",
      },
      {
        question: "How does the referral program work?",
        answer:
          "Share your referral link from Control → Refer a Friend. When a friend signs up and subscribes, you both get one free month of premium access.",
      },
      {
        question: "How do I log out?",
        answer:
          "Go to Control → Account → Log Out. Your data is saved to your account and will be restored when you log back in.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Go to Control → Account → Delete Account. You'll need to type DELETE to confirm. This permanently removes your account and all associated data and cannot be undone.",
      },
    ],
  },
];
