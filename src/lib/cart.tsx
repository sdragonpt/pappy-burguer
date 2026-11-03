import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ItemOption } from "@/lib/site";

/** One cart row. The same burger with different extras is a different row, hence `key`. */
export type CartLine = {
  key: string;
  id: string;
  name: string;
  name_en?: string | null | undefined;
  /** Unit price including extras. Shown to the customer only; the server reprices every order. */
  price: number;
  qty: number;
  options: ItemOption[];
};

type AddInput = { id: string; name: string; name_en?: string | null | undefined; price: number; options?: ItemOption[] };

type Ctx = {
  lines: CartLine[];
  add: (item: AddInput) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "pappy-cart-v2";

export function cartTotal(lines: Pick<CartLine, "price" | "qty">[]) {
  return Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
}

export function lineKey(id: string, options: ItemOption[] = []) {
  return [id, ...options.map((o) => o.id).sort()].join("|");
}

/** Adds an item to the cart, merging with an identical row (same item and same extras). */
export function addLine(lines: CartLine[], item: AddInput): CartLine[] {
  const options = item.options ?? [];
  const key = lineKey(item.id, options);
  if (lines.some((l) => l.key === key)) return lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
  const price = Math.round((item.price + options.reduce((s, o) => s + Number(o.price), 0)) * 100) / 100;
  return [...lines, { key, id: item.id, name: item.name, name_en: item.name_en, price, qty: 1, options }];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch { /* storage unavailable */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    // Wait for the stored cart to load, or the first render would overwrite it with [].
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch { /* storage unavailable */ }
  }, [lines, loaded]);

  const add: Ctx["add"] = (item) => setLines((prev) => addLine(prev, item));
  const setQty: Ctx["setQty"] = (key, qty) =>
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, 20) } : l))));

  return (
    <CartContext.Provider
      value={{ lines, add, setQty, clear: () => setLines([]), total: cartTotal(lines), count: lines.reduce((s, l) => s + l.qty, 0) }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside provider");
  return c;
}

export const euro = (n: number) => `€ ${Number(n).toFixed(2)}`;

/** The customer's most recent order code, so they can get back to the tracking page. */
const LAST_ORDER_KEY = "pappy-last-order";
export function rememberOrder(code: string) {
  try {
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch { /* storage unavailable */ }
}
export function lastOrder(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) ?? "null");
    return v && Date.now() - v.at < 12 * 60 * 60 * 1000 ? v.code : null;
  } catch {
    return null;
  }
}
