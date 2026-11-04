/**
 * Sound and system notifications, shared by the kitchen (admin) and the customer's tracking page.
 * Browsers only allow audio after a tap, so unlockAudio() must run inside a click handler; after that,
 * the same page (including client-side navigations) can play sounds on its own.
 */
let audioCtx: AudioContext | null = null;

export async function unlockAudio(): Promise<boolean> {
  try {
    audioCtx ??= new AudioContext();
    await audioCtx.resume();
    return audioCtx.state === "running";
  } catch {
    return false;
  }
}

export const audioReady = () => audioCtx?.state === "running";

/** Plays a sequence of tones (Hz), each `step` seconds apart. Silent if audio hasn't been unlocked. */
export function playTones(freqs: number[], step = 0.2, volume = 0.35) {
  if (!audioCtx || audioCtx.state !== "running") return;
  const ctx = audioCtx;
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime + i * step;
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + step * 1.5);
    o.start(t);
    o.stop(t + step * 1.5);
  });
}

export const notificationsSupported = () => typeof Notification !== "undefined";

/** Registers the notification service worker for a section of the site (Android needs one to show notifications). */
export function registerNotifier(scope: string) {
  navigator.serviceWorker?.register("/notify-sw.js", { scope }).catch(() => {});
}

export async function askNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
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
