import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Search, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKitchenAlerts } from "@/lib/kitchen-alerts";
import { euro } from "@/lib/cart";

type OrderLine = { id: string; name: string; qty: number; options?: string[] };
export type Order = {
  id: string;
  public_code: string;
  customer_name: string;
  phone: string;
  pickup_time: string;
  notes: string | null;
  items: unknown;
  total: number;
  status: string;
  created_at: string | null;
};

const ACTIVE = ["nuovo", "in preparazione", "pronto"];
const DONE = ["ritirato", "annullato"];

const STATUS_STYLE: Record<string, string> = {
  nuovo: "bg-accent text-accent-foreground",
  "in preparazione": "bg-primary text-primary-foreground",
  pronto: "bg-secondary text-secondary-foreground",
  ritirato: "bg-muted text-muted-foreground",
  annullato: "bg-destructive text-destructive-foreground",
};

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isToday = (iso: string | null) => !!iso && dayKey(new Date(iso)) === dayKey(new Date());

export function OrdersPanel() {
  const [view, setView] = useState<"active" | "history">("active");
  const [active, setActive] = useState<Order[]>([]);
  const [live, setLive] = useState(true);
  const waiting = active.filter((o) => o.status === "nuovo").length;
  const alerts = useKitchenAlerts(waiting);
  const onNewOrderRef = useRef(alerts.onNewOrder);
  onNewOrderRef.current = alerts.onNewOrder;

  const loadActive = useCallback(async () => {
    // Older open orders (e.g. forgotten yesterday) still show, so nothing gets lost.
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from("orders").select("*").in("status", ACTIVE).gte("created_at", since).order("pickup_time");
    if (!error) setActive((data ?? []) as Order[]);
  }, []);

  useEffect(() => {
    loadActive();
    const ch = supabase
      .channel(`orders-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        if (p.eventType === "INSERT") {
          const o = p.new as Order;
          toast.success(`Nuovo ordine! ${o.customer_name} · ${o.pickup_time}`);
          onNewOrderRef.current(o);
        }
        loadActive();
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    // Safety net if the live connection drops (tablet Wi-Fi, sleep): reload every 30 s anyway.
    const poll = setInterval(loadActive, 30_000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(ch);
    };
  }, [loadActive]);

  async function setStatus(id: string, status: string) {
    if (status === "annullato" && !confirm("Annullare questo ordine?")) return;
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error("Errore");
    loadActive();
  }

  return (
    <div className="mt-4 space-y-4">
      <AlertsBar alerts={alerts} live={live} />
      <div className="flex gap-2" role="tablist">
        <button role="tab" aria-selected={view === "active"} onClick={() => setView("active")} className={`rounded-full border px-4 py-2 text-sm font-bold ${view === "active" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
          In corso ({active.length})
        </button>
        <button role="tab" aria-selected={view === "history"} onClick={() => setView("history")} className={`rounded-full border px-4 py-2 text-sm font-bold ${view === "history" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
          Storico
        </button>
      </div>
      {view === "active" ? <ActiveOrders orders={active} setStatus={setStatus} /> : <History setStatus={setStatus} />}
    </div>
  );
}

function AlertsBar({ alerts, live }: { alerts: ReturnType<typeof useKitchenAlerts>; live: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-3 text-sm">
      {!alerts.soundReady ? (
        <Button onClick={alerts.enable} className="animate-pulse">
          <Bell className="h-4 w-4" /> {alerts.wanted ? "Tocca per riattivare suono e avvisi" : "Attiva suono e avvisi"}
        </Button>
      ) : (
        <Button variant={alerts.muted ? "destructive" : "secondary"} onClick={() => alerts.setMuted(!alerts.muted)}>
          {alerts.muted ? <><BellOff className="h-4 w-4" /> Suono spento</> : <><Bell className="h-4 w-4" /> Suono attivo</>}
        </Button>
      )}
      {alerts.permission === "denied" && <span className="text-destructive">Notifiche bloccate nel browser</span>}
      <span className={`ml-auto flex items-center gap-1 ${live ? "text-accent" : "text-destructive"}`}>
        {live ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />} {live ? "In tempo reale" : "Riconnessione…"}
      </span>
    </div>
  );
}

function OrderCard({ o, setStatus, done }: { o: Order; setStatus: (id: string, s: string) => void; done?: boolean }) {
  return (
    <div className={`rounded-2xl bg-card p-4 ${o.status === "nuovo" ? "ring-2 ring-accent" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-bold">
            Ritiro {o.pickup_time} · {o.customer_name} · <a href={`tel:${o.phone}`} className="text-accent">{o.phone}</a>
          </p>
          <p className="text-sm text-muted-foreground">
            #{o.public_code} · {o.created_at && new Date(o.created_at).toLocaleString("it-IT", isToday(o.created_at) ? { timeStyle: "short" } : { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_STYLE[o.status] ?? "bg-secondary"}`}>{o.status}</span>
      </div>
      <ul className="mt-2 text-sm">
        {(o.items as OrderLine[]).map((l, i) => (
          <li key={i}>
            <b>{l.qty}×</b> {l.name}
            {l.options && l.options.length > 0 && <span className="text-accent"> + {l.options.join(", ")}</span>}
          </li>
        ))}
      </ul>
      {o.notes && <p className="mt-1 text-sm italic">“{o.notes}”</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-auto font-bold text-accent">{euro(o.total)}</span>
        {done ? (
          <Button size="sm" variant="secondary" onClick={() => setStatus(o.id, "pronto")}>Riapri</Button>
        ) : (
          <>
            <Button size="sm" variant={o.status === "nuovo" ? "default" : "secondary"} onClick={() => setStatus(o.id, "in preparazione")}>In preparazione</Button>
            <Button size="sm" variant="secondary" onClick={() => setStatus(o.id, "pronto")}>Pronto</Button>
            <Button size="sm" onClick={() => setStatus(o.id, "ritirato")}>Ritirato</Button>
            <Button size="sm" variant="destructive" onClick={() => setStatus(o.id, "annullato")}>Annulla</Button>
          </>
        )}
      </div>
    </div>
  );
}

function ActiveOrders({ orders, setStatus }: { orders: Order[]; setStatus: (id: string, s: string) => void }) {
  // Waiting orders first, then by pickup time.
  const sorted = [...orders].sort((a, b) => Number(b.status === "nuovo") - Number(a.status === "nuovo") || a.pickup_time.localeCompare(b.pickup_time));
  if (sorted.length === 0) return <p className="text-muted-foreground">Nessun ordine in corso. I nuovi ordini appaiono qui da soli.</p>;
  return <div className="space-y-3">{sorted.map((o) => <OrderCard key={o.id} o={o} setStatus={setStatus} />)}</div>;
}

function History({ setStatus }: { setStatus: (id: string, s: string) => void }) {
  const [day, setDay] = useState(dayKey(new Date()));
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);

  const load = useCallback(async () => {
    const start = new Date(`${day}T00:00:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .in("status", DONE)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);
  }, [day]);
  useEffect(() => {
    load();
  }, [load]);

  async function reopen(id: string, status: string) {
    await setStatus(id, status);
    load();
  }

  const needle = q.trim().toLowerCase();
  const shown = (orders ?? []).filter((o) => !needle || [o.customer_name, o.phone, o.public_code].some((v) => v.toLowerCase().includes(needle)));
  const picked = shown.filter((o) => o.status === "ritirato");
  const revenue = picked.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" aria-label="Giorno" className="w-auto" value={day} max={dayKey(new Date())} onChange={(e) => e.target.value && setDay(e.target.value)} />
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Cerca" placeholder="Cerca nome, telefono o codice" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {orders && (
        <p className="text-sm text-muted-foreground">
          {picked.length} ritirati · {shown.length - picked.length} annullati · incasso {euro(revenue)}
        </p>
      )}
      {orders === null ? (
        <p className="text-muted-foreground">Caricamento…</p>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground">Nessun ordine concluso in questo giorno.</p>
      ) : (
        shown.map((o) => <OrderCard key={o.id} o={o} setStatus={reopen} done />)
      )}
    </div>
  );
}
