import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart, euro } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { allergenLabel } from "@/lib/allergens";
import type { ItemOption, MenuItem } from "@/lib/site";

export function MenuCard({ item: m, canOrder }: { item: MenuItem; canOrder: boolean }) {
  const { add } = useCart();
  const { t, pick, lang } = useI18n();
  const [choosing, setChoosing] = useState(false);
  const name = pick(m.name, m.name_en);

  function addToCart(options: ItemOption[] = []) {
    add({ id: m.id, name: m.name, name_en: m.name_en, price: Number(m.price), options });
    toast.success(t("menu.added", { name }));
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-card">
      <div className="aspect-[4/3] bg-muted">
        {m.image_url ? (
          <img src={m.image_url} alt={name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-3xl text-muted-foreground/50">Pappy</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold">{name}</h3>
          <span className="whitespace-nowrap font-bold text-accent">{euro(m.price)}</span>
        </div>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">{pick(m.description, m.description_en)}</p>
        {m.allergens.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1" aria-label={t("menu.allergens")}>
            {m.allergens.map((a) => (
              <li key={a} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{allergenLabel(a, lang)}</li>
            ))}
          </ul>
        )}
        {canOrder && (
          <Button className="mt-4" disabled={!m.available} onClick={() => (m.options.length ? setChoosing(true) : addToCart())}>
            {m.available ? <><Plus className="h-4 w-4" /> {m.options.length ? t("menu.extras") : t("menu.add")}</> : t("menu.unavailable")}
          </Button>
        )}
      </div>
      {choosing && <ExtrasDialog item={m} onClose={() => setChoosing(false)} onAdd={(opts) => { addToCart(opts); setChoosing(false); }} />}
    </article>
  );
}

function ExtrasDialog({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (options: ItemOption[]) => void }) {
  const { t, pick } = useI18n();
  const [picked, setPicked] = useState<string[]>([]);
  const chosen = item.options.filter((o) => picked.includes(o.id));
  const total = Number(item.price) + chosen.reduce((s, o) => s + Number(o.price), 0);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>{pick(item.name, item.name_en)}</DialogTitle>
          <DialogDescription>{t("menu.extrasHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {item.options.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:border-accent">
              <Checkbox
                checked={picked.includes(o.id)}
                onCheckedChange={(v) => setPicked((p) => (v ? [...p, o.id] : p.filter((x) => x !== o.id)))}
              />
              <span className="flex-1">{pick(o.name, o.name_en)}</span>
              <span className="text-sm text-accent">+ {euro(o.price)}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => onAdd(chosen)}>
            <Plus className="h-4 w-4" /> {t("menu.add")} · {euro(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
