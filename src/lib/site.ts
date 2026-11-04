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

const MAX_IMAGE_SIDE = 1600;

/**
 * Phone photos are often 4000px and several MB, which makes the menu slow on mobile data.
 * Scales the longest side down to MAX_IMAGE_SIDE and re-encodes as WebP (keeps transparency for logos).
 * SVG/GIF and anything the browser can't decode are uploaded unchanged.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    // Keep the original if re-encoding didn't help (already small, or WebP unsupported).
    if (!blob || blob.type !== "image/webp" || (scale === 1 && blob.size >= file.size)) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/** Uploads a file to storage and returns a long-lived link. */
export async function uploadImage(original: File) {
  const file = await shrinkImage(original);
  const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2) throw e2;
  return data.signedUrl;
}
