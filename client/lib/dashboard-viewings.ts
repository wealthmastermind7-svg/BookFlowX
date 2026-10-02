import type { Booking } from "./api";

export const VIEWING_CHANNELS = [
  { key: "sms", label: "SMS", icon: "message-circle", color: "#00D4FF" },
  { key: "voice", label: "Voice", icon: "phone", color: "#A78BFA" },
  { key: "email", label: "Email", icon: "mail", color: "#60A5FA" },
  { key: "chat", label: "Chat", icon: "message-square", color: "#34D399" },
] as const;

export function agencyClock(now: Date, timezone?: string | null) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || undefined,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-GB", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
  }
  const part = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const hour = Number(part("hour"));
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
    greeting: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
  };
}

export function viewingOverview(bookings: Booking[], now: Date, timezone?: string | null) {
  const clock = agencyClock(now, timezone);
  const today = new Date(`${clock.date}T12:00:00Z`);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const active = bookings.filter((booking) => booking.status !== "cancelled");
  const weeklyData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    return { label, date, value: active.filter((b) => b.date.slice(0, 10) === date).length };
  });
  const channels = VIEWING_CHANNELS.map((channel) => ({
    ...channel,
    count: active.filter((booking) => booking.channel === channel.key).length,
  }));
  const upcoming = active.filter((booking) =>
    booking.status !== "completed" &&
    `${booking.date.slice(0, 10)}T${booking.time.slice(0, 5)}` >= `${clock.date}T${clock.time}`,
  ).sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
  return {
    ...clock,
    todayCount: active.filter((b) => b.date.slice(0, 10) === clock.date).length,
    weekCount: weeklyData.reduce((sum, day) => sum + day.value, 0),
    weeklyData, channels, upcoming,
    unrecordedCount: active.filter((b) => !VIEWING_CHANNELS.some((c) => c.key === b.channel)).length,
    statuses: {
      confirmed: active.filter((b) => b.status === "confirmed").length,
      pending: active.filter((b) => b.status === "pending").length,
      completed: active.filter((b) => b.status === "completed").length,
    },
  };
}