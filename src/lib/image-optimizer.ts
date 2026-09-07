/**
 * Helper to convert any image URL (even heavy 10MB camera shots) into ultra-fast, 
 * resized WebP streams via secure CDN proxy with graceful fallback.
 */
export function getOptimizedImageUrl(
  url: string,
  options?: { width?: number; quality?: number }
): string {
  if (!url || typeof url !== 'string') return url;

  // Return SVG data URLs or local base64 unchanged
  if (url.startsWith('data:') || url.endsWith('.svg')) return url;

  // Handle Imgur URLs directly with Imgur's built-in thumbnail suffixes
  // (s = 90x90, m = 320x320, l = 640x640, h = 1024x1024)
  if (url.includes('i.imgur.com/')) {
    const width = options?.width || 800;
    if (width <= 200) {
      // Use small thumbnail for gallery previews
      return url.replace(/\.(png|jpg|jpeg|gif|webp)$/i, (match) => `m${match}`);
    } else if (width <= 640) {
      return url.replace(/\.(png|jpg|jpeg|gif|webp)$/i, (match) => `l${match}`);
    } else {
      return url.replace(/\.(png|jpg|jpeg|gif|webp)$/i, (match) => `h${match}`);
    }
  }

  const width = options?.width || 800;
  const quality = options?.quality || 75;

  try {
    // Strip protocol to comply with wsrv.nl specifications
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${quality}&output=webp`;
  } catch (e) {
    return url;
  }
}

