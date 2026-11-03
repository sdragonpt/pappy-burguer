import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { settingsQuery } from "@/lib/site";
import { useI18n } from "@/lib/i18n";
import hero from "@/assets/hero-burger.jpg";

export const Route = createFileRoute("/chi-siamo")({
  head: () => ({
    meta: [
      { title: "Chi siamo · Pappy Burger" },
      { name: "description", content: "La storia di Pappy Burger, hamburger artigianali a Santa Vittoria d'Alba." },
      { property: "og:title", content: "Chi siamo · Pappy Burger" },
      { property: "og:description", content: "Hamburger artigianali a Santa Vittoria d'Alba." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: About,
});

function About() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { t, pick } = useI18n();
  const text = pick(s.about, s.about_en) || t("about.default");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-16 md:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-accent">{t("hero.kicker")}</p>
          <h1 className="text-5xl font-black md:text-6xl">{t("about.title")}</h1>
          {text.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="mt-5 text-lg leading-relaxed text-muted-foreground">{p}</p>
          ))}
          <Button size="lg" className="mt-8" asChild><Link to="/" hash="menu">{t("about.cta")}</Link></Button>
        </div>
        <img src={hero} alt="" width={1600} height={1008} className="aspect-[4/3] w-full rounded-2xl object-cover object-right" />
      </main>
      <SiteFooter />
    </div>
  );
}
