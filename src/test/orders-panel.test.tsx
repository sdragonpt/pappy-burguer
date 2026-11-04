import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const now = new Date().toISOString();
const rows = [
  { id: "1", public_code: "AAA", customer_name: "Mario", phone: "+39333", pickup_time: "20:30", notes: null, items: [{ id: "x", name: "Classic", qty: 1 }], total: 11, status: "pronto", created_at: now },
  { id: "2", public_code: "BBB", customer_name: "Anna", phone: "+39334", pickup_time: "21:00", notes: "senza cipolla", items: [{ id: "x", name: "Classic", qty: 2, options: ["Bacon"] }], total: 26, status: "nuovo", created_at: now },
  { id: "3", public_code: "CCC", customer_name: "Luca", phone: "+39335", pickup_time: "19:00", notes: null, items: [], total: 4, status: "ritirato", created_at: now },
  { id: "4", public_code: "DDD", customer_name: "Sara", phone: "+39336", pickup_time: "19:15", notes: null, items: [], total: 9, status: "annullato", created_at: now },
];

// Minimal stand-in for the Supabase query builder: supports the .in("status", [...]) filter the panel uses.
vi.mock("@/integrations/supabase/client", () => {
  const query = () => {
    let statuses: string[] = [];
    const q = {
      select: () => q,
      in: (_: string, v: string[]) => ((statuses = v), q),
      gte: () => q,
      lt: () => q,
      order: () => q,
      eq: () => q,
      update: () => q,
      then: (resolve: (r: unknown) => void) => resolve({ data: rows.filter((r) => statuses.includes(r.status)), error: null }),
    };
    return q;
  };
  const channel = { on: () => channel, subscribe: (cb: (s: string) => void) => (cb("SUBSCRIBED"), channel) };
  return { supabase: { from: query, channel: () => channel, removeChannel: () => {} } };
});

import { OrdersPanel } from "@/components/admin/OrdersPanel";

describe("OrdersPanel", () => {
  it("lists open orders with waiting ones first, and finished ones only in Storico", async () => {
    render(<OrdersPanel />);
    await waitFor(() => expect(screen.getByText(/In corso \(2\)/)).toBeInTheDocument());

    const names = screen.getAllByText(/^Ritiro /).map((el) => el.textContent ?? "");
    expect(names[0]).toContain("Anna"); // "nuovo" first even though Mario picks up earlier
    expect(names[1]).toContain("Mario");
    expect(screen.queryByText(/Luca/)).not.toBeInTheDocument();
    expect(screen.getByText(/\+ Bacon/)).toBeInTheDocument();
    expect(document.title).toBe("(1) Nuovi ordini · Gestione · Pappy Burger");
    expect(screen.getByRole("button", { name: /Attiva suono e avvisi/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Storico" }));
    await waitFor(() => expect(screen.getByText(/1 ritirati · 1 annullati · incasso € 4.00/)).toBeInTheDocument());
    expect(screen.getAllByRole("button", { name: "Riapri" })).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Cerca"), { target: { value: "sara" } });
    const cards = screen.getAllByText(/^Ritiro /);
    expect(cards).toHaveLength(1);
    expect(within(cards[0]!).getByText(/Sara/)).toBeInTheDocument();
  });
});
