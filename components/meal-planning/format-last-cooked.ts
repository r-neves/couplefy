/**
 * "cooked 3 days ago", "cooked 2 weeks ago" — enough precision to answer
 * "have we had this recently?" without a date library.
 */
export function formatLastCooked(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);

  if (days <= 0) return "cooked today";
  if (days === 1) return "cooked yesterday";
  if (days < 7) return `cooked ${days} days ago`;

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `cooked ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(days / 30);
  return `cooked ${months} month${months === 1 ? "" : "s"} ago`;
}
