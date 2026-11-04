/**
 * Sound and system notifications, shared by the kitchen (admin) and the customer's tracking page.
 *
 * Sounds are synthesised once into small WAV files and played through an <audio> element rather than the
 * Web Audio API: on iPhone, Web Audio is silenced by the mute switch and suspended when the page loses focus,
 * while a media element that was started once from a tap can be played again later without one.
 * Browsers only allow audio after a tap, so unlockAudio() must run inside a click handler.
 */
let player: HTMLAudioElement | null = null;
let unlocked = false;
const wavCache = new Map<string, string>();

function wavUrl(freqs: number[], step: number, volume: number): string {
  const key = `${freqs.join(",")}|${step}|${volume}`;
  const cached = wavCache.get(key);
  if (cached) return cached;
  const rate = 22050;
  const noteLen = step * 1.5;
  const total = Math.ceil(rate * ((freqs.length - 1) * step + noteLen));
  const samples = new Float32Array(total);
  freqs.forEach((f, i) => {
    const start = Math.floor(i * step * rate);
    const len = Math.floor(noteLen * rate);
    for (let n = 0; n < len && start + n < total; n++) {
      const t = n / rate;
      const attack = Math.min(1, n / (rate * 0.01));
      samples[start + n]! += volume * attack * Math.exp(-5 * t / noteLen) * Math.sin(2 * Math.PI * f * t);
    }
  });
  // 16-bit mono PCM WAV.
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + total * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, total * 2, true);
  for (let n = 0; n < total; n++) v.setInt16(44 + n * 2, Math.max(-1, Math.min(1, samples[n]!)) * 0x7fff, true);
  const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  wavCache.set(key, url);
  return url;
}

/** Fired on window whenever sound becomes available or unavailable, so UI can follow it. */
export const AUDIO_EVENT = "pappy-audio";
function setUnlocked(v: boolean) {
  if (unlocked === v) return;
  unlocked = v;
  window.dispatchEvent(new Event(AUDIO_EVENT));
}

/** Call from a tap. Plays a near-silent blip so the browser lets this page play sounds later. */
export async function unlockAudio(): Promise<boolean> {
  try {
    player ??= new Audio();
    player.src = wavUrl([440], 0.05, 0.001);
    await player.play();
    setUnlocked(true);
  } catch {
    setUnlocked(false);
  }
  return unlocked;
}

export const audioReady = () => unlocked;

/** Plays a sequence of tones (Hz), each `step` seconds apart. Silent if audio hasn't been unlocked. */
export function playTones(freqs: number[], step = 0.2, volume = 0.5) {
  if (!player || !unlocked) return;
  player.src = wavUrl(freqs, step, volume);
  player.currentTime = 0;
  player.play().catch(() => setUnlocked(false));
}

export const notificationsSupported = () => typeof Notification !== "undefined";

export type NotifyPermission = NotificationPermission | "unsupported";
export const notificationPermission = (): NotifyPermission => (notificationsSupported() ? Notification.permission : "unsupported");

/** Registers the notification service worker for a section of the site (Android needs one to show notifications). */
export function registerNotifier(scope: string) {
  navigator.serviceWorker?.register("/notify-sw.js", { scope }).catch(() => {});
}

export async function askNotificationPermission(): Promise<NotifyPermission> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows a system notification; tapping it opens (or focuses) `url`. */
export async function showNotification(scope: string, title: string, body: string, tag: string, url: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const options = { body, tag, icon: "/apple-touch-icon.png", data: { url } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration(scope);
    if (reg) await reg.showNotification(title, { ...options, requireInteraction: true });
    else new Notification(title, options);
  } catch {
    /* notifications unavailable */
  }
}

/** Short platform hint for unblocking notifications, shown when the visitor previously refused them. */
export function unblockHint(lang: "it" | "en") {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua);
  if (lang === "en")
    return ios
      ? "Settings → Notifications → Safari (or the Home Screen app) → Allow."
      : "Tap the 🔒 icon next to the address → Notifications → Allow, then reload the page.";
  return ios
    ? "Impostazioni → Notifiche → Safari (o l'app nella schermata Home) → Consenti."
    : "Tocca l'icona 🔒 accanto all'indirizzo → Notifiche → Consenti, poi ricarica la pagina.";
}
