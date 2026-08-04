import { normalizeText } from "@/lib/utils/text";
import { getSavedItemAliases } from "@/lib/utils/saved-items";

/**
 * Resolve a parsed ingredient name against the saved-items catalog.
 *
 * This is the same catalog the manual ingredient autocomplete uses, so an
 * imported line and a hand-typed one resolve identically. Parsed names carry
 * descriptors the catalog does not ("bacalhau demolhado" vs "Bacalhau"), so a
 * whole-word containment match is used alongside the exact one.
 */

export interface CatalogLike {
  id: string;
  names: Record<string, string>;
  displayName: string;
}

export type MatchConfidence = "exact" | "partial" | "none";

export interface CatalogMatch {
  savedItemId: string | null;
  matchedName: string | null;
  confidence: MatchConfidence;
}

const NO_MATCH: CatalogMatch = {
  savedItemId: null,
  matchedName: null,
  confidence: "none",
};

/**
 * Naive Portuguese/English singularisation, enough to match a pasted
 * "tomates" or "batatas" against a catalog entry called "Tomate"/"Batata".
 * Applied per word so "batatas descascadas" also reduces.
 */
function singularize(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 3) return word;
      if (word.endsWith("oes")) return `${word.slice(0, -3)}ao`; // limoes -> limao
      if (word.endsWith("aes")) return `${word.slice(0, -3)}ao`; // paes -> pao
      if (word.endsWith("ais")) return `${word.slice(0, -2)}l`; // sais -> sal
      if (word.endsWith("eis")) return `${word.slice(0, -3)}el`; // papeis -> papel
      if (word.endsWith("res") || word.endsWith("ses") || word.endsWith("zes")) {
        return word.slice(0, -2); // colheres -> colher
      }
      if (word.endsWith("s")) return word.slice(0, -1); // tomates -> tomate
      return word;
    })
    .join(" ");
}

/** True when `needle` appears in `haystack` on word boundaries. */
function containsWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const index = haystack.indexOf(needle);
  if (index === -1) return false;

  const before = index === 0 ? "" : haystack.charAt(index - 1);
  const after = haystack.charAt(index + needle.length);

  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

export function matchToCatalog(name: string, catalog: CatalogLike[]): CatalogMatch {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return NO_MATCH;

  const singularName = singularize(normalizedName);

  let bestPartial: CatalogMatch | null = null;
  let bestPartialLength = 0;

  for (const item of catalog) {
    for (const alias of getSavedItemAliases(item.names)) {
      const normalizedAlias = normalizeText(alias);
      if (!normalizedAlias) continue;

      const singularAlias = singularize(normalizedAlias);

      if (normalizedAlias === normalizedName || singularAlias === singularName) {
        return { savedItemId: item.id, matchedName: item.displayName, confidence: "exact" };
      }

      // "bacalhau demolhado" contains the catalog's "bacalhau". Only this
      // direction is checked: a short pasted name like "alho" must not match a
      // more specific, unrelated entry such as "alho francês".
      const contained =
        containsWord(normalizedName, normalizedAlias) ||
        containsWord(singularName, singularAlias);

      // Prefer the longest alias, which is the most specific match.
      if (contained && normalizedAlias.length > bestPartialLength) {
        bestPartialLength = normalizedAlias.length;
        bestPartial = {
          savedItemId: item.id,
          matchedName: item.displayName,
          confidence: "partial",
        };
      }
    }
  }

  return bestPartial ?? NO_MATCH;
}
