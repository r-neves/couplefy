import { normalizeText } from "@/lib/utils/text";

/**
 * `saved_items.names` is a JSON map of aliases for one grocery item, e.g.
 * `{ default: "Tomato", secondary: "Tomate" }`. Older rows used `pt` instead of
 * `secondary`, so both are tolerated.
 */
export type SavedItemNames = Record<string, string>;

export function getSavedItemDisplayName(names: SavedItemNames): string {
  return names.default || Object.values(names)[0] || "Unknown";
}

export function getSavedItemAliases(names: SavedItemNames): string[] {
  return Object.values(names).filter(Boolean);
}

/**
 * Match a query against every alias of an item, ignoring case and accents, so
 * "tomate" finds an item stored as "Tomato".
 */
export function savedItemMatches(names: SavedItemNames, query: string): boolean {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return false;

  return getSavedItemAliases(names).some((alias) =>
    normalizeText(alias).includes(normalizedQuery)
  );
}

/** An exact alias match, used to spot an ingredient that is already catalogued. */
export function savedItemMatchesExactly(names: SavedItemNames, query: string): boolean {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return false;

  return getSavedItemAliases(names).some(
    (alias) => normalizeText(alias) === normalizedQuery
  );
}
