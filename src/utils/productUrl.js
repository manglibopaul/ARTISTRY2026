export const toProductSlug = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  return raw
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const getProductPath = (product) => {
  const slug = toProductSlug(product?.name || product?.id || '');
  if (!slug) return '/collection';
  return `/product/${encodeURIComponent(slug)}`;
};
