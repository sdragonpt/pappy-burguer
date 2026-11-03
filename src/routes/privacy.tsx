import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { settingsQuery } from "@/lib/site";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy e cookie · Pappy Burger" },
      { name: "description", content: "Informativa sul trattamento dei dati personali e sui cookie di Pappy Burger." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: Privacy,
});

// TODO(owner): fill in the legal entity before going live.
const OWNER = { company: "[RAGIONE SOCIALE]", vat: "[P.IVA]" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-2 space-y-2 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Privacy() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { lang } = useI18n();
  const contact = s.email || s.phone || s.address;
  const owner = `${OWNER.company} (${s.name}), ${s.address}, ${OWNER.vat}`;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        {lang === "en" ? (
          <>
            <h1 className="text-4xl font-black md:text-5xl">Privacy & cookie notice</h1>
            <p className="mt-2 text-sm text-muted-foreground">Pursuant to Articles 13–14 of Regulation (EU) 2016/679 (GDPR).</p>
            <Section title="Data controller"><p>{owner}. Contact: {contact}.</p></Section>
            <Section title="What we collect">
              <p>When you place an order: name, phone number, pickup time, the products ordered and any notes you write.</p>
              <p>For security, a one-way hash of your IP address, used only to stop automated or abusive orders.</p>
            </Section>
            <Section title="Why, and on what legal basis">
              <p>To prepare your order and contact you about it if needed (performance of a contract, Art. 6(1)(b) GDPR).</p>
              <p>To protect the service from abuse (legitimate interest, Art. 6(1)(f) GDPR).</p>
              <p>We do not use your data for marketing and we do not sell it.</p>
            </Section>
            <Section title="How long we keep it">
              <p>Order data is kept for as long as needed to handle the order and in any case for no more than 12 months, unless the law requires otherwise.</p>
            </Section>
            <Section title="Who processes it">
              <p>Only our staff. The data is stored with our hosting and database providers, who act as data processors under Art. 28 GDPR.</p>
            </Section>
            <Section title="Cookies and local storage">
              <p>This site uses no profiling or advertising cookies and no third-party analytics. Fonts are served from our own server.</p>
              <p>Your browser's local storage keeps your cart, your chosen language and the code of your latest order. This is strictly necessary for the service and requires no consent. You can clear it at any time from your browser settings.</p>
              <p>The "Get directions" and Instagram links open external sites, which have their own privacy policies.</p>
            </Section>
            <Section title="Your rights">
              <p>You can ask to access, correct or delete your data, restrict or object to its processing, and receive it in a portable format (Arts. 15–22 GDPR) by contacting us at {contact}. You can also lodge a complaint with the Italian Data Protection Authority (Garante per la protezione dei dati personali, garanteprivacy.it).</p>
            </Section>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-black md:text-5xl">Privacy e cookie</h1>
            <p className="mt-2 text-sm text-muted-foreground">Informativa ai sensi degli artt. 13–14 del Regolamento (UE) 2016/679 (GDPR).</p>
            <Section title="Titolare del trattamento"><p>{owner}. Contatti: {contact}.</p></Section>
            <Section title="Quali dati raccogliamo">
              <p>Quando effettui un ordine: nome, numero di telefono, orario di ritiro, prodotti ordinati ed eventuali note.</p>
              <p>Per sicurezza, un'impronta non reversibile (hash) del tuo indirizzo IP, usata solo per bloccare ordini automatici o abusivi.</p>
            </Section>
            <Section title="Perché e su quale base giuridica">
              <p>Per preparare il tuo ordine e contattarti se necessario (esecuzione di un contratto, art. 6.1.b GDPR).</p>
              <p>Per proteggere il servizio da abusi (legittimo interesse, art. 6.1.f GDPR).</p>
              <p>Non usiamo i tuoi dati per marketing e non li cediamo a terzi.</p>
            </Section>
            <Section title="Per quanto tempo">
              <p>I dati degli ordini sono conservati per il tempo necessario a gestire l'ordine e comunque non oltre 12 mesi, salvo obblighi di legge.</p>
            </Section>
            <Section title="Chi tratta i dati">
              <p>Solo il nostro personale. I dati sono ospitati presso i nostri fornitori di hosting e database, nominati responsabili del trattamento ai sensi dell'art. 28 GDPR.</p>
            </Section>
            <Section title="Cookie e memoria locale">
              <p>Questo sito non usa cookie di profilazione o pubblicitari né strumenti di analisi di terze parti. I caratteri tipografici sono serviti dal nostro server.</p>
              <p>La memoria locale del browser conserva il carrello, la lingua scelta e il codice dell'ultimo ordine. Si tratta di strumenti tecnici necessari al servizio, per i quali non serve il consenso. Puoi cancellarli in qualsiasi momento dalle impostazioni del browser.</p>
              <p>I link "Come arrivare" e Instagram aprono siti esterni, con le loro informative.</p>
            </Section>
            <Section title="I tuoi diritti">
              <p>Puoi chiedere l'accesso, la rettifica o la cancellazione dei tuoi dati, la limitazione o l'opposizione al trattamento e la portabilità (artt. 15–22 GDPR) scrivendoci a {contact}. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>
            </Section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
