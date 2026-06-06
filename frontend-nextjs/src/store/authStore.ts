// src/store/authStore.ts
import { create } from "zustand";
import { User } from "@/lib/types";

interface AuthStore {
  user: User | null;
  /** Server-stored encrypted private key (IV embedded). Persisted for password-change flow. */
  encryptedPrivateKey: string | null;
  /** PBKDF2 salt used to wrap the private key (base64). */
  keySalt: string | null;
  setUser: (user: User | null) => void;
  setEncryptedKey: (encryptedPrivateKey: string | null, keySalt: string | null) => void;
  logout: () => void;
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:                load<User | null>("user", null),
  encryptedPrivateKey: load<string | null>("encryptedPrivateKey", null),
  keySalt:             load<string | null>("keySalt", null),

  setUser: (user) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
    set({ user });
  },

  setEncryptedKey: (encryptedPrivateKey, keySalt) => {
    if (encryptedPrivateKey !== null) {
      localStorage.setItem("encryptedPrivateKey", JSON.stringify(encryptedPrivateKey));
    } else {
      localStorage.removeItem("encryptedPrivateKey");
    }
    if (keySalt !== null) {
      localStorage.setItem("keySalt", JSON.stringify(keySalt));
    } else {
      localStorage.removeItem("keySalt");
    }
    set({ encryptedPrivateKey, keySalt });
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("encryptedPrivateKey");
    localStorage.removeItem("keySalt");
    set({ user: null, encryptedPrivateKey: null, keySalt: null });
  },
}));
