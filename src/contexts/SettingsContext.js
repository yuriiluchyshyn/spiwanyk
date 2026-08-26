import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from 'react';

/**
 * Lightweight per-device user preferences, persisted to localStorage. Kept
 * client-side so no backend/user-model changes are needed. Currently:
 *  - autoScroll: when a songbook is open and someone else starts a song, scroll
 *    the page to that song automatically.
 */
const SettingsContext = createContext();

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};

const STORAGE_KEY = 'spivanyk.settings';

const DEFAULT_SETTINGS = {
  autoScroll: true
};

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = { settings, updateSetting };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
