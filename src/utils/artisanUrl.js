export const toArtisanSlug = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  return raw
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const getArtisanPath = (seller) => {
  const slug = toArtisanSlug(seller?.storeName || seller?.name || seller?.id || '');
  if (!slug) return '/artisans';
  return `/artisan/${encodeURIComponent(slug)}`;
};
