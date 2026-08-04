/**
 * Recipe link source detection.
 *
 * This is the seam for the future Cookidoo/Bimby ingredient import: a link that
 * is tagged `cookidoo` is one an importer will later be able to parse into
 * ingredients. Nothing reads `source_type` yet beyond displaying an icon.
 */

export type RecipeSourceType = "web" | "cookidoo" | "book" | "other";

export function detectSourceType(url: string): RecipeSourceType {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("cookidoo")) return "cookidoo";
    return "web";
  } catch {
    // Not a URL at all — a cookbook reference, a page number, a note to self.
    return "other";
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
