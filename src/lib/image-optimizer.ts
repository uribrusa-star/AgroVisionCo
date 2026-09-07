/**
 * Helper to convert any image URL (even heavy 10MB camera shots) into ultra-fast, 
 * resized WebP streams via secure CDN proxy.
 */
export function getOptimizedImageUrl(
  url: string,
  options?: { width?: number; quality?: number }
): string {
  if (!url || typeof url !== 'string') return url;

  // Return SVG data URLs or local base64 unchanged
  if (url.startsWith('data:') || url.endsWith('.svg')) return url;

  const width = options?.width || 800;
  const quality = options?.quality || 75;

  try {
    const encodedUrl = encodeURIComponent(url);
    return `https://wsrv.nl/?url=${encodedUrl}&w=${width}&q=${quality}&output=webp&il`;
  } catch (e) {
    return url;
  }
}
