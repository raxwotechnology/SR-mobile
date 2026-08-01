import { create } from 'zustand';
import { getSettings } from '../services/api';

/**
 * Converts a path (relative or absolute) to a fully-accessible URL.
 * - If already a full URL → return as-is
 * - If relative like /uploads/img.png → prefix with backend base URL
 */
export const toAbsoluteUrl = (path) => {
  if (!path) return '';
  if (path === '/logo.png' || path === 'logo.png' || path.startsWith('/favicon') || path.startsWith('/assets/')) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  // If it starts with http/https or looks like an external domain
  const isExternal = path.startsWith('http') || (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9](?:\/.*)?$/i.test(path));
  if (isExternal) {
    if (!path.startsWith('http')) return `https://${path}`;
    return path;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const backendBase = apiUrl.replace(/\/api\/?$/, '');
  // Ensure path starts with /
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${backendBase}${p}`;
};

const toAbsoluteLogoUrl = toAbsoluteUrl;

const useSettingsStore = create((set) => ({
  settings: null,
  loading: false,
  loaded: false,

  fetchSettings: async (force = false) => {
    if (!force && useSettingsStore.getState().loaded) return;
    set({ loading: true });
    try {
      const { data } = await getSettings();
      set({
        settings: {
          ...data,
          // Build accessible logoUrl from relative logo path
          logoUrl: toAbsoluteLogoUrl(data.logo || data.logoUrl),
        },
        loaded: true,
      });
    } catch (err) {
      // keep defaults in UI
    } finally {
      set({ loading: false });
    }
  },

  setSettingsLocal: (settings) => {
    set({
      settings: settings
        ? {
            ...settings,
            logoUrl: toAbsoluteLogoUrl(settings.logo || settings.logoUrl),
          }
        : null,
      loaded: true,
    });
  },
}));

export default useSettingsStore;
