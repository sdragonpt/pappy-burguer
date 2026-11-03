import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MenuCard } from "@/components/MenuCard";
import { Button } from "@/components/ui/button";
import { menuQuery, settingsQuery, CATEGORIES, MAPS_URL, categoryLabel } from "@/lib/site";
import { isOpenNow } from "@/lib/hours";
import { useI18n } from "@/lib/i18n";
import hero from "@/assets/hero-burger.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pappy Burger · Hamburger artigianali a Santa Vittoria d'Alba" },
      { name: "description", content: "Ordina online i burger di Pappy Burger e ritirali in negozio a Santa Vittoria d'Alba." },
      { property: "og:title", content: "Pappy Burger · Santa Vittoria d'Alba" },
      { property: "og:description", content: "Hamburger artigianali. Ordina online e ritira in negozio." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(menuQuery), context.queryClient.ensureQueryData(settingsQuery)]),
  component: Index,
});

function Index() {
  const { data: menu } = useSuspenseQuery(menuQuery);
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { t, pick, lang } = useI18n();
  const cats = [...CATEGORIES, ...new Set(menu.map((m) => m.category).filter((c) => !CATEGORIES.includes(c)))];
  const [cat, setCat] = useState(cats[0]);
  const items = menu.filter((m) => m.category === cat);
  // Computed after hydration so the server's clock and time zone don't leak into the markup.
  const [openNow, setOpenNow] = useState<boolean | null>(null);
  useEffect(() => setOpenNow(isOpenNow(s.opening_hours)), [s.opening_hours]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: s.name,
    servesCuisine: "Burger",
    address: s.address,
    telephone: s.phone ?? undefined,
    email: s.email ?? undefined,
    hasMap: MAPS_URL,
  };

  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <section className="relative overflow-hidden">
        <img src={hero} alt="Burger Pappy" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="hero-fade absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-36">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent">{t("hero.kicker")}</p>
            {openNow !== null && (
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${openNow ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
                <span className={`h-2 w-2 rounded-full ${openNow ? "bg-accent-foreground" : "bg-muted-foreground"}`} />
                {openNow ? t("status.open") : t("status.closed")}
              </span>
            )}
          </div>
          <h1 className="max-w-xl text-5xl font-black leading-[0.95] md:text-7xl">
            {t("hero.title1")} <span className="text-primary">{t("hero.title2")}</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">{pick(s.tagline, s.tagline_en)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><a href="#menu">{t("hero.order")}</a></Button>
            <Button size="lg" variant="outline" className="bg-transparent" asChild>
              <a href={MAPS_URL} target="_blank" rel="noreferrer">{t("hero.directions")}</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <h2 className="text-center text-4xl font-black md:text-6xl">{t("menu.title1")} <span className="text-primary">{t("menu.title2")}</span></h2>
        {!s.ordering_open && (
          <p className="mx-auto mt-6 max-w-xl rounded-xl border border-accent p-4 text-center text-sm">{t("menu.closedBanner")}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2" role="tablist">
          {cats.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={c === cat}
              onClick={() => setCat(c)}
              className={`rounded-full border px-5 py-2 text-sm font-bold transition ${c === cat ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-accent"}`}
            >
              {categoryLabel(c, lang)}
            </button>
          ))}
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => <MenuCard key={m.id} item={m} canOrder={s.ordering_open} />)}
          {items.length === 0 && <p className="col-span-full text-center text-muted-foreground">{t("menu.empty")}</p>}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">{t("menu.allergenNote")}</p>
      </section>

      <SiteFooter />
    </div>
  );
}
