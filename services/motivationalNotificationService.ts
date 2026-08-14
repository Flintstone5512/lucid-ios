import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

// ─── identifiers ────────────────────────────────────────────────────────────
const MOTIVATIONAL_ID = "lucid-motivational-progress";
const GUILT_EARLY_ID  = "lucid-guilt-2h";
const GUILT_LATE_ID   = "lucid-guilt-8h";

type Template = { title: string; body: string };

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

async function permissionGranted(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

async function schedule(id: string, content: Template, fireAt: Date): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: content.title, body: content.body, sound: true },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
  console.log(`[Notif] ${id} -> ${fireAt.toLocaleTimeString()} - "${content.title}"`);
}

// ─── motivational (progress pulse after a study session) ─────────────────────

function buildMotivationalTemplate(index: number, cards: number, minutes: number, streak: number): Template {
  const time = formatTime(minutes);
  switch (index) {
    case 0:
      return {
        title: "You are building something real.",
        body: `${cards} cards reviewed. ${time} reclaimed today. Keep going.`,
      };
    case 1:
      return {
        title: streak > 1 ? `${streak}-day streak.` : "Progress made.",
        body: `You studied today and got back ${time}. Most people just scroll.`,
      };
    case 2:
      return {
        title: "Time is yours to reclaim.",
        body: `${cards} cards. ${time} back. You earned it - come back tomorrow.`,
      };
    case 3:
      return {
        title: "Knowledge compounds. So does your time.",
        body: `You reviewed ${cards} cards and reclaimed ${time} today.`,
      };
    default:
      return {
        title: streak > 6 ? `${streak} days in a row.` : "Do not break the chain.",
        body: `${time} reclaimed. ${cards} more cards in your long-term memory.`,
      };
  }
}

function motivationalFireTime(): Date {
  const now = new Date();
  const target = new Date(now);
  if (now.getHours() < 15) {
    // Before 3 PM - fire at 6 PM today
    target.setHours(18, 0, 0, 0);
  } else {
    // 3 PM or later - fire at 8 AM tomorrow
    target.setDate(target.getDate() + 1);
    target.setHours(8, 0, 0, 0);
  }
  return target;
}

export async function scheduleMotivationalNotification(
  cardsReviewed: number,
  unlockMinutes: number,
  streak: number
): Promise<void> {
  try {
    if (!(await permissionGranted())) return;
    const template = buildMotivationalTemplate(streak % 5, cardsReviewed, unlockMinutes, streak);
    await schedule(MOTIVATIONAL_ID, template, motivationalFireTime());
  } catch (err) {
    console.warn("[MotivationalNotif] Failed to schedule:", err);
  }
}

export async function cancelMotivationalNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MOTIVATIONAL_ID).catch(() => {});
}

// ─── guilt (blocking turned off) ─────────────────────────────────────────────
// Two waves: a nudge 2 hours in, and a harder push 8 hours in.
// Both are cancelled the moment blocking is re-enabled.

const GUILT_TEMPLATES_2H: Template[] = [
  {
    title: "Blocking is still off.",
    body: "The average person wastes 3+ hours on social media daily. You turned off your only guard. Turn it back on.",
  },
  {
    title: "2 hours without blocking.",
    body: "That is time you are not getting back. Lucid exists so you stop giving it away. Turn blocking on.",
  },
  {
    title: "Still scrolling?",
    body: "You disabled blocking. Endless feeds are designed to keep you there. Take control - turn it back on.",
  },
];

const GUILT_TEMPLATES_8H: Template[] = [
  {
    title: "A full day without blocking.",
    body: "Most people waste 3-4 hours on their phone today. You removed the only thing stopping you. Turn it back on.",
  },
  {
    title: "8 hours. That is a whole workday.",
    body: "Social media companies made billions off your attention today. Turn blocking back on and take it back.",
  },
  {
    title: "You are losing your time.",
    body: "Every minute of unblocked scrolling is a minute you could have spent learning. Turn blocking on now.",
  },
];

function pickGuiltTemplate(templates: Template[]): Template {
  // Pick based on the current minute so it varies across days without randomness
  return templates[new Date().getMinutes() % templates.length];
}

function msFromNow(ms: number): Date {
  return new Date(Date.now() + ms);
}

function clampToReasonableHour(date: Date): Date {
  // Do not disturb between 10 PM and 8 AM - push to 8 AM next day if needed
  const hour = date.getHours();
  if (hour >= 22 || hour < 8) {
    const next = new Date(date);
    next.setDate(next.getDate() + (hour >= 22 ? 1 : 0));
    next.setHours(8, 0, 0, 0);
    return next;
  }
  return date;
}

export async function scheduleGuiltNotifications(): Promise<void> {
  try {
    if (!(await permissionGranted())) return;

    const twoHours   = clampToReasonableHour(msFromNow(2 * 60 * 60 * 1000));
    const eightHours = clampToReasonableHour(msFromNow(8 * 60 * 60 * 1000));

    await schedule(GUILT_EARLY_ID, pickGuiltTemplate(GUILT_TEMPLATES_2H), twoHours);
    await schedule(GUILT_LATE_ID,  pickGuiltTemplate(GUILT_TEMPLATES_8H), eightHours);
  } catch (err) {
    console.warn("[GuiltNotif] Failed to schedule:", err);
  }
}

export async function cancelGuiltNotifications(): Promise<void> {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(GUILT_EARLY_ID).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(GUILT_LATE_ID).catch(() => {}),
  ]);
}
