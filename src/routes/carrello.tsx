import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart, euro, rememberOrder } from "@/lib/cart";
import { settingsQuery } from "@/lib/site";
import { pickupSlots } from "@/lib/hours";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/carrello")({
  head: () => ({
    meta: [
      { title: "Il tuo carrello · Pappy Burger" },
      { name: "description", content: "Completa il tuo ordine da ritirare da Pappy Burger." },
      { property: "og:title", content: "Carrello · Pappy Burger" },
      { property: "og:description", content: "Ordina e ritira in negozio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cart,
});

const SERVER_ERRORS = ["ordering_closed", "invalid_time", "invalid_phone", "invalid_name", "item_unavailable", "rate_limited"] as const;

function Cart() {
  const { lines, setQty, total, clear } = useCart();
  const { data: s } = useQuery(settingsQuery);
  const { t, pick, lang } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", time: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  // Pickup times depend on the visitor's clock, so they are only computed in the browser, and refreshed every minute.
  const [slots, setSlots] = useState<string[] | null>(null);
  useEffect(() => {
    if (!s) return;
    const update = () => setSlots(pickupSlots(s.opening_hours, s.prep_minutes));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [s]);
  useEffect(() => {
    if (slots && form.time && !slots.includes(form.time)) setForm((f) => ({ ...f, time: "" }));
  }, [slots, form.time]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSending(true);
    const { data, error } = await supabase.rpc("place_order", {
      p_name: form.name.trim(),
      p_phone: form.phone.trim(),
      p_pickup_time: form.time,
      p_notes: form.notes.trim(),
      p_items: lines.map((l) => ({ id: l.id, qty: l.qty, options: l.options.map((o) => o.id) })),
      p_lang: lang,
    });
    setSending(false);
    if (error) {
      const code = SERVER_ERRORS.find((c) => error.message.includes(c));
      return setErr(t(code ? `err.${code}` : "err.generic"));
    }
    const { code } = data as { code: string };
    rememberOrder(code);
    clear();
    navigate({ to: "/ordine/$code", params: { code }, search: { nuovo: true } });
  }

  const canOrder = s?.ordering_open !== false;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        {lines.length === 0 ? (
          <div className="text-center">
            <h1 className="text-3xl font-black">{t("cart.empty")}</h1>
            <Button className="mt-6" asChild><Link to="/" hash="menu">{t("cart.toMenu")}</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="text-4xl font-black">{t("cart.title")}</h1>
            <ul className="mt-6 divide-y divide-border rounded-2xl bg-card">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-bold">{pick(l.name, l.name_en)}</p>
                    {l.options.length > 0 && <p className="text-sm text-muted-foreground">+ {l.options.map((o) => pick(o.name, o.name_en)).join(", ")}</p>}
                    <p className="text-sm text-muted-foreground">{euro(l.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="secondary" onClick={() => setQty(l.key, l.qty - 1)} aria-label={t("cart.less")}><Minus className="h-4 w-4" /></Button>
                    <span className="w-6 text-center font-bold" aria-live="polite">{l.qty}</span>
                    <Button size="icon" variant="secondary" onClick={() => setQty(l.key, l.qty + 1)} disabled={l.qty >= 20} aria-label={t("cart.more")}><Plus className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
              <li className="flex justify-between p-4 text-lg font-black"><span>{t("cart.total")}</span><span className="text-accent">{euro(total)}</span></li>
            </ul>

            {!canOrder ? (
              <p className="mt-8 rounded-2xl border border-accent p-6 text-center">{t("cart.closed")}</p>
            ) : slots && slots.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-accent p-6 text-center">{t("cart.noSlots")}</p>
            ) : (
              <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl bg-card p-6">
                <h2 className="text-2xl font-bold">{t("cart.pickupTitle")}</h2>
                <div><Label htmlFor="n">{t("cart.name")}</Label><Input id="n" required autoComplete="given-name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label htmlFor="p">{t("cart.phone")}</Label><Input id="p" required type="tel" autoComplete="tel" pattern="\+?[0-9][0-9 .\/\-]{5,19}" maxLength={21} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div>
                  <Label htmlFor="t">{t("cart.time")}</Label>
                  <select
                    id="t"
                    required
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
                  >
                    <option value="" disabled>{t("cart.timePick")}</option>
                    {(slots ?? []).map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="no">{t("cart.notes")}</Label><Textarea id="no" maxLength={500} placeholder={t("cart.notesPh")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={sending || !slots}>{sending ? t("cart.sending") : t("cart.confirm", { total: euro(total) })}</Button>
                <p className="text-center text-xs text-muted-foreground">{t("cart.payAtPickup")}</p>
                <p className="text-center text-xs text-muted-foreground">
                  {t("cart.privacy")} <Link to="/privacy" className="underline">{t("cart.privacyLink")}</Link>
                </p>
              </form>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
