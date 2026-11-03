import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { euro } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

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
    refetchInterval: (q) => (["ritirato", "annullato"].includes(q.state.data?.status ?? "") ? false : 15_000),
  });

  const current = data ? STEPS.indexOf(data.status as (typeof STEPS)[number]) : -1;

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
