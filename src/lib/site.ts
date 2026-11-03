import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { parseHours } from "@/lib/hours";
import type { Lang } from "@/lib/i18n";

/** A paid extra on a menu item, e.g. "+ bacon". */
export type ItemOption = { id: string; name: string; name_en?: string | null; price: number };
export type MenuItem = Omit<Tables<"menu_items">, "options" | "allergens"> & { options: ItemOption[]; allergens: string[] };
export type Settings = ReturnType<typeof normaliseSettings>;

// Columns added by migration 0001 may be missing on a database that has not been migrated yet,
// so every new field gets a fallback here instead of in each component.
function normaliseSettings(row: Tables<"site_settings">) {
  return {
    ...row,
    ordering_open: row.ordering_open ?? true,
    prep_minutes: row.prep_minutes ?? 20,
    opening_hours: parseHours(row.opening_hours),
  };
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return normaliseSettings(data);
  },
});

export const menuQuery = queryOptions({
  queryKey: ["menu"],
  queryFn: async () => {
    const { data, error } = await supabase.from("menu_items").select("*").order("category").order("sort_order");
    if (error) throw error;
    return data.map(
      (m): MenuItem => ({
        ...m,
        allergens: m.allergens ?? [],
        options: Array.isArray(m.options) ? (m.options as ItemOption[]) : [],
      }),
    );
  },
});

export const CATEGORIES = ["Burgers", "Contorni", "Bevande", "Dolci"];
const CATEGORY_EN: Record<string, string> = { Burgers: "Burgers", Contorni: "Sides", Bevande: "Drinks", Dolci: "Desserts" };
export const categoryLabel = (c: string, lang: Lang) => (lang === "en" ? (CATEGORY_EN[c] ?? c) : c);

export const MAPS_URL = "https://maps.app.goo.gl/3wXmUQsGThtpSeFK7";

/** Uploads a file to storage and returns a long-lived link. */
export async function uploadImage(file: File) {
  const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2) throw e2;
  return data.signedUrl;
}
