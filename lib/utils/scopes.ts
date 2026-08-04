export interface ScopeOption {
  /** "personal", or a group id. */
  id: string;
  label: string;
  isGroup: boolean;
}

export interface ScopeGroup {
  id: string;
  name: string;
}

export const PERSONAL_SCOPE = "personal";

/**
 * The boards a user can switch between.
 *
 * With exactly one group there is nothing to separate — everything is shared
 * with that group — so it becomes the only board and the selector is hidden.
 * With no groups at all there is likewise only one board. The personal/group
 * switcher only earns its space once there are several groups.
 */
export function getScopeOptions(userGroups: ScopeGroup[]): ScopeOption[] {
  if (userGroups.length === 1) {
    return [{ id: userGroups[0].id, label: userGroups[0].name, isGroup: true }];
  }

  return [
    { id: PERSONAL_SCOPE, label: "Personal", isGroup: false },
    ...userGroups.map((group) => ({ id: group.id, label: group.name, isGroup: true })),
  ];
}

/** Resolve a remembered board, falling back to the first available one. */
export function resolveScope(saved: string | null, options: ScopeOption[]): string {
  const fallback = options[0]?.id ?? PERSONAL_SCOPE;
  if (!saved) return fallback;
  return options.some((option) => option.id === saved) ? saved : fallback;
}
