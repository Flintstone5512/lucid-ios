import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

const IDENTIFIER = "lucid-motivational-progress";

type Template = { title: string; body: string };

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function buildTemplate(index: number, cards: number, minutes: number, streak: number): Template {
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

function scheduleTime(): Date {
  const now = new Date();
  const hour = now.getHours();
  const target = new Date(now);

  if (hour < 15) {
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
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    // Cancel any existing motivational notification before rescheduling
    await Notifications.cancelScheduledNotificationAsync(IDENTIFIER).catch(() => {});

    const { title, body } = buildTemplate(streak % 5, cardsReviewed, unlockMinutes, streak);
    const fireAt = scheduleTime();

    await Notifications.scheduleNotificationAsync({
      identifier: IDENTIFIER,
      content: { title, body, sound: true },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });

    console.log(`[MotivationalNotif] Scheduled for ${fireAt.toLocaleTimeString()} - "${title}"`);
  } catch (err) {
    console.warn("[MotivationalNotif] Failed to schedule:", err);
  }
}

export async function cancelMotivationalNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(IDENTIFIER);
  } catch {
    // Ignore - notification may not exist yet
  }
}
