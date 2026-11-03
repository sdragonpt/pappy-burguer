import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { MAPS_URL, settingsQuery } from "@/lib/site";
import { WEEK_ORDER, dayName, romeNow } from "@/lib/hours";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contatti")({
  head: () => ({
    meta: [
      { title: "Contatti e orari · Pappy Burger" },
      { name: "description", content: "Indirizzo, orari e telefono di Pappy Burger a Santa Vittoria d'Alba." },
      { property: "og:title", content: "Contatti · Pappy Burger" },
      { property: "og:description", content: "Indirizzo, orari e telefono." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: Contacts,
});

function Contacts() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { t, lang } = useI18n();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(romeNow().dow), []);
  const ig = s.instagram?.replace(/^@/, "");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <h1 className="text-5xl font-black md:text-6xl">{t("contacts.title")}</h1>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="space-y-6 rounded-2xl bg-card p-6">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold"><MapPin className="h-5 w-5 text-primary" />{t("contacts.address")}</h2>
              <p className="mt-2">{s.address}</p>
              <Button variant="outline" className="mt-3 bg-transparent" asChild>
                <a href={MAPS_URL} target="_blank" rel="noreferrer">{t("contacts.directions")}</a>
              </Button>
            </div>
            {s.phone && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold"><Phone className="h-5 w-5 text-primary" />{t("contacts.phone")}</h2>
                <a href={`tel:${s.phone}`} className="mt-2 block text-lg font-bold text-accent">{s.phone}</a>
              </div>
            )}
            {s.email && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold"><Mail className="h-5 w-5 text-primary" />{t("contacts.email")}</h2>
                <a href={`mailto:${s.email}`} className="mt-2 block text-accent">{s.email}</a>
              </div>
            )}
            {ig && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold"><Instagram className="h-5 w-5 text-primary" />{t("contacts.social")}</h2>
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="mt-2 block text-accent">@{ig}</a>
              </div>
            )}
          </section>
          <section className="rounded-2xl bg-card p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Clock className="h-5 w-5 text-primary" />{t("contacts.hours")}</h2>
            <table className="mt-4 w-full text-left">
              <tbody>
                {WEEK_ORDER.map((d) => {
                  const slots = s.opening_hours[d] ?? [];
                  return (
                    <tr key={d} className={`border-b border-border/60 last:border-0 ${d === today ? "font-bold text-accent" : ""}`}>
                      <th scope="row" className="py-2 pr-4 font-semibold">{dayName(d, lang, true)}</th>
                      <td className="py-2">{slots.length ? slots.map(([a, b]) => `${a}–${b}`).join(" · ") : t("hours.closed")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
