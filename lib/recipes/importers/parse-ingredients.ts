import { normalizeText } from "@/lib/utils/text";
import type { ParsedIngredient } from "./types";

/**
 * Parse a pasted ingredient list into structured rows.
 *
 * Written against the shape Cookidoo and most recipe sites use — one
 * ingredient per line, quantity first, then an optional unit, then the name,
 * optionally followed by preparation notes after a comma:
 *
 *   400 g de bacalhau demolhado, em lascas
 *   2 dentes de alho
 *   1 ½ chávenas de farinha
 *   sal q.b.
 */

// Units are matched longest-first so "colher de sopa" wins over "colher".
const UNITS = [
  // Portuguese, multiword first
  "colheres de sopa", "colher de sopa", "colheres de chá", "colher de chá",
  "c. de sopa", "c. de chá", "c. sopa", "c. chá",
  "chávenas", "chávena", "chavenas", "chavena",
  "unidades", "unidade", "dentes", "dente", "folhas", "folha",
  "ramos", "ramo", "pitadas", "pitada", "latas", "lata",
  "pacotes", "pacote", "embalagens", "embalagem", "fatias", "fatia",
  "copos", "copo", "colheres", "colher", "gramas", "grama",
  "quilos", "quilo", "litros", "litro",
  // English
  "tablespoons", "tablespoon", "teaspoons", "teaspoon",
  "cloves", "clove", "slices", "slice", "pinches", "pinch",
  "bunches", "bunch", "packs", "pack", "cans", "can",
  "cups", "cup",
  // Symbols and abbreviations
  "kg", "mg", "ml", "cl", "dl", "gr", "g", "l",
  "tbsp", "tsp", "oz", "lb", "un", "und",
];

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

/** Lines that are section headings or noise rather than ingredients. */
const NOISE = new Set([
  "ingredientes", "ingredients", "ingrediente", "ingredient",
  "preparacao", "preparation", "modo de preparo", "instructions",
  "utensilios", "utensils",
]);

function stripBullet(line: string): string {
  return line.replace(/^[\s\-–—•*·°⁃▪◦]+/, "").trim();
}

/**
 * Read a leading quantity, returning it and the rest of the line.
 *
 * Order matters: "1 1/2" and "1/2" both start with a digit, so the fraction
 * forms have to be tried before the plain-number form.
 */
function takeQuantity(text: string): { quantity: number | null; rest: string } {
  const consume = (match: RegExpMatchArray, value: number) => ({
    quantity: value,
    rest: takeRange(text.slice(match[0].length)),
  });

  // "1 1/2 chávenas"
  const mixedAscii = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*/);
  if (mixedAscii) {
    return consume(
      mixedAscii,
      parseInt(mixedAscii[1], 10) + parseInt(mixedAscii[2], 10) / parseInt(mixedAscii[3], 10)
    );
  }

  // "1 ½ chávenas"
  const mixedUnicode = text.match(/^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/);
  if (mixedUnicode) {
    return consume(
      mixedUnicode,
      parseInt(mixedUnicode[1], 10) + UNICODE_FRACTIONS[mixedUnicode[2]]
    );
  }

  // "1/2 limão"
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)\s*/);
  if (fraction) {
    return consume(fraction, parseInt(fraction[1], 10) / parseInt(fraction[2], 10));
  }

  // "½ cebola"
  const unicode = text.match(/^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/);
  if (unicode) {
    return consume(unicode, UNICODE_FRACTIONS[unicode[1]]);
  }

  // "400 g", "1,5 l"
  const plain = text.match(/^(\d+(?:[.,]\d+)?)\s*/);
  if (plain) {
    return consume(plain, parseFloat(plain[1].replace(",", ".")));
  }

  return { quantity: null, rest: text.trim() };
}

/**
 * Drop the upper bound of a range ("1-2 tomates"), keeping the lower one —
 * the safer amount to put on a shopping list.
 */
function takeRange(text: string): string {
  const trimmed = text.trim();
  const range = trimmed.match(/^(?:[-–—]|a|to)\s+?\d+(?:[.,]\d+)?\s*/i);
  return range ? trimmed.slice(range[0].length).trim() : trimmed;
}

/** Read a leading unit, returning it and the rest of the line. */
function takeUnit(text: string): { unit: string | null; rest: string } {
  const normalized = normalizeText(text);

  for (const unit of UNITS) {
    const normalizedUnit = normalizeText(unit);
    if (!normalized.startsWith(normalizedUnit)) continue;

    // Must be followed by a word boundary, so "g" does not match "gengibre"
    // and "l" does not match "limão".
    const next = normalized.charAt(normalizedUnit.length);
    if (next && /[a-z0-9]/.test(next)) continue;

    return { unit, rest: text.slice(unit.length).trim() };
  }

  return { unit: null, rest: text };
}

function stripConnector(text: string): string {
  return text.replace(/^(?:de|do|da|dos|das|d'|of)\s+/i, "").trim();
}

/** Drop preparation notes: "bacalhau demolhado, em lascas" -> "bacalhau demolhado". */
function stripPreparation(text: string): string {
  const beforeComma = text.split(",")[0];

  return beforeComma
    .replace(/\s*\([^)]*\)\s*/g, " ")
    // "as needed" markers carry no quantity and are not part of the name.
    .replace(/\b(?:q\.?\s?b\.?|a gosto|to taste|as needed|opcional|optional)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—]+|[\s\-–—.]+$/g, "")
    .trim();
}

function isNoise(line: string): boolean {
  const normalized = normalizeText(line).replace(/[:.]+$/, "");
  if (!normalized) return true;
  if (NOISE.has(normalized)) return true;
  // A heading like "Para o molho:" — ends with a colon and has no digits.
  if (/:$/.test(line.trim()) && !/\d/.test(line)) return true;
  return false;
}

export function parseIngredientText(source: string): ParsedIngredient[] {
  if (!source?.trim()) return [];

  const results: ParsedIngredient[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = stripBullet(rawLine);
    if (!line || isNoise(line)) continue;

    const { quantity, rest: afterQuantity } = takeQuantity(line);

    // Only look for a unit where a quantity introduced one; otherwise "Sal"
    // would be read as the litre unit "l".
    const { unit, rest: afterUnit } =
      quantity != null ? takeUnit(afterQuantity) : { unit: null, rest: afterQuantity };

    const name = stripPreparation(stripConnector(afterUnit));
    if (!name) continue;

    results.push({
      rawLine: line,
      name,
      quantity,
      unit: unit ?? null,
    });
  }

  return results;
}
