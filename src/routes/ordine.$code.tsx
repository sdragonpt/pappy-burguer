import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Circle, PartyPopper, Volume2, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { euro } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { AUDIO_EVENT, askNotificationPermission, audioReady, isIOS, keepScreenOn, notificationPermission, playTones, registerNotifier, showNotification, unblockHint, unlockAudio, type NotifyPermission } from "@/lib/alerts";

export const Route = createFileRoute("/ordine/$code")({
  validateSearch: (search: Record<string, unknown>): { nuovo?: boolean } => (search["nuovo"] ? { nuovo: true } : {}),
  head: ({ params }) => ({
    meta: [
      { title: `Ordine ${params.code} · Pappy Burger` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Tracking,
});

const STEPS = ["nuovo", "in preparazione", "pronto", "ritirato"] as const;
type Status = { status: string; pickup_time: string; total: number; items: { name: string; qty: number; options?: string[] }[] } | null;

function Tracking() {
  const { code } = Route.useParams();
  const { nuovo } = Route.useSearch();
  const { t } = useI18n();
  // Customers can't subscribe to the orders table (it's admin-only), so poll the public status function.
  const { data, isLoading } = useQuery({
    queryKey: ["order-status", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("order_status", { p_code: code });
      if (error) throw error;
      return data as Status;
    },
    retry: 1,
    refetchInterval: (q) => (["ritirato", "annullato"].includes(q.state.data?.status ?? "") ? false : 10_000),
    // Keep checking while the customer is in another tab or app; browsers slow this down but don't stop it.
    refetchIntervalInBackground: true,
  });

  const current = data ? STEPS.indexOf(data.status as (typeof STEPS)[number]) : -1;
  const ready = data?.status === "pronto";

  // Alert only on the change to "pronto" seen by this page, not when it is opened on an order that is already ready.
  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    const status = data?.status ?? null;
    if (prevStatus.current && prevStatus.current !== "pronto" && status === "pronto") {
      playTones([523, 659, 784, 1047, 784, 1047], 0.18);
      navigator.vibrate?.([300, 150, 300, 150, 600]);
      showNotification("/ordine", t("track.readyTitle"), t("track.readyBody", { code }), `ready-${code}`, `/ordine/${code}`);
    }
    prevStatus.current = status;
  }, [data?.status, code, t]);

  useEffect(() => {
    if (ready) document.title = `✅ ${t("track.pronto")} · ${code} · Pappy Burger`;
  }, [ready, code, t]);

  const waitingForKitchen = data?.status === "nuovo" || data?.status === "in preparazione";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        {isLoading ? (
          <p className="text-center text-muted-foreground">…</p>
        ) : !data ? (
          <div className="text-center">
            <h1 className="text-3xl font-black">{t("track.notFound")}</h1>
            <p className="mt-2 text-muted-foreground">{t("track.notFoundText")}</p>
            <Button className="mt-6" asChild><Link to="/">{t("track.back")}</Link></Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-6 md:p-10">
            {nuovo && <p className="mb-2 text-center text-lg font-bold text-accent">{t("track.received")}</p>}
            <h1 className="text-center text-3xl font-black">{t("track.title", { code })}</h1>
            <p className="mt-1 text-center text-muted-foreground">{t("track.pickupAt", { time: data.pickup_time })}</p>

            {ready && (
              <p role="status" className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent p-4 text-center text-lg font-black text-accent-foreground">
                <PartyPopper className="h-6 w-6 shrink-0" /> {t("track.readyBanner")}
              </p>
            )}
            {waitingForKitchen && <NotifyMe />}

            {data.status === "annullato" ? (
              <div className="mt-8 flex flex-col items-center gap-2 text-center">
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="font-bold">{t("track.annullato")}</p>
                <p className="text-sm text-muted-foreground">{t("track.cancelledText")}</p>
              </div>
            ) : (
              <ol className="mt-8 grid gap-3 sm:grid-cols-4" aria-live="polite">
                {STEPS.map((step, i) => {
                  const done = i <= current;
                  return (
                    <li key={step} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold sm:flex-col sm:text-center ${i === current ? "border-accent text-accent" : done ? "border-border" : "border-border text-muted-foreground"}`} aria-current={i === current ? "step" : undefined}>
                      {done ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <Circle className="h-5 w-5 shrink-0" />}
                      {t(`track.${step}`)}
                    </li>
                  );
                })}
              </ol>
            )}

            <ul className="mt-8 divide-y divide-border border-y border-border text-sm">
              {data.items.map((l, i) => (
                <li key={i} className="py-2">
                  {l.qty}× {l.name}
                  {l.options && l.options.length > 0 && <span className="text-muted-foreground"> (+ {l.options.join(", ")})</span>}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between text-lg font-black"><span>{t("cart.total")}</span><span className="text-accent">{euro(data.total)}</span></p>
            <p className="mt-6 text-center text-xs text-muted-foreground">{t("cart.payAtPickup")} {t("track.keep")}</p>
            <div className="mt-6 text-center"><Button variant="secondary" asChild><Link to="/">{t("track.back")}</Link></Button></div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * Opt-in for the "order ready" alert. A tap is needed before the browser allows sound, and notifications
 * need permission; when they are blocked or unsupported, explain why and how, instead of failing silently.
 */
function NotifyMe() {
  const { t, lang } = useI18n();
  const [sound, setSound] = useState(false);
  const [permission, setPermission] = useState<NotifyPermission>("default");
  useEffect(() => {
    registerNotifier("/ordine");
    // Placing the order was already a tap on this page, so sound may already be (or soon be) unlocked.
    const sync = () => setSound(audioReady());
    sync();
    setPermission(notificationPermission());
    window.addEventListener(AUDIO_EVENT, sync);
    return () => window.removeEventListener(AUDIO_EVENT, sync);
  }, []);

  // While the alert is on and the order isn't ready, keep the screen lit (this component unmounts once it's ready).
  useEffect(() => (sound ? keepScreenOn() : undefined), [sound]);

  async function enable() {
    setSound(await unlockAudio());
    setPermission(await askNotificationPermission());
    playTones([784, 1047], 0.15);
  }

  if (!sound || permission === "default")
    return (
      <div className="mt-6 text-center">
        <Button onClick={enable}><Bell className="h-4 w-4" /> {t("track.notifyMe")}</Button>
      </div>
    );

  return (
    <div className="mt-6 space-y-2 rounded-xl border border-border p-4 text-center text-sm">
      <p className="font-bold text-accent">
        {t(permission === "granted" ? "track.alertOnBoth" : "track.alertOnSound")}
      </p>
      {permission === "denied" && (
        <p className="text-muted-foreground">
          {t("track.notifyBlocked")} {unblockHint(lang)}{" "}
          <button className="underline" onClick={() => setPermission(notificationPermission())}>{t("track.recheck")}</button>
        </p>
      )}
      {permission === "unsupported" && <p className="text-muted-foreground">{t("track.notifyUnsupported")}</p>}
      <p className="text-muted-foreground">{t(isIOS() ? "track.keepOpenIOS" : "track.keepOpen")}</p>
      <button className="underline" onClick={() => playTones([523, 659, 784, 1047, 784, 1047], 0.18)}>
        <Volume2 className="mr-1 inline h-4 w-4" />{t("track.testSound")}
      </button>
    </div>
  );
}
