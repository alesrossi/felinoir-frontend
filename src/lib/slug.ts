export function generateSlug(title: string, year?: string): string {
  let slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (year) slug += `-${year}`;
  return slug;
}
