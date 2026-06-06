// src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// ── Response types ─────────────────────────────────────────────────────────

interface RegisterResponse {
  message: string;
  userId: number;
  error?: string;
}

interface LoginResponse {
  message: string;
  /** PBKDF2-wrapped RSA private key (base64) — null for accounts created before this feature */
  encrypted_private_key?: string | null;
  /** PBKDF2 salt used when wrapping (base64) */
  key_salt?: string | null;
  user: {
    id: number;
    username: string;
    public_key: string;
    role: import("@/lib/types").UserRole;
  };
  error?: string;
}

interface UploadResponse {
  message: string;
  fileId?: number;
  error?: string;
}

interface ShareResponse {
  message: string;
  error?: string;
}

/** Signed URL returned by the download endpoint */
interface DownloadResponse {
  url: string;
  filename: string;
  error?: string;
}

// Single source of truth — types live in types.ts, re-exported here for convenience
import type { User, FileData, SharedFile, AuditLog } from "@/lib/types";
export type { User, FileData, SharedFile, AuditLog };

// ── Central fetch wrapper ──────────────────────────────────────────────────
// All authenticated calls go through here. A 401 means the session cookie has
// expired; redirect to the login page with an ?expired flag so the UI can show
// a "session expired" message.

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/?expired=1";
    throw new Error("Session expired");
  }
  return res;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const api = {
  // POST /api/auth/register
  register: async (
    username: string,
    password: string,
    publicKey: string,
    encryptedPrivateKey: string,
    keySalt: string,
  ): Promise<RegisterResponse> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, publicKey, encryptedPrivateKey, keySalt }),
    });
    return res.json();
  },

  // POST /api/auth/login  — server sets httpOnly cookie on success
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Login failed");
    }
    return res.json();
  },

  // POST /api/auth/logout  — clears the httpOnly cookie
  logout: async (): Promise<void> => {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => { /* best-effort */ });
  },

  // PUT /api/users/change-password  — re-wraps private key under new password client-side
  changePassword: async (body: {
    currentPassword: string;
    newPassword: string;
    newEncryptedKey: string;
    newSalt: string;
  }): Promise<void> => {
    const res = await apiFetch(`${API_URL}/users/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || "Password change failed");
    }
  },

  // PATCH /api/auth/keys  — upload freshly-generated RSA keys (after password reset)
  updateKeys: async (
    publicKey: string,
    encryptedPrivateKey: string,
    keySalt: string,
  ): Promise<void> => {
    const res = await apiFetch(`${API_URL}/auth/keys`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey, encryptedPrivateKey, keySalt }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Key update failed");
    }
  },

  // DELETE /api/files/:fileId  (owner only)
  deleteFile: async (fileId: number): Promise<void> => {
    const res = await apiFetch(`${API_URL}/files/${fileId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Delete failed");
    }
  },

  // POST /api/files/upload  (multipart — 'file' + 'encryptedKey' + 'encryptedFilename' fields)
  uploadFile: async (formData: FormData): Promise<UploadResponse> => {
    const res = await apiFetch(`${API_URL}/files/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Upload failed");
    }
    return res.json();
  },

  // GET /api/files/list  → FileData[] (each item includes encrypted_key)
  getFiles: async (): Promise<FileData[]> => {
    const res = await apiFetch(`${API_URL}/files/list`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // GET /api/files/download/:fileId  → signed URL (60-second expiry)
  getDownloadUrl: async (fileId: number): Promise<DownloadResponse> => {
    const res = await apiFetch(`${API_URL}/files/download/${fileId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Download failed");
    }
    return res.json();
  },

  // GET /api/files/logs
  getLogs: async (): Promise<AuditLog[]> => {
    const res = await apiFetch(`${API_URL}/files/logs`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // GET /api/files/users  (all users except current)
  getUsersList: async (): Promise<User[]> => {
    const res = await apiFetch(`${API_URL}/files/users`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // POST /api/files/share  (fromUserId comes from JWT on server)
  shareFile: async (
    fileId: number,
    toUserId: number,
    encryptedKey: string,
  ): Promise<ShareResponse> => {
    const res = await apiFetch(`${API_URL}/files/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, toUserId, encryptedKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Share failed");
    }
    return res.json();
  },

  // GET /api/files/shared  → SharedFile[] (files shared WITH current user)
  getSharedFiles: async (): Promise<SharedFile[]> => {
    const res = await apiFetch(`${API_URL}/files/shared`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },
};
