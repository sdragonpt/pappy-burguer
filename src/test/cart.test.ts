import { describe, it, expect } from "vitest";
import { addLine, cartTotal } from "@/lib/cart";

describe("cartTotal", () => {
  it("sums price × quantity", () => {
    expect(cartTotal([{ price: 11, qty: 2 }, { price: 6, qty: 1 }])).toBe(28);
  });
});

describe("addLine", () => {
  const bacon = { id: "bac", name: "Bacon", price: 2 };
  const cheddar = { id: "che", name: "Cheddar", price: 1.5 };

  it("merges the same item with the same extras, whatever order they were picked in", () => {
    let lines = addLine([], { id: "a", name: "Classic", price: 11, options: [bacon, cheddar] });
    lines = addLine(lines, { id: "a", name: "Classic", price: 11, options: [cheddar, bacon] });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ qty: 2, price: 14.5 });
  });

  it("keeps the same item with different extras on separate rows", () => {
    let lines = addLine([], { id: "a", name: "Classic", price: 11 });
    lines = addLine(lines, { id: "a", name: "Classic", price: 11, options: [bacon] });
    expect(lines.map((l) => l.price)).toEqual([11, 13]);
    expect(cartTotal(lines)).toBe(24);
  });
});
