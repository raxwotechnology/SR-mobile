import { create } from 'zustand';

// Safely parse userInfo from localStorage
const getSavedUser = () => {
  try {
    const raw = localStorage.getItem('userInfo');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate that the stored data has required fields
    if (parsed && parsed._id && parsed.token && parsed.role) {
      return parsed;
    }
    // Invalid/corrupted data — remove it
    localStorage.removeItem('userInfo');
    return null;
  } catch (e) {
    // Corrupted JSON — remove it
    localStorage.removeItem('userInfo');
    return null;
  }
};

const initialUser = getSavedUser();

const useAuthStore = create((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,

  login: (userData) => {
    localStorage.setItem('userInfo', JSON.stringify(userData));
    set({ user: userData, isAuthenticated: true });
  },

  setUser: (userData) => {
    localStorage.setItem('userInfo', JSON.stringify(userData));
    set({ user: userData });
  },

  logout: () => {
    // Clear ALL possible auth/session data
    localStorage.removeItem('userInfo');
    sessionStorage.clear();

    // Also clear any cached cart/currency data from this user session
    // (keeps currency preference since it's not user-specific)

    // Reset Zustand state
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
