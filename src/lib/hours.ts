import type { Lang } from "@/lib/i18n";

/** Weekday ("0" = Sunday … "6" = Saturday, as in JS getDay and Postgres dow) → list of [from, to] in HH:MM. */
export type OpeningHours = Record<string, [string, string][]>;

const SLOTS: [string, string][] = [
  ["12:00", "14:30"],
  ["19:00", "23:00"],
];
export const DEFAULT_HOURS: OpeningHours = { "0": SLOTS, "1": [], "2": [], "3": SLOTS, "4": SLOTS, "5": SLOTS, "6": SLOTS };

/** Monday first, the way the week is read in Italy. */
export const WEEK_ORDER = ["1", "2", "3", "4", "5", "6", "0"];

const DAY_NAMES: Record<Lang, string[]> = {
  it: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const DAY_NAMES_LONG: Record<Lang, string[]> = {
  it: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export const dayName = (dow: string, lang: Lang, long = false) => (long ? DAY_NAMES_LONG : DAY_NAMES)[lang][Number(dow)];

export const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** Current weekday and minutes since midnight in Italy, whatever the visitor's own time zone. */
export function romeNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dow = String(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")));
  return { dow, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function isOpenNow(hours: OpeningHours, date = new Date()) {
  const { dow, minutes } = romeNow(date);
  return (hours[dow] ?? []).some(([from, to]) => minutes >= toMinutes(from) && minutes < toMinutes(to));
}

/** Pickup times for today on a 15-minute grid, no earlier than now + preparation time. */
export function pickupSlots(hours: OpeningHours, prepMinutes: number, date = new Date(), step = 15) {
  const { dow, minutes } = romeNow(date);
  // +1 because the server compares with seconds, so a slot exactly at now + prep would already be late.
  const earliest = minutes + prepMinutes + 1;
  const out: string[] = [];
  for (const [from, to] of hours[dow] ?? []) {
    const end = toMinutes(to);
    let t = Math.max(toMinutes(from), Math.ceil(earliest / step) * step);
    for (; t <= end; t += step) out.push(toHHMM(t));
  }
  return out;
}

/** Groups consecutive days with the same hours: "Mer–Dom 12:00–14:30 · 19:00–23:00". */
export function hoursSummary(hours: OpeningHours, lang: Lang) {
  const key = (d: string) => (hours[d] ?? []).map(([a, b]) => `${a}–${b}`).join(" · ");
  const groups: { days: string[]; text: string }[] = [];
  for (const d of WEEK_ORDER) {
    const text = key(d);
    const last = groups.at(-1);
    if (last && last.text === text) last.days.push(d);
    else groups.push({ days: [d], text });
  }
  return groups
    .filter((g) => g.text)
    .map((g) => {
      const first = dayName(g.days[0]!, lang);
      const range = g.days.length > 1 ? `${first}–${dayName(g.days.at(-1)!, lang)}` : first;
      return `${range} ${g.text}`;
    });
}

/** Accepts whatever is stored in the database and falls back to the default week when it is missing or malformed. */
export function parseHours(value: unknown): OpeningHours {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_HOURS;
  const out: OpeningHours = {};
  for (const d of WEEK_ORDER) {
    const slots = (value as Record<string, unknown>)[d];
    out[d] = Array.isArray(slots)
      ? slots.filter((s): s is [string, string] => Array.isArray(s) && typeof s[0] === "string" && typeof s[1] === "string")
      : [];
  }
  return out;
}
