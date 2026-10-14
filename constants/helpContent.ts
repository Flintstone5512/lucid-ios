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
  // ─── BLOCKING & SCREEN TIME ───────────────────────────────
  {
    id: "blocking",
    title: "Blocking & App Selection",
    icon: "🔒",
    items: [
      {
        question: "How does blocking work?",
        answer:
          "When blocking is ON, the apps you selected are restricted until you complete a study session. On iOS this uses Apple's Screen Time API (a system-level shield). On Android it uses device usage access to restrict app launches. Blocking is enforced at the OS level — the app doesn't need to be open for it to work.",
      },
      {
        question: "How do I select which apps to block on iOS?",
        answer:
          "Go to Control → Blocked Apps → Re-select Blocked Apps. This opens Apple's native Screen Time app picker. Browse by category or search by name, tap the apps you want to block, then tap Done. Your selection takes effect immediately. You can re-open this picker at any time to add or remove apps.",
      },
      {
        question: "How do I grant Screen Time access on iOS?",
        answer:
          "The first time you set up blocking, the app will ask for Screen Time permission. A system prompt from Apple will appear — tap Allow. If you missed it or revoked it, go to your iPhone's Settings → Screen Time → make sure Screen Time is on, then return to the app and re-run setup from Control → Blocked Apps → Re-select Blocked Apps.",
      },
      {
        question: "How do I select which apps to block on Android?",
        answer:
          "During the initial onboarding, the app walks you through granting Usage Access permission in your phone's settings. Once granted, you can choose which apps to block inside the app. To change your selection later, go through the setup flow again from the Control tab.",
      },
      {
        question: "What's the difference between Soft and Strict mode?",
        answer:
          "Soft mode shows a block screen with a short delay — you can dismiss it if you really need to, making it a mindful nudge rather than a hard wall. Strict mode fully enforces the block until you complete the required number of flashcards for the current session. Change the mode in Control → Blocking Intensity.",
      },
      {
        question: "How do I turn blocking on or off?",
        answer:
          "Go to Control → Blocking and tap the large toggle. Green means blocking is active. Red means it is off. Changes apply immediately. When you turn blocking off, the app may send reminder nudges to help you turn it back on.",
      },
    ],
  },

  // ─── TIMER POLICY ─────────────────────────────────────────
  {
    id: "timer",
    title: "Timer Policy",
    icon: "⏱",
    items: [
      {
        question: "What is Timer Policy?",
        answer:
          "Timer Policy controls the deal between studying and screen time. You set two numbers: how many flashcards you must review before blocked apps unlock, and how many minutes those apps stay unlocked afterward. When the unlock timer expires, blocking is automatically re-applied.",
      },
      {
        question: "What is 'Cards Required'?",
        answer:
          "This is the number of flashcards you must answer during a study session before your blocked apps unlock. Set it to a level that feels like a fair trade for the screen time you want. A good starting point is 10–20 cards.",
      },
      {
        question: "What is 'Unlock Minutes'?",
        answer:
          "After completing your required cards, your blocked apps unlock for exactly this many minutes. When the timer runs out, the block is automatically re-applied without you needing to do anything. On iOS the ScreenTime shield is restored automatically.",
      },
      {
        question: "What is 'Max Unlocks Per Day'?",
        answer:
          "This caps how many times you can unlock your blocked apps in a single day, no matter how many study sessions you complete. Once the daily cap is reached, blocked apps stay blocked for the rest of the day. It prevents marathon unlock sessions.",
      },
      {
        question: "Where do I change these settings?",
        answer:
          "Go to Control. If Smart Blocking is off you'll see the Timer Policy section with editable fields for Cards Required and Unlock Minutes. Tap Save Settings after making changes.",
      },
    ],
  },

  // ─── SMART BLOCKING ───────────────────────────────────────
  {
    id: "smart-blocking",
    title: "Smart Blocking",
    icon: "🧠",
    items: [
      {
        question: "What is Smart Blocking?",
        answer:
          "Smart Blocking automatically calculates your Cards Required and Unlock Minutes each day based on your actual behavior — how much you've scrolled, your flashcard retention rate, any active study goals, and your XP balance. The smarter you study, the more flexibility you earn. You no longer need to set a fixed number manually.",
      },
      {
        question: "How do I enable Smart Blocking?",
        answer:
          "Go to Control → Timer Policy and tap the Smart button on the right side of the section header. The app will calculate a personalized policy and display the values it chose along with the reasoning behind each one.",
      },
      {
        question: "What factors does Smart Blocking consider?",
        answer:
          "Smart Blocking looks at four things: (1) how much screen time you've used today versus your usual habits, (2) your recent card retention rate — answering more correctly earns lighter requirements, (3) any active study goals and how many days remain before your exam, and (4) your XP balance as a proxy for sustained effort.",
      },
      {
        question: "Can I recalculate mid-day?",
        answer:
          "Yes. Tap Recalculate Now inside the Smart Blocking section. This re-runs the calculation using your current day's data. Useful if you've had a productive study session and want the policy to reflect it before your next unlock.",
      },
      {
        question: "Can I see why it chose specific values?",
        answer:
          "Yes. Below the Cards Required and Unlock Minutes metrics, the app shows a bulleted Reasoning list explaining exactly what factors pushed each value up or down. If you have active study goals, a progress bar for each goal is shown as well.",
      },
      {
        question: "What if I turn Smart Blocking off?",
        answer:
          "Your manually configured Cards Required and Unlock Minutes become active again. The Smart values are not lost — if you re-enable Smart Blocking it recalculates from scratch using your current data.",
      },
    ],
  },

  // ─── HOMEWORK HUB ─────────────────────────────────────────
  {
    id: "homework-hub",
    title: "Homework Hub",
    icon: "📝",
    items: [
      {
        question: "What is Homework Hub?",
        answer:
          "Homework Hub is an AI-powered homework practice tool. You upload your assignment (PDF, JPG, or PNG), answer each question by writing out your reasoning, and the AI gives you temperature-based feedback — not just right or wrong. Questions you struggle with become study flashcards, and you get retested at the end.",
      },
      {
        question: "What file types can I upload?",
        answer:
          "PDF, JPG, and PNG files are supported. You can upload multiple files at once — the AI reads them all together as a single assignment. Duplicate filenames are automatically de-duplicated.",
      },
      {
        question: "How does the temperature feedback work?",
        answer:
          "Instead of marking answers right or wrong, the AI rates the quality of your reasoning on a five-point scale: Ice Cold → Cold → Warm → Hot → On Fire. Each question shows a colored bar, your answer, an AI-generated hint, and an encouragement message. The goal is deep understanding, not just correct answers.",
      },
      {
        question: "What happens after I answer all the questions?",
        answer:
          "Any question not rated 'On Fire' generates AI study flashcards. You go through three rounds of those cards — each card shows a 'think about this' prompt on the front and a reasoning guide on the back. Tap 'Got it!' or 'Still thinking...' to advance. After three rounds, you're retested on all questions that weren't On Fire.",
      },
      {
        question: "What if I get everything On Fire on the first try?",
        answer:
          "If every question scores On Fire in the initial round, the study session is skipped entirely and you jump straight to done. The app recognizes you already have a strong grasp of the material.",
      },
      {
        question: "Where do I find Homework Hub?",
        answer:
          "Open the Decks tab and look for the Homework Hub card at the top of the screen. Tap it to start a new session.",
      },
    ],
  },

  // ─── DECK IMPORT ──────────────────────────────────────────
  {
    id: "deck-import",
    title: "Deck Import",
    icon: "📥",
    items: [
      {
        question: "What file formats can I import?",
        answer:
          "You can import Anki decks (.apkg) and spreadsheets (.xlsx or .csv). Each format has its own import button in the Decks tab.",
      },
      {
        question: "How do I import an Anki (.apkg) deck?",
        answer:
          "In the Decks tab, tap Upload .apkg and select your file. The app previews the card fields and suggests which fields to use as Front, Back, and Audio. You can adjust the mapping in the preview screen, rename the deck, and optionally append the cards into an existing deck instead of creating a new one. Tap Import to finish. Large decks may take up to 5 minutes.",
      },
      {
        question: "How do I import an Excel or CSV file?",
        answer:
          "Tap Upload .xlsx in the Decks tab and pick your file. The app shows a field-mapping preview — choose which column is the front (question) and which is the back (answer). Tap Import to create the deck. Note that audio fields are not supported for Excel/CSV imports.",
      },
      {
        question: "Can I change the field mapping after importing?",
        answer:
          "Yes, for Anki imports. Open the deck, look for the field-remap button (⇄), and pick new fields. This is a paid-plan feature.",
      },
      {
        question: "What happens if I've reached my deck limit?",
        answer:
          "The import will be blocked with a 'Deck limit reached' warning. Free plans have a cap on the number of decks. Upgrade your plan or delete an existing deck to make room.",
      },
      {
        question: "Can a parent import a deck for their child?",
        answer:
          "Yes. Parents can import Anki or Excel decks directly into a child's library from the Family dashboard. The same field-mapping preview applies.",
      },
    ],
  },

  // ─── GENERATE WITH AI ─────────────────────────────────────
  {
    id: "ai-generate",
    title: "Generate with AI",
    icon: "✨",
    items: [
      {
        question: "What is Generate with AI?",
        answer:
          "Generate with AI creates a complete flashcard deck from text you paste or a file you upload. Paste your notes, a chapter summary, a vocabulary list, or any content — the AI extracts key concepts and writes the cards for you.",
      },
      {
        question: "How do I generate cards from text?",
        answer:
          "In the Decks tab, tap Generate from Text. Optionally enter a deck name, then paste your content into the text field. Choose a card type (Basic, Multiple Choice, Cloze, or Mixed) and tap Generate. A preview shows how many cards were created and lets you flip the Front/Back mapping before confirming.",
      },
      {
        question: "How do I generate cards from a file?",
        answer:
          "Tap Upload File in the AI generation section and pick a PDF, DOCX, DOC, XLSX, or XLS file. The AI reads the file and generates cards using the same preview and confirm flow as text generation.",
      },
      {
        question: "What card types are available?",
        answer:
          "Basic: a standard question-and-answer pair. Multiple Choice: the AI generates a question with four answer options. Cloze: fill-in-the-blank style with a word or phrase removed. Mixed: a combination of all types in one deck. Multiple Choice, Cloze, and Mixed require a paid plan.",
      },
      {
        question: "Can I edit the cards after generation?",
        answer:
          "Yes. After the deck is created, open it and tap any card to edit the front or back text. You can also add new cards manually.",
      },
      {
        question: "Can a parent generate a deck for their child?",
        answer:
          "Yes. Parents can generate AI decks on behalf of a child from the Family dashboard. The deck is added directly to the child's library.",
      },
    ],
  },

  // ─── SHUFFLE MODE ─────────────────────────────────────────
  {
    id: "shuffle-mode",
    title: "Deck Shuffle Mode",
    icon: "🔀",
    items: [
      {
        question: "What is Deck Shuffle Mode?",
        answer:
          "Shuffle Mode combines cards from multiple decks into one mixed study session. Instead of studying one deck at a time, you practice across subjects simultaneously — great for interleaved learning and keeping sessions varied.",
      },
      {
        question: "How do I enable Shuffle Mode?",
        answer:
          "Open the Decks tab and toggle on Shuffle Mode at the top of the Your Decks section. Each deck row will show a circular checkbox. Tap the decks you want to include — selected decks get a blue border and checkmark. The status bar shows how many decks are selected.",
      },
      {
        question: "Is Shuffle Mode a paid feature?",
        answer:
          "Yes, Shuffle Mode requires a paid plan. If you're on the free plan, you'll be prompted to upgrade when you try to enable it.",
      },
      {
        question: "Can Shuffle Mode and Rotation Mode both be on at the same time?",
        answer:
          "No — they are mutually exclusive. Enabling Shuffle Mode automatically turns off Rotation Mode, and vice versa.",
      },
      {
        question: "Will my shuffle selection be remembered?",
        answer:
          "Yes. Your selected decks and the shuffle setting are saved to your device and restored the next time you open the app.",
      },
    ],
  },

  // ─── ROTATION MODE ────────────────────────────────────────
  {
    id: "rotation-mode",
    title: "Deck Rotation Mode",
    icon: "🔄",
    items: [
      {
        question: "What is Deck Rotation Mode?",
        answer:
          "Rotation Mode cycles through a set of decks in sequence — one deck per study session. Each time you study, the app automatically moves to the next deck in your rotation. This ensures you give equal attention to every subject without having to remember where you left off.",
      },
      {
        question: "How do I set up Rotation Mode?",
        answer:
          "Open the Decks tab and toggle on Deck Rotation. The same deck-selection checkboxes appear — tap the decks you want in your rotation pool. The subtitle shows which deck is 'Up next' based on the current position in the sequence.",
      },
      {
        question: "How does the rotation sequence work?",
        answer:
          "The app works through your selected decks in the order you can see them. After each session, the rotation index advances by one. When it reaches the last deck, it loops back to the first. Enabling Rotation Mode resets the index to the first deck in your selection.",
      },
      {
        question: "Is Rotation Mode a paid feature?",
        answer:
          "Yes, it requires a paid plan.",
      },
      {
        question: "What's the difference between Shuffle and Rotation?",
        answer:
          "Shuffle mixes cards from all selected decks into one session. Rotation keeps decks separate — you study one full session from deck A, then one from deck B, then deck C, and so on. Shuffle is better for interleaved practice; Rotation is better if you prefer focused sessions per subject.",
      },
    ],
  },

  // ─── TEST MODE ────────────────────────────────────────────
  {
    id: "test-mode",
    title: "Test Mode",
    icon: "📋",
    items: [
      {
        question: "What is Test Mode?",
        answer:
          "Test Mode quizzes you on cards you've already mastered (rated Good or Easy in previous sessions). It's designed for formal review — like a practice exam — rather than daily study. Your score is recorded and counts toward Reward Journey milestones.",
      },
      {
        question: "How do I start a test?",
        answer:
          "Test Mode is available from the parent dashboard ('Create a Test') or directly within the app. Pick a deck, then configure which side of the card is the question and which is the answer using the preview modal. Tap Start Test.",
      },
      {
        question: "What question formats does Test Mode use?",
        answer:
          "If your deck has enough cards, 60% of questions are Multiple Choice — you tap the correct answer from four options and get instant feedback. The rest are Free Recall — you read the question, reveal the answer, and self-grade (Got it / Didn't know). The mix is chosen automatically based on your deck size.",
      },
      {
        question: "How is my score calculated?",
        answer:
          "Your score is the percentage of questions you answered correctly (or self-graded as 'Got it' for free-recall questions). Results show your percentage, a letter grade (A–F), the number of correct answers, and how long the test took.",
      },
      {
        question: "Can I export my test results?",
        answer:
          "Yes. On the results screen, tap the export option to generate a shareable PDF report. The PDF includes every card front, the correct answer, and a pass/fail for each question.",
      },
      {
        question: "Do test scores count toward Reward Journey milestones?",
        answer:
          "Yes — tests scored 80% or higher count toward the 'tests ≥ 80%' requirement for each Reward Journey milestone. Note that re-taking the exact same test multiple times does not generate additional qualifying credits.",
      },
      {
        question: "Can a parent schedule a test for their child?",
        answer:
          "Yes. Parents can set a test for a child with a notification delivered at 9 AM the following day, in two days, or next week. The notification reminds the child to complete the test.",
      },
    ],
  },

  // ─── DECKS & FLASHCARDS ───────────────────────────────────
  {
    id: "decks",
    title: "Decks & Flashcards",
    icon: "📚",
    items: [
      {
        question: "How do I create a deck manually?",
        answer:
          "Tap the Decks tab, then the + button. Give your deck a name and optionally a subject. Once created, open the deck and tap Add Card to write a front (question) and back (answer) for each card.",
      },
      {
        question: "How does the spaced repetition system work?",
        answer:
          "After each card you rate your recall: Again, Hard, Good, or Easy. The app schedules each card to reappear at the optimal moment before you'd forget it — cards you know well appear less often, cards you struggle with appear more frequently. This is the same algorithm used by Anki.",
      },
      {
        question: "What are Card Limits?",
        answer:
          "New Cards per Day controls how many brand-new cards you see in a single day. Max Reviews per Day caps how many previously seen cards come up for review. Both limits are set in Control → Card Limits. Keeping these at sustainable levels prevents burnout.",
      },
      {
        question: "How do study goals work?",
        answer:
          "When you create or import a deck you can set a target exam date. The app tracks your mastery percentage and uses it in Smart Blocking calculations to make sure you're on pace. Approaching your exam date with low mastery automatically increases your study requirements.",
      },
    ],
  },

  // ─── PARENT BOUNTIES ──────────────────────────────────────
  {
    id: "parent-bounties",
    title: "Parent Bounties",
    icon: "🎯",
    items: [
      {
        question: "What are Parent Bounties?",
        answer:
          "Parent Bounties are custom challenges that a parent creates for their child. Each bounty has a title, description, a reward label, a progress tracker (e.g. 3 of 10 completed), an optional deadline, and an optional XP boost multiplier. They let parents create incentives beyond the built-in milestones.",
      },
      {
        question: "Where do I see my active bounties?",
        answer:
          "Open the Rewards tab. If your parent has created bounties for you, they appear in the Parent Bounties section. Each active bounty shows your current progress toward the goal and what you'll earn when you complete it.",
      },
      {
        question: "I don't see any bounties — why?",
        answer:
          "If no bounties are active, the section shows 'No Active Bounties.' Ask a parent to create one from the Family Settings. Bounties are created by the parent, not the child.",
      },
      {
        question: "What happens when I complete a bounty?",
        answer:
          "Completed bounties are credited according to whatever reward the parent specified. XP boost multipliers apply to your earned XP during the bounty period.",
      },
    ],
  },

  // ─── SKIP PASSES ──────────────────────────────────────────
  {
    id: "skip-passes",
    title: "Skip Passes",
    icon: "🎟️",
    items: [
      {
        question: "What is a Skip Pass?",
        answer:
          "A Skip Pass lets you skip one study session without breaking your daily streak. Use it on a day when life gets in the way — your streak is protected and carries on as if you studied.",
      },
      {
        question: "How do I earn Skip Passes?",
        answer:
          "There are three ways to earn passes: (1) Complete a Perfect Week — study every day for a full week without missing. (2) Accumulate 1,500 coins. (3) Have a parent grant you a pass directly from their Family dashboard.",
      },
      {
        question: "How many Skip Passes do I have?",
        answer:
          "Open the Rewards tab. Your current pass count is displayed as a large badge in the Skip Passes section.",
      },
      {
        question: "Where do I use a Skip Pass?",
        answer:
          "Skip Passes are used from within the study or enforcement flow when a session reminder appears and you need to defer it. The option to use a pass will be presented at that moment.",
      },
    ],
  },

  // ─── REWARD JOURNEY ───────────────────────────────────────
  {
    id: "reward-journey",
    title: "Reward Journey",
    icon: "🏆",
    items: [
      {
        question: "What is the Reward Journey?",
        answer:
          "The Reward Journey is a ladder of six milestone rewards you unlock by maintaining a study streak and passing a minimum number of tests at 80% or higher. Each milestone has a cash reward — funded by your parent or by the app itself.",
      },
      {
        question: "What are the six milestones?",
        answer:
          "🔥 2-Week Warrior — 14-day streak + 6 tests ≥80%\n⚡ Month Strong — 30-day streak + 12 tests ≥80%\n🌟 Scholar — 60-day streak + 25 tests ≥80%\n🏆 Elite Learner — 90-day streak + 40 tests ≥80%\n💎 Hall of Fame — 180-day streak + 80 tests ≥80% (app-funded: $25)\n🦁 Lucid Legend — 365-day streak + 150 tests ≥80%",
      },
      {
        question: "How do I claim a milestone?",
        answer:
          "When both the streak and test conditions are met for a milestone, a Claim button appears on that row. Tapping it sends a reward request to your parent (or triggers the automatic $25 payout for the Hall of Fame milestone). Your parent approves or denies it from their dashboard.",
      },
      {
        question: "What if my parent denies a reward?",
        answer:
          "You'll see a Denied status on that milestone. You can re-request it and your parent can approve at a later time. The app keeps the claim open.",
      },
      {
        question: "How is progress tracked?",
        answer:
          "Each milestone row shows two mini progress bars — one for your streak, one for qualifying tests. A countdown tells you exactly how many more days and tests you need. The 'next' milestone you're working toward is highlighted in orange.",
      },
      {
        question: "Do tests need to be 80% or higher?",
        answer:
          "Yes. Only tests scored 80% or above count toward milestone progress. Retaking the same test multiple times does not generate extra qualifying credits.",
      },
    ],
  },

  // ─── REWARD WALLET ────────────────────────────────────────
  {
    id: "reward-wallet",
    title: "Reward Wallet",
    icon: "💰",
    items: [
      {
        question: "What is the Reward Wallet?",
        answer:
          "The Reward Wallet has two sides: the Parent Wallet (where parents load funds to pay milestone rewards) and the Child Reward Balance (where approved rewards accumulate until the child cashes out). Parents manage their wallet from the Family dashboard.",
      },
      {
        question: "How does a parent load money into their wallet?",
        answer:
          "Parents add funds via Stripe from the Family dashboard → Reward Wallet → Add Funds. The minimum top-up is $1. The balance is used to pay out milestone rewards when approved.",
      },
      {
        question: "How do I cash out my reward balance?",
        answer:
          "Open the Rewards tab and check your Reward Balance. Once your balance reaches $20, a Request Cash-Out button becomes available. Your parent receives the request and approves it. Upon approval, a gift card is delivered to the parent's email for you to use.",
      },
      {
        question: "What are Coins, and how are they different from cash rewards?",
        answer:
          "Coins are earned at a rate of 1 coin per 100 XP. They're separate from cash milestones. You spend coins in the Gift Card Marketplace on items like Roblox, Amazon, App Store credit, DoorDash, Netflix, and PlayStation. Marketplace redemptions also require parent approval.",
      },
      {
        question: "What gift cards can I get from the marketplace?",
        answer:
          "The marketplace includes Roblox, Amazon, App Store, DoorDash, Netflix, PlayStation, and more. Each item has a coin cost (for example, a $5 Roblox card costs 5,000 coins). After requesting, a parent must approve before the card is sent.",
      },
      {
        question: "Is there a processing fee?",
        answer:
          "A $1.50 processing fee is deducted from the parent's wallet when a gift card is issued. This covers the payment processing cost.",
      },
    ],
  },

  // ─── STATS ────────────────────────────────────────────────
  {
    id: "stats",
    title: "Stats & Analytics",
    icon: "📊",
    items: [
      {
        question: "What does the Stats screen show?",
        answer:
          "The Stats tab shows your study streak, XP earned, cards reviewed, retention rate, and daily and weekly study trends. Use it to track your learning momentum over time.",
      },
      {
        question: "What is my retention rate?",
        answer:
          "Retention rate is the percentage of review cards you answered correctly. A healthy range is 80–90%. Above 90% may mean your cards are too easy; below 70% usually means you're taking on too many new cards too quickly.",
      },
      {
        question: "What is a streak?",
        answer:
          "A streak counts consecutive days you've completed at least one study session. Streaks contribute to XP, unlock Skip Pass bonuses at 7 days, and are required for Reward Journey milestones.",
      },
    ],
  },

  // ─── NOTIFICATIONS ────────────────────────────────────────
  {
    id: "notifications",
    title: "Notifications",
    icon: "🔔",
    items: [
      {
        question: "What kinds of notifications does the app send?",
        answer:
          "Study reminders at your preferred study times, streak alerts when you're in danger of losing your streak, and motivational nudges if blocking has been off for an extended period.",
      },
      {
        question: "How do I set my study reminder time?",
        answer:
          "Go to Control → Scheduling. Toggle reminders on and set your preferred study time and how many minutes in advance you want the reminder.",
      },
      {
        question: "What are guilt notifications?",
        answer:
          "When you turn blocking OFF, the app sends gentle nudges to remind you to turn it back on. They stop automatically the moment you re-enable blocking. You can disable them from Control.",
      },
    ],
  },

  // ─── READ ALOUD ───────────────────────────────────────────
  {
    id: "tts",
    title: "Read Aloud",
    icon: "🔊",
    items: [
      {
        question: "What is Read Aloud?",
        answer:
          "Read Aloud speaks flashcard text using text-to-speech. It's useful for auditory learners or hands-free study. Cards that already have a recorded audio file use that audio instead of text-to-speech.",
      },
      {
        question: "How do I enable Read Aloud?",
        answer:
          "Go to Control → Read Aloud and tap the toggle to turn it on or off.",
      },
    ],
  },

  // ─── ACCOUNT & PLAN ───────────────────────────────────────
  {
    id: "account",
    title: "Account & Plan",
    icon: "👤",
    items: [
      {
        question: "What's included in the free plan?",
        answer:
          "The free plan gives you access to a limited number of decks and core blocking features. Upgrade to unlock unlimited decks, all AI card types, Shuffle Mode, Rotation Mode, and advanced analytics.",
      },
      {
        question: "How do I upgrade my plan?",
        answer:
          "Go to Control → Plan and tap Upgrade → Unlimited Access. You can also enable Ads for More Decks as a free alternative that unlocks more decks in exchange for ads.",
      },
      {
        question: "How does the referral program work?",
        answer:
          "Go to Control → Refer a Friend and share your referral link. When a friend signs up and subscribes, you both receive one free month of premium access.",
      },
      {
        question: "How do I log out?",
        answer:
          "Go to Control → Account → Log Out. Your data is saved to your account and will be fully restored when you log back in.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Go to Control → Account → Delete Account. Type DELETE in the confirmation box to proceed. This permanently removes your account and all associated data and cannot be undone. If you are a parent, all linked child accounts are also deleted.",
      },
    ],
  },
];
