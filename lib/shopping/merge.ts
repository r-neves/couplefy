import { normalizeText } from "@/lib/utils/text";

/**
 * Shopping list merge rule.
 *
 * The key is (normalized name, normalized unit) rather than name alone. That
 * makes "sum when the units match" fall out naturally and avoids inventing a
 * conversion: 200 g and 2 cups of rice are genuinely two lines, not one line
 * with a meaningless total.
 */
export function normalizeUnit(unit: string | null | undefined): string {
  return (unit ?? "").trim().toLowerCase();
}

export function shoppingMergeKey(name: string, unit: string | null | undefined): string {
  return `${normalizeText(name)}|${normalizeUnit(unit)}`;
}
