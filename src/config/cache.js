import NodeCache from 'node-cache';

// Default TTL: 5 minutes. Products cache is invalidated on any write.
export const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Invalidate all product cache keys after a write (create/update/delete/toggle)
export const invalidateProducts = () => {
  const keys = cache.keys().filter((k) => k.startsWith('products_'));
  if (keys.length) cache.del(keys);
};
