export function formatCategorySlug(slug: string): string {
  const cleaned = slug.replace(/[-_]+/g, " ").trim();
  if (!cleaned) {
    return slug;
  }
  return cleaned.replace(/\b\w/g, (match) => match.toUpperCase());
}
