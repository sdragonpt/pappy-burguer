import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { menuQuery, settingsQuery, uploadImage, CATEGORIES, type ItemOption, type Settings } from "@/lib/site";
import { ALLERGENS } from "@/lib/allergens";
import { WEEK_ORDER, dayName, type OpeningHours } from "@/lib/hours";
import { euro } from "@/lib/cart";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Gestione · Pappy Burger" },
      { name: "description", content: "Area riservata per gestire menu, logo e ordini." },
      { property: "og:title", content: "Gestione · Pappy Burger" },
      { property: "og:description", content: "Area riservata." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setIsAdmin(null);
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (!session) return <Login />;
  if (isAdmin === null) return <p className="p-10 text-center">Caricamento...</p>;
  if (!isAdmin)
    return (
      <div className="p-10 text-center">
        <p>Questo account non ha accesso.</p>
        <Button className="mt-4" onClick={() => supabase.auth.signOut()}>Esci</Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Gestione Pappy</h1>
        <div className="flex items-center gap-4">
          <OrderingToggle />
          <Button variant="secondary" onClick={() => supabase.auth.signOut()}>Esci</Button>
        </div>
      </div>
      <Tabs defaultValue="ordini">
        <TabsList>
          <TabsTrigger value="ordini">Ordini</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="orari">Orari</TabsTrigger>
          <TabsTrigger value="sito">Logo e info</TabsTrigger>
        </TabsList>
        <TabsContent value="ordini"><Orders /></TabsContent>
        <TabsContent value="menu"><MenuEditor /></TabsContent>
        <TabsContent value="orari"><HoursEditor /></TabsContent>
        <TabsContent value="sito"><SettingsEditor /></TabsContent>
      </Tabs>
    </div>
  );
}

/** Quick switch for busy evenings: stops new online orders without touching the opening hours. */
function OrderingToggle() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  if (!data) return null;
  async function toggle(v: boolean) {
    const { error } = await supabase.from("site_settings").update({ ordering_open: v }).eq("id", 1);
    if (error) {
      toast.error("Errore");
      return;
    }
    toast.success(v ? "Ordini online aperti" : "Ordini online chiusi");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }
  return (
    <label className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold ${data.ordering_open ? "border-accent text-accent" : "border-destructive text-destructive"}`}>
      <Switch checked={data.ordering_open} onCheckedChange={toggle} />
      {data.ordering_open ? "Ordini aperti" : "Ordini chiusi"}
    </label>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  // Sign-up is only offered until the owner's account exists; the first account becomes admin.
  const [canSignUp, setCanSignUp] = useState(false);
  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data, error }) => setCanSignUp(!error && data === false));
  }, []);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setMsg(error ? error.message : "Controlla la tua email per confermare l'account.");
    }
  }
  return (
    <form onSubmit={go} className="mx-auto mt-20 max-w-sm space-y-4 rounded-2xl bg-card p-6">
      <h1 className="text-2xl font-black">{mode === "in" ? "Accedi" : "Crea account"}</h1>
      <div><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={mode === "in" ? 6 : 10} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      {msg && <p className="text-sm text-accent">{msg}</p>}
      <Button type="submit" className="w-full">{mode === "in" ? "Entra" : "Registrati"}</Button>
      {(canSignUp || mode === "up") && (
        <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Primo accesso? Crea account" : "Hai già un account? Accedi"}
        </button>
      )}
    </form>
  );
}

type OrderLine = { id: string; name: string; qty: number; options?: string[] };
type Order = { id: string; public_code: string; customer_name: string; phone: string; pickup_time: string; notes: string | null; items: unknown; total: number; status: string; created_at: string | null };

const STATUS_STYLE: Record<string, string> = {
  nuovo: "bg-accent text-accent-foreground",
  "in preparazione": "bg-primary text-primary-foreground",
  pronto: "bg-secondary text-secondary-foreground",
  ritirato: "bg-muted text-muted-foreground",
  annullato: "bg-destructive text-destructive-foreground",
};

/** Short two-tone chime so a new order is noticed in a noisy kitchen. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch { /* no audio available */ }
}

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [onlyToday, setOnlyToday] = useState(true);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  async function load() {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    setOrders((data ?? []) as Order[]);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel(`orders-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        if (p.eventType === "INSERT") {
          toast.success("Nuovo ordine!");
          if (soundRef.current) chime();
        }
        load();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  async function setStatus(id: string, status: string) {
    if (status === "annullato" && !confirm("Annullare questo ordine?")) return;
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error("Errore");
    load();
  }

  const todayKey = new Date().toDateString();
  const shown = onlyToday ? orders.filter((o) => o.created_at && new Date(o.created_at).toDateString() === todayKey) : orders;
  // Open orders first, by pickup time; finished ones after.
  const done = (o: Order) => o.status === "ritirato" || o.status === "annullato";
  const sorted = [...shown].sort((a, b) => Number(done(a)) - Number(done(b)) || (onlyToday ? a.pickup_time.localeCompare(b.pickup_time) : 0));
  const todayTotal = shown.filter((o) => o.status !== "annullato").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><Switch checked={onlyToday} onCheckedChange={setOnlyToday} /> Solo oggi</label>
        <label className="flex items-center gap-2"><Switch checked={sound} onCheckedChange={setSound} /> Suono nuovi ordini</label>
        <span className="ml-auto text-muted-foreground">{shown.length} ordini · {euro(todayTotal)}</span>
      </div>
      {sorted.length === 0 && <p className="text-muted-foreground">Nessun ordine.</p>}
      {sorted.map((o) => (
        <div key={o.id} className={`rounded-2xl bg-card p-4 ${done(o) ? "opacity-50" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-bold">Ritiro {o.pickup_time} · {o.customer_name} · <a href={`tel:${o.phone}`} className="text-accent">{o.phone}</a></p>
              <p className="text-sm text-muted-foreground">#{o.public_code} · {o.created_at && new Date(o.created_at).toLocaleString("it-IT")}</p>
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
            <Button size="sm" variant="secondary" onClick={() => setStatus(o.id, "in preparazione")}>In preparazione</Button>
            <Button size="sm" variant="secondary" onClick={() => setStatus(o.id, "pronto")}>Pronto</Button>
            <Button size="sm" onClick={() => setStatus(o.id, "ritirato")}>Ritirato</Button>
            <Button size="sm" variant="destructive" onClick={() => setStatus(o.id, "annullato")}>Annulla</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

type Item = {
  id?: string;
  category: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  sort_order: number;
  allergens: string[];
  options: ItemOption[];
};

const EMPTY_ITEM: Item = { category: "Burgers", name: "", name_en: "", description: "", description_en: "", price: 0, image_url: null, available: true, sort_order: 0, allergens: [], options: [] };

function MenuEditor() {
  const qc = useQueryClient();
  const { data: menu = [] } = useQuery(menuQuery);
  const [editing, setEditing] = useState<Item | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["menu"] });

  async function remove(id: string) {
    if (!confirm("Eliminare questo prodotto?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    refresh();
  }
  async function toggleAvailable(id: string, available: boolean) {
    await supabase.from("menu_items").update({ available }).eq("id", id);
    refresh();
  }

  return (
    <div className="mt-4">
      <Button onClick={() => setEditing(EMPTY_ITEM)}>+ Nuovo prodotto</Button>
      {editing && <ItemForm key={editing.id ?? "new"} item={editing} onDone={() => { setEditing(null); refresh(); }} />}
      <div className="mt-4 space-y-2">
        {menu.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">{m.image_url && <img src={m.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-40 flex-1">
              <p className="font-bold">{m.name}</p>
              <p className="text-sm text-muted-foreground">
                {m.category} · {euro(m.price)}
                {m.options.length > 0 && ` · ${m.options.length} extra`}
                {!m.name_en && <span className="text-accent"> · manca inglese</span>}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm" title="Disponibile oggi">
              <Switch checked={m.available} onCheckedChange={(v) => toggleAvailable(m.id, v)} /> Disponibile
            </label>
            <Button size="sm" variant="secondary" onClick={() => setEditing({ ...m, name_en: m.name_en ?? "", description_en: m.description_en ?? "" })}>Modifica</Button>
            <Button size="sm" variant="destructive" onClick={() => remove(m.id)}>Elimina</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemForm({ item, onDone }: { item: Item; onDone: () => void }) {
  const [f, setF] = useState(item);
  const [busy, setBusy] = useState(false);
  async function onFile(file?: File) {
    if (!file) return undefined;
    setBusy(true);
    try { setF({ ...f, image_url: await uploadImage(file) }); } catch { toast.error("Caricamento foto fallito"); }
    setBusy(false);
  }
  const setOption = (i: number, patch: Partial<ItemOption>) => setF({ ...f, options: f.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      category: f.category.trim(),
      name: f.name.trim(),
      name_en: f.name_en?.trim() || null,
      description: f.description,
      description_en: f.description_en?.trim() || null,
      price: Number(f.price),
      image_url: f.image_url,
      available: f.available,
      sort_order: Number(f.sort_order),
      allergens: f.allergens,
      options: f.options.filter((o) => o.name.trim()).map((o) => ({ ...o, name: o.name.trim(), name_en: o.name_en?.trim() || null, price: Number(o.price) })),
    };
    const { error } = f.id ? await supabase.from("menu_items").update(payload).eq("id", f.id) : await supabase.from("menu_items").insert(payload);
    setBusy(false);
    if (error) { toast.error("Errore nel salvataggio"); return; }
    toast.success("Salvato");
    onDone();
  }
  return (
    <form onSubmit={save} className="mt-4 grid gap-3 rounded-2xl border border-accent bg-card p-5 sm:grid-cols-2">
      <div><Label htmlFor="i-name">Nome</Label><Input id="i-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label htmlFor="i-name-en">Nome in inglese</Label><Input id="i-name-en" placeholder="Se vuoto si usa il nome italiano" value={f.name_en ?? ""} onChange={(e) => setF({ ...f, name_en: e.target.value })} /></div>
      <div>
        <Label htmlFor="i-cat">Categoria</Label>
        <Input id="i-cat" list="cats" required value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="i-price">Prezzo (€)</Label><Input id="i-price" type="number" step="0.01" min="0" required value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></div>
        <div><Label htmlFor="i-sort">Ordine</Label><Input id="i-sort" type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} /></div>
      </div>
      <div><Label htmlFor="i-desc">Descrizione / ingredienti</Label><Textarea id="i-desc" value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div><Label htmlFor="i-desc-en">Descrizione in inglese</Label><Textarea id="i-desc-en" value={f.description_en ?? ""} onChange={(e) => setF({ ...f, description_en: e.target.value })} /></div>

      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Allergeni (Reg. UE 1169/2011)</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ALLERGENS.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={f.allergens.includes(a.id)}
                onCheckedChange={(v) => setF({ ...f, allergens: v ? [...f.allergens, a.id] : f.allergens.filter((x) => x !== a.id) })}
              />
              {a.it}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="text-sm font-medium">Extra a pagamento (es. + bacon)</legend>
        {f.options.map((o, i) => (
          <div key={o.id} className="flex flex-wrap items-center gap-2">
            <Input aria-label="Nome extra" placeholder="Nome" className="min-w-32 flex-1" value={o.name} onChange={(e) => setOption(i, { name: e.target.value })} />
            <Input aria-label="Nome extra in inglese" placeholder="Inglese" className="min-w-32 flex-1" value={o.name_en ?? ""} onChange={(e) => setOption(i, { name_en: e.target.value })} />
            <Input aria-label="Prezzo extra" type="number" step="0.01" min="0" className="w-24" value={o.price} onChange={(e) => setOption(i, { price: Number(e.target.value) })} />
            <Button type="button" size="icon" variant="ghost" aria-label="Rimuovi extra" onClick={() => setF({ ...f, options: f.options.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="secondary" onClick={() => setF({ ...f, options: [...f.options, { id: crypto.randomUUID().slice(0, 8), name: "", name_en: "", price: 1 }] })}>
          <Plus className="h-4 w-4" /> Aggiungi extra
        </Button>
      </fieldset>

      <div className="sm:col-span-2">
        <Label htmlFor="i-photo">Foto</Label>
        <div className="flex items-center gap-3">
          {f.image_url && <img src={f.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
          <Input id="i-photo" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>
      <label className="flex items-center gap-2"><Switch checked={f.available} onCheckedChange={(v) => setF({ ...f, available: v })} /> Disponibile</label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Annulla</Button>
        <Button type="submit" disabled={busy}>{busy ? "..." : "Salva"}</Button>
      </div>
    </form>
  );
}

function useSettingsForm() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [f, setF] = useState<Settings | undefined>(data);
  useEffect(() => setF(data), [data]);
  async function save(patch: Partial<Omit<Settings, "id">>) {
    const { error } = await supabase.from("site_settings").update(patch).eq("id", 1);
    if (error) { toast.error("Errore"); return; }
    toast.success("Salvato");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }
  return { f, setF, save };
}

function HoursEditor() {
  const { f, setF, save } = useSettingsForm();
  if (!f) return null;
  const hours = f.opening_hours;
  const day = (d: string) => hours[d] ?? [];
  const setDay = (d: string, slots: [string, string][]) => setF({ ...f, opening_hours: { ...hours, [d]: slots } });
  const invalid = WEEK_ORDER.some((d) => day(d).some(([a, b]) => !a || !b || a >= b));

  return (
    <div className="mt-4 space-y-4 rounded-2xl bg-card p-5">
      <p className="text-sm text-muted-foreground">Gli orari servono sia per la pagina Contatti sia per gli orari di ritiro proposti ai clienti. Gli ordini si possono fare solo per oggi, dentro questi orari.</p>
      {WEEK_ORDER.map((d) => (
        <div key={d} className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-3">
          <span className="w-28 font-bold">{dayName(d, "it", true)}</span>
          {day(d).length === 0 && <span className="text-sm text-muted-foreground">Chiuso</span>}
          {day(d).map(([a, b], i) => (
            <span key={i} className="flex items-center gap-1">
              <Input type="time" aria-label={`${dayName(d, "it", true)} apertura ${i + 1}`} className="w-28" value={a} onChange={(e) => setDay(d, day(d).map((s, j) => (j === i ? [e.target.value, s[1]] : s)))} />
              –
              <Input type="time" aria-label={`${dayName(d, "it", true)} chiusura ${i + 1}`} className="w-28" value={b} onChange={(e) => setDay(d, day(d).map((s, j) => (j === i ? [s[0], e.target.value] : s)))} />
              <Button size="icon" variant="ghost" aria-label="Rimuovi fascia" onClick={() => setDay(d, day(d).filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </span>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setDay(d, [...day(d), ["19:00", "23:00"]])}><Plus className="h-4 w-4" /> Fascia</Button>
        </div>
      ))}
      <div className="max-w-xs">
        <Label htmlFor="prep">Tempo minimo di preparazione (minuti)</Label>
        <Input id="prep" type="number" min={0} max={180} value={f.prep_minutes} onChange={(e) => setF({ ...f, prep_minutes: Number(e.target.value) })} />
      </div>
      {invalid && <p className="text-sm text-destructive">Ogni fascia deve avere l'apertura prima della chiusura (fasce dopo mezzanotte non sono supportate).</p>}
      <Button disabled={invalid} onClick={() => save({ opening_hours: hours satisfies OpeningHours, prep_minutes: f.prep_minutes })}>Salva orari</Button>
    </div>
  );
}

function SettingsEditor() {
  const { f, setF, save } = useSettingsForm();
  const [busy, setBusy] = useState(false);
  if (!f) return null;
  async function onLogo(file?: File) {
    if (!file || !f) return undefined;
    setBusy(true);
    try { setF({ ...f, logo_url: await uploadImage(file) }); } catch { toast.error("Caricamento fallito"); }
    setBusy(false);
  }
  const text = (key: "name" | "tagline" | "tagline_en" | "address" | "phone" | "email" | "instagram", label: string) => (
    <div>
      <Label htmlFor={`s-${key}`}>{label}</Label>
      <Input id={`s-${key}`} value={f[key] ?? ""} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
    </div>
  );
  return (
    <div className="mt-4 grid gap-4 rounded-2xl bg-card p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="s-logo">Logo</Label>
        <div className="flex items-center gap-3">
          {f.logo_url && <img src={f.logo_url} alt="" className="h-16 max-w-48 rounded-md object-contain" />}
          <Input id="s-logo" type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0])} />
          {f.logo_url && <Button variant="secondary" onClick={() => setF({ ...f, logo_url: null })}>Usa logo originale</Button>}
        </div>
      </div>
      {text("name", "Nome")}
      {text("address", "Indirizzo")}
      {text("tagline", "Slogan")}
      {text("tagline_en", "Slogan in inglese")}
      {text("phone", "Telefono")}
      {text("email", "Email")}
      {text("instagram", "Instagram (es. @pappyburger)")}
      <div className="sm:col-span-2"><Label htmlFor="s-about">Chi siamo (lascia una riga vuota tra i paragrafi)</Label><Textarea id="s-about" rows={5} value={f.about ?? ""} onChange={(e) => setF({ ...f, about: e.target.value })} /></div>
      <div className="sm:col-span-2"><Label htmlFor="s-about-en">Chi siamo in inglese</Label><Textarea id="s-about-en" rows={5} value={f.about_en ?? ""} onChange={(e) => setF({ ...f, about_en: e.target.value })} /></div>
      <Button
        className="sm:col-span-2"
        disabled={busy}
        onClick={() => {
          const clean = (v: string | null) => v?.trim() || null;
          save({
            name: f.name.trim(), logo_url: f.logo_url, tagline: clean(f.tagline), tagline_en: clean(f.tagline_en), address: clean(f.address),
            phone: clean(f.phone), email: clean(f.email), instagram: clean(f.instagram), about: clean(f.about), about_en: clean(f.about_en),
          });
        }}
      >
        Salva
      </Button>
    </div>
  );
}
