/**
 * Ingredient import.
 *
 * An importer turns some source of recipe text into structured ingredients.
 * The only implementation today is the pasted-text parser: you copy the
 * ingredient block out of Cookidoo (or any recipe site) and paste it in.
 *
 * Fetching a Cookidoo page directly is deliberately not implemented — those
 * recipes sit behind a login and their terms restrict automated access. Any
 * future importer only has to produce ParsedIngredient[]; resolving those
 * against the saved-items catalog is already shared with manual authoring.
 */

export interface ParsedIngredient {
  /** The original line, kept so the user can see what was interpreted. */
  rawLine: string;
  /** Ingredient name with quantity, unit and trailing preparation removed. */
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface RecipeImporter {
  readonly id: string;
  /** Whether this importer can handle the given source. */
  canHandle(source: string): boolean;
  parse(source: string): Promise<ParsedIngredient[]>;
}
