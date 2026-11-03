import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Menu, Receipt, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { settingsQuery } from "@/lib/site";
import { lastOrder, useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import defaultLogo from "@/assets/pappy-logo.png";

function Logo() {
  const { data } = useQuery(settingsQuery);
  const name = data?.name ?? "Pappy Burger";
  const [broken, setBroken] = useState(false);
  // Falls back to the name if an uploaded logo link stops working.
  if (broken) return <span className="font-display text-2xl font-black">{name}</span>;
  return (
    <img src={data?.logo_url || defaultLogo} alt={name} onError={() => setBroken(true)} width={800} height={285} className="h-11 w-auto object-contain md:h-12" />
  );
}

export function SiteHeader() {
  const { count } = useCart();
  const { t, lang, setLang } = useI18n();
  const [order, setOrder] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => setOrder(lastOrder()), []);

  const links = (
    <>
      <Link to="/" hash="menu" onClick={() => setOpen(false)} className="hover:text-accent">{t("nav.menu")}</Link>
      <Link to="/chi-siamo" onClick={() => setOpen(false)} className="hover:text-accent" activeProps={{ className: "text-accent" }}>{t("nav.about")}</Link>
      <Link to="/contatti" onClick={() => setOpen(false)} className="hover:text-accent" activeProps={{ className: "text-accent" }}>{t("nav.contacts")}</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center"><Logo /></Link>
        <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-5">
          <div className="hidden items-center gap-5 md:flex">{links}</div>
          {order && (
            <Link to="/ordine/$code" params={{ code: order }} className="flex items-center gap-1 rounded-full border border-accent px-3 py-2 text-accent" title={t("nav.order")}>
              <Receipt className="h-4 w-4" /><span className="hidden sm:inline">{t("nav.order")}</span>
            </Link>
          )}
          <button
            onClick={() => setLang(lang === "it" ? "en" : "it")}
            className="rounded-full border border-border px-3 py-2 text-xs font-bold uppercase hover:border-accent"
            aria-label={t("nav.lang")}
            title={t("nav.lang")}
          >
            {lang === "it" ? "EN" : "IT"}
          </button>
          <Link to="/carrello" className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label={t("nav.cart")}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-accent-foreground">{count}</span>
            )}
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="flex h-11 w-11 items-center justify-center rounded-full border border-border md:hidden" aria-label={t("nav.open")}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="bg-background">
              <SheetTitle className="sr-only">{t("nav.open")}</SheetTitle>
              <div className="mt-10 flex flex-col gap-6 text-2xl font-bold">{links}</div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </header>
  );
}
