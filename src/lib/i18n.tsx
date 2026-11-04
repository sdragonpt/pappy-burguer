import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "it" | "en";

const it = {
  "nav.menu": "Menu",
  "nav.about": "Chi siamo",
  "nav.contacts": "Contatti",
  "nav.cart": "Carrello",
  "nav.order": "Il tuo ordine",
  "nav.open": "Apri menu di navigazione",
  "nav.lang": "Switch to English",

  "status.open": "Aperto ora",
  "status.closed": "Chiuso ora",

  "hero.kicker": "Santa Vittoria d'Alba",
  "hero.title1": "Burger fatti",
  "hero.title2": "con i baffi.",
  "hero.order": "Ordina e ritira",
  "hero.directions": "Come arrivare",

  "menu.title1": "Il nostro",
  "menu.title2": "menu",
  "menu.add": "Aggiungi al carrello",
  "menu.unavailable": "Non disponibile",
  "menu.empty": "Nessun prodotto in questa categoria.",
  "menu.added": "{name} aggiunto al carrello",
  "menu.extras": "Personalizza",
  "menu.extrasHint": "Scegli gli extra (opzionale)",
  "menu.allergens": "Allergeni",
  "menu.allergenNote": "Per informazioni su allergeni e intolleranze chiedi al personale prima di ordinare.",
  "menu.closedBanner": "Gli ordini online sono chiusi in questo momento. Puoi comunque consultare il menu.",

  "cart.title": "Il tuo ordine",
  "cart.empty": "Il carrello è vuoto",
  "cart.toMenu": "Vai al menu",
  "cart.total": "Totale",
  "cart.less": "Meno",
  "cart.more": "Più",
  "cart.pickupTitle": "Dati per il ritiro",
  "cart.name": "Nome",
  "cart.phone": "Telefono",
  "cart.time": "Orario di ritiro (oggi)",
  "cart.timePick": "Scegli un orario",
  "cart.notes": "Note (opzionale)",
  "cart.notesPh": "Es. senza cipolla, cottura ben fatta…",
  "cart.confirm": "Conferma ordine · {total}",
  "cart.sending": "Invio…",
  "cart.payAtPickup": "Pagamento al ritiro in negozio.",
  "cart.privacy": "Usiamo nome e telefono solo per gestire il tuo ordine.",
  "cart.privacyLink": "Informativa privacy",
  "cart.noSlots": "Per oggi non ci sono più orari di ritiro disponibili. Torna a trovarci nel prossimo giorno di apertura!",
  "cart.closed": "Gli ordini online sono chiusi in questo momento.",

  "err.ordering_closed": "Gli ordini online sono appena stati chiusi. Riprova più tardi.",
  "err.invalid_time": "L'orario scelto non è più disponibile. Scegline un altro.",
  "err.invalid_phone": "Controlla il numero di telefono.",
  "err.invalid_name": "Inserisci il tuo nome.",
  "err.item_unavailable": "Un prodotto nel carrello non è più disponibile. Rimuovilo e riprova.",
  "err.rate_limited": "Troppi ordini in poco tempo. Chiamaci per completare l'ordine.",
  "err.kitchen_busy": "La cucina è al completo in questo momento. Riprova tra qualche minuto o chiamaci.",
  "err.generic": "Impossibile inviare l'ordine. Riprova.",

  "track.title": "Ordine {code}",
  "track.notFound": "Ordine non trovato",
  "track.notFoundText": "Il codice non esiste o l'ordine è più vecchio di due giorni.",
  "track.pickupAt": "Ritiro alle {time}",
  "track.nuovo": "Ricevuto",
  "track.in preparazione": "In preparazione",
  "track.pronto": "Pronto da ritirare",
  "track.ritirato": "Ritirato",
  "track.annullato": "Annullato",
  "track.cancelledText": "Questo ordine è stato annullato. Per informazioni chiamaci.",
  "track.received": "Ordine ricevuto!",
  "track.keep": "Tieni aperta questa pagina: si aggiorna da sola.",
  "track.back": "Torna al menu",
  "track.notifyMe": "Avvisami quando è pronto",
  "track.alertOnBoth": "🔔 Avviso attivo: suono e notifica quando l'ordine è pronto.",
  "track.alertOnSound": "🔊 Avviso attivo: suonerà quando l'ordine è pronto.",
  "track.notifyBlocked": "Le notifiche sono bloccate per questo sito. Per attivarle:",
  "track.notifyUnsupported": "Questo browser non mostra notifiche dai siti (su iPhone funzionano solo se aggiungi il sito alla schermata Home). Il suono funziona.",
  "track.recheck": "Fatto, ricontrolla",
  "track.keepOpen": "Tieni aperta questa pagina (va bene anche in secondo piano) e il volume alzato.",
  "track.testSound": "Prova il suono",
  "track.readyBanner": "Il tuo ordine è pronto! Ti aspettiamo in negozio.",
  "track.readyTitle": "Il tuo ordine è pronto! 🍔",
  "track.readyBody": "Ordine {code} · passa a ritirarlo da Pappy Burger.",

  "about.title": "Chi siamo",
  "about.default":
    "Pappy Burger nasce a Santa Vittoria d'Alba dalla voglia di fare hamburger seri: carne piemontese, pane fresco e salse fatte in casa. Niente fretta, solo ingredienti buoni e tanta passione.",
  "about.cta": "Guarda il menu",

  "contacts.title": "Contatti",
  "contacts.address": "Indirizzo",
  "contacts.hours": "Orari",
  "contacts.phone": "Telefono",
  "contacts.email": "Email",
  "contacts.social": "Social",
  "contacts.directions": "Apri in Google Maps",
  "contacts.call": "Chiama",

  "hours.closed": "Chiuso",

  "footer.privacy": "Privacy e cookie",
  "footer.rights": "Tutti i diritti riservati.",

  "nf.title": "Pagina non trovata",
  "nf.text": "La pagina che cerchi non esiste o è stata spostata.",
  "nf.home": "Torna alla home",
};

type Key = keyof typeof it;

const en: Record<Key, string> = {
  "nav.menu": "Menu",
  "nav.about": "About us",
  "nav.contacts": "Contact",
  "nav.cart": "Cart",
  "nav.order": "Your order",
  "nav.open": "Open navigation menu",
  "nav.lang": "Passa all'italiano",

  "status.open": "Open now",
  "status.closed": "Closed now",

  "hero.kicker": "Santa Vittoria d'Alba",
  "hero.title1": "Burgers made",
  "hero.title2": "just right.",
  "hero.order": "Order for pickup",
  "hero.directions": "Get directions",

  "menu.title1": "Our",
  "menu.title2": "menu",
  "menu.add": "Add to cart",
  "menu.unavailable": "Unavailable",
  "menu.empty": "No items in this category.",
  "menu.added": "{name} added to cart",
  "menu.extras": "Customise",
  "menu.extrasHint": "Choose extras (optional)",
  "menu.allergens": "Allergens",
  "menu.allergenNote": "For allergy and intolerance information, please ask our staff before ordering.",
  "menu.closedBanner": "Online ordering is closed right now. You can still browse the menu.",

  "cart.title": "Your order",
  "cart.empty": "Your cart is empty",
  "cart.toMenu": "Go to the menu",
  "cart.total": "Total",
  "cart.less": "Less",
  "cart.more": "More",
  "cart.pickupTitle": "Pickup details",
  "cart.name": "Name",
  "cart.phone": "Phone",
  "cart.time": "Pickup time (today)",
  "cart.timePick": "Choose a time",
  "cart.notes": "Notes (optional)",
  "cart.notesPh": "E.g. no onion, well done…",
  "cart.confirm": "Place order · {total}",
  "cart.sending": "Sending…",
  "cart.payAtPickup": "Pay when you pick up in store.",
  "cart.privacy": "We only use your name and phone to handle your order.",
  "cart.privacyLink": "Privacy notice",
  "cart.noSlots": "There are no pickup times left today. See you on our next opening day!",
  "cart.closed": "Online ordering is closed right now.",

  "err.ordering_closed": "Online ordering has just closed. Please try again later.",
  "err.invalid_time": "That pickup time is no longer available. Please choose another.",
  "err.invalid_phone": "Please check your phone number.",
  "err.invalid_name": "Please enter your name.",
  "err.item_unavailable": "An item in your cart is no longer available. Remove it and try again.",
  "err.rate_limited": "Too many orders in a short time. Please call us to complete your order.",
  "err.kitchen_busy": "The kitchen is fully booked right now. Please try again in a few minutes or call us.",
  "err.generic": "We couldn't send your order. Please try again.",

  "track.title": "Order {code}",
  "track.notFound": "Order not found",
  "track.notFoundText": "The code doesn't exist or the order is more than two days old.",
  "track.pickupAt": "Pickup at {time}",
  "track.nuovo": "Received",
  "track.in preparazione": "Being prepared",
  "track.pronto": "Ready for pickup",
  "track.ritirato": "Picked up",
  "track.annullato": "Cancelled",
  "track.cancelledText": "This order has been cancelled. Please call us for details.",
  "track.received": "Order received!",
  "track.keep": "Keep this page open: it updates by itself.",
  "track.back": "Back to the menu",
  "track.notifyMe": "Notify me when it's ready",
  "track.alertOnBoth": "🔔 Alert on: sound and notification when your order is ready.",
  "track.alertOnSound": "🔊 Alert on: a sound will play when your order is ready.",
  "track.notifyBlocked": "Notifications are blocked for this site. To allow them:",
  "track.notifyUnsupported": "This browser doesn't show notifications from websites (on iPhone they only work if you add the site to your Home Screen). Sound still works.",
  "track.recheck": "Done, check again",
  "track.keepOpen": "Keep this page open (in the background is fine) and your volume up.",
  "track.testSound": "Test the sound",
  "track.readyBanner": "Your order is ready! Come and pick it up.",
  "track.readyTitle": "Your order is ready! 🍔",
  "track.readyBody": "Order {code} · come and pick it up at Pappy Burger.",

  "about.title": "About us",
  "about.default":
    "Pappy Burger was born in Santa Vittoria d'Alba out of a wish to make serious burgers: Piedmontese beef, fresh buns and homemade sauces. No rush, just good ingredients and plenty of passion.",
  "about.cta": "See the menu",

  "contacts.title": "Contact",
  "contacts.address": "Address",
  "contacts.hours": "Opening hours",
  "contacts.phone": "Phone",
  "contacts.email": "Email",
  "contacts.social": "Social",
  "contacts.directions": "Open in Google Maps",
  "contacts.call": "Call",

  "hours.closed": "Closed",

  "footer.privacy": "Privacy & cookies",
  "footer.rights": "All rights reserved.",

  "nf.title": "Page not found",
  "nf.text": "The page you're looking for doesn't exist or has been moved.",
  "nf.home": "Go home",
};

const dict: Record<Lang, Record<Key, string>> = { it, en };

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  let s = dict[lang][key] ?? it[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  /** Picks the English copy when browsing in English and it exists, otherwise the Italian one. */
  pick: (itText: string | null | undefined, enText: string | null | undefined) => string;
};

const I18nContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "pappy-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  // Server render is always Italian; the stored or browser language is applied after hydration.
  const [lang, setLangState] = useState<Lang>("it");
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch { /* storage unavailable */ }
    if (stored === "it" || stored === "en") setLangState(stored);
    else if (!navigator.language.toLowerCase().startsWith("it")) setLangState("en");
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch { /* storage unavailable */ }
  };

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t: (key, vars) => translate(lang, key, vars),
        pick: (itText, enText) => (lang === "en" && enText ? enText : (itText ?? "")),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

const fallback: Ctx = {
  lang: "it",
  setLang: () => {},
  t: (key, vars) => translate("it", key, vars),
  pick: (itText) => itText ?? "",
};

/** Falls back to Italian outside the provider, e.g. in error and not-found screens rendered above it. */
export function useI18n() {
  return useContext(I18nContext) ?? fallback;
}
