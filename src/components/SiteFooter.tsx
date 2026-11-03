import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { MAPS_URL, settingsQuery } from "@/lib/site";
import { hoursSummary } from "@/lib/hours";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { data: s } = useQuery(settingsQuery);
  const { t, lang } = useI18n();
  if (!s) return null;
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
        <a href={MAPS_URL} target="_blank" rel="noreferrer" className="flex gap-3 hover:text-accent"><MapPin className="h-5 w-5 shrink-0 text-primary" />{s.address}</a>
        <div className="flex gap-3">
          <Clock className="h-5 w-5 shrink-0 text-primary" />
          <div>{hoursSummary(s.opening_hours, lang).map((line) => <p key={line}>{line}</p>)}</div>
        </div>
        <div className="space-y-2">
          {s.phone && <a href={`tel:${s.phone}`} className="flex gap-3 hover:text-accent"><Phone className="h-5 w-5 shrink-0 text-primary" />{s.phone}</a>}
          {s.email && <a href={`mailto:${s.email}`} className="flex gap-3 hover:text-accent"><Mail className="h-5 w-5 shrink-0 text-primary" />{s.email}</a>}
          {s.instagram && (
            <a href={`https://instagram.com/${s.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="flex gap-3 hover:text-accent">
              <Instagram className="h-5 w-5 shrink-0 text-primary" />@{s.instagram.replace(/^@/, "")}
            </a>
          )}
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {s.name}. {t("footer.rights")}</p>
          <Link to="/privacy" className="underline hover:text-accent">{t("footer.privacy")}</Link>
        </div>
      </div>
    </footer>
  );
}
