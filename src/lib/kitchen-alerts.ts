import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Alerts for a tablet left open on the orders page:
 * - a chime on every new order, repeated every REPEAT_MS while any order is still "nuovo" (nobody has picked it up),
 * - a system notification, so it is seen even when the tab is in the background,
 * - the tab title shows how many orders are waiting,
 * - a screen wake lock, so the tablet doesn't go to sleep.
 * Browsers only allow sound and notifications after a tap, hence enable().
 */
const REPEAT_MS = 20_000;
const PREF_KEY = "pappy-kitchen-alerts";

let audioCtx: AudioContext | null = null;

function chime() {
  if (!audioCtx || audioCtx.state !== "running") return;
  const ctx = audioCtx;
  [880, 1320, 880, 1320].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime + i * 0.2;
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t);
    o.stop(t + 0.3);
  });
}

async function showNotification(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    // Android Chrome only shows notifications through a service worker.
    const reg = await navigator.serviceWorker?.getRegistration("/admin");
    if (reg) await reg.showNotification(title, { body, tag, icon: "/apple-touch-icon.png", requireInteraction: true });
    else new Notification(title, { body, tag, icon: "/apple-touch-icon.png" });
  } catch {
    /* notifications unavailable */
  }
}

export function useKitchenAlerts(waiting: number) {
  const [wanted, setWanted] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    try {
      setWanted(localStorage.getItem(PREF_KEY) === "on");
    } catch {
      /* storage unavailable */
    }
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    navigator.serviceWorker?.register("/admin-sw.js", { scope: "/admin" }).catch(() => {});
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && !wakeLock.current) {
        wakeLock.current = await navigator.wakeLock.request("screen");
        wakeLock.current.addEventListener("release", () => (wakeLock.current = null));
      }
    } catch {
      /* not allowed (e.g. battery saver) */
    }
  }, []);

  /** Must run from a tap: unlocks audio, asks for notification permission and keeps the screen on. */
  const enable = useCallback(async () => {
    audioCtx ??= new AudioContext();
    await audioCtx.resume().catch(() => {});
    setSoundReady(audioCtx.state === "running");
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      setPermission(await Notification.requestPermission());
    }
    await requestWakeLock();
    setWanted(true);
    setMuted(false);
    try {
      localStorage.setItem(PREF_KEY, "on");
    } catch {
      /* storage unavailable */
    }
    chime();
  }, [requestWakeLock]);

  // The wake lock is dropped whenever the tab is hidden; take it again when it comes back.
  useEffect(() => {
    if (!wanted) return;
    const onVisible = () => document.visibilityState === "visible" && requestWakeLock();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [wanted, requestWakeLock]);

  // Keep ringing while orders are waiting, so one missed chime doesn't mean a forgotten order.
  useEffect(() => {
    if (!soundReady || muted || waiting === 0) return;
    const id = setInterval(chime, REPEAT_MS);
    return () => clearInterval(id);
  }, [soundReady, muted, waiting]);

  useEffect(() => {
    const base = "Gestione · Pappy Burger";
    document.title = waiting > 0 ? `(${waiting}) Nuovi ordini · ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [waiting]);

  const onNewOrder = useCallback(
    (o: { customer_name: string; pickup_time: string; public_code: string }) => {
      if (!muted) chime();
      showNotification("Nuovo ordine!", `${o.customer_name} · ritiro ${o.pickup_time}`, o.public_code);
    },
    [muted],
  );

  return { wanted, soundReady, muted, setMuted, permission, enable, onNewOrder };
}
