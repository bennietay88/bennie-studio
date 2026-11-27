/** Legacy single-site consumers may use an explicitly primary website or an unambiguous singleton. */
export function choosePrimaryWebsite<T extends { is_primary?: boolean | null }>(rows: readonly T[]): T | null {
  const primary = rows.filter(row => row.is_primary === true);
  if (primary.length === 1) return primary[0];
  if (primary.length > 1 || rows.length > 1) throw new Error("AMBIGUOUS_PRIMARY_WEBSITE");
  return rows[0] ?? null;
}
