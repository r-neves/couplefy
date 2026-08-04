/**
 * Normalize text for accent- and case-insensitive comparison.
 * Used for searching the saved-items catalog, searching recipes, and matching
 * ingredient names against existing shopping list items.
 */

// Combining diacritical marks, left by NFD normalization.
// Built via `new RegExp` so the codepoint escapes stay readable in source.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function normalizeText(text: string): string {
  return text
    .normalize("NFD") // separate base characters from their diacritics
    .replace(DIACRITICS, "")
    .toLowerCase()
    .trim();
}

/**
 * True when `haystack` contains `needle`, ignoring case and accents.
 */
export function matchesText(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}
