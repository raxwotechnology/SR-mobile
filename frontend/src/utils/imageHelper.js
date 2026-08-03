/**
 * Converts a Google Drive share/view URL to a direct-image URL.
 */
export const convertGoogleDriveUrl = (url) => {
  if (!url) return url;
  const trimmed = url.trim();

  // 1. Raw File ID (33 characters)
  if (/^[a-zA-Z0-9_-]{33}$/.test(trimmed)) {
    return `https://drive.google.com/uc?export=view&id=${trimmed}`;
  }

  // 2. Drive URL formats
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;

  const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;

  const ucMatch = trimmed.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return `https://drive.google.com/uc?export=view&id=${ucMatch[1]}`;

  return trimmed;
};

/**
 * Converts other common image host page URLs to direct image URLs if possible.
 */
export const convertExternalUrl = (url) => {
  if (!url) return url;
  let trimmed = url.trim();

  // Handle Google Drive (Verified working)
  const driveConverted = convertGoogleDriveUrl(trimmed);
  if (driveConverted !== trimmed) return driveConverted;

  return trimmed;
};

/**
 * Returns true if the URL is likely a direct image link
 */
export const isDirectImageUrl = (url) => {
  if (!url) return false;
  const trimmed = url.trim();
  // If it ends in an image extension
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(trimmed)) return true;
  // If it's a known direct-image host pattern
  if (/images\.unsplash\.com|i\.pinimg\.com|lh3\.googleusercontent\.com|cloudinary\.com|imgbb\.com|imgur\.com|staticflickr\.com|cdn\.|media\.|assets\./i.test(trimmed)) return true;
  // If it's our converted Google Drive format
  if (trimmed.includes('drive.google.com/uc?export=view')) return true;
  return false;
};

/**
 * Main utility to get an absolute URL for an image.
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  const trimmed = String(path).trim();

  // Public static frontend assets (e.g. /logo.png, /favicon.png)
  if (trimmed === '/logo.png' || trimmed === 'logo.png' || trimmed.startsWith('/favicon') || trimmed.startsWith('/assets/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
  
  // 1. Try to auto-convert known external page links (Drive, Unsplash, etc.)
  const converted = convertExternalUrl(trimmed);
  if (converted && converted !== trimmed) return converted;

  // 2. Already absolute or protocol-relative
  if (/^(https?:|\/\/|data:)/i.test(trimmed)) {
    return trimmed;
  }

  // 3. Looks like a domain (e.g., "example.com/img.jpg")
  if (/^[a-z0-9-]+\.[a-z0-9-]+/i.test(trimmed) && !trimmed.startsWith('/') && !trimmed.startsWith('uploads/')) {
    return `https://${trimmed}`;
  }

  // 4. Local path — prepend backend base URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const backendBase = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendBase}${cleanPath}`;
};

export const handleImageError = (e, fallbackText = 'Product') => {
  e.target.onerror = null;
  const text = encodeURIComponent(fallbackText);
  e.target.src = `https://placehold.co/400x400/f8fafc/64748b?text=${text}`;
};


