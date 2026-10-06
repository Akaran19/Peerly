// Storage wrappers that never throw. `window.localStorage` can be null or throw
// in some environments (in-app webviews, storage disabled, Safari private mode),
// so fall back to an in-memory store instead of crashing the app.

interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function resolveStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    const storage = typeof window !== 'undefined' ? window[name] : null;
    if (!storage) return null;
    const probe = '__peerly_storage_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function createSafeStorage(name: 'localStorage' | 'sessionStorage'): SimpleStorage {
  const memory = new Map<string, string>();
  let backing: Storage | null | undefined;
  const getBacking = () => {
    if (backing === undefined) backing = resolveStorage(name);
    return backing;
  };

  return {
    getItem(key) {
      try {
        const storage = getBacking();
        if (storage) return storage.getItem(key);
      } catch {
        // fall through to memory
      }
      return memory.has(key) ? memory.get(key)! : null;
    },
    setItem(key, value) {
      try {
        const storage = getBacking();
        if (storage) {
          storage.setItem(key, value);
          return;
        }
      } catch {
        // fall through to memory
      }
      memory.set(key, value);
    },
    removeItem(key) {
      try {
        getBacking()?.removeItem(key);
      } catch {
        // ignore
      }
      memory.delete(key);
    },
  };
}

export const safeLocalStorage = createSafeStorage('localStorage');
export const safeSessionStorage = createSafeStorage('sessionStorage');
