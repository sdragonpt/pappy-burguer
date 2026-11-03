import type { Lang } from "@/lib/i18n";

/** The 14 allergens that EU Regulation 1169/2011 requires restaurants to declare. */
export const ALLERGENS: { id: string; it: string; en: string }[] = [
  { id: "gluten", it: "Glutine", en: "Gluten" },
  { id: "crustaceans", it: "Crostacei", en: "Crustaceans" },
  { id: "eggs", it: "Uova", en: "Eggs" },
  { id: "fish", it: "Pesce", en: "Fish" },
  { id: "peanuts", it: "Arachidi", en: "Peanuts" },
  { id: "soy", it: "Soia", en: "Soy" },
  { id: "milk", it: "Latte", en: "Milk" },
  { id: "nuts", it: "Frutta a guscio", en: "Tree nuts" },
  { id: "celery", it: "Sedano", en: "Celery" },
  { id: "mustard", it: "Senape", en: "Mustard" },
  { id: "sesame", it: "Sesamo", en: "Sesame" },
  { id: "sulphites", it: "Solfiti", en: "Sulphites" },
  { id: "lupin", it: "Lupini", en: "Lupin" },
  { id: "molluscs", it: "Molluschi", en: "Molluscs" },
];

export const allergenLabel = (id: string, lang: Lang) => ALLERGENS.find((a) => a.id === id)?.[lang] ?? id;
