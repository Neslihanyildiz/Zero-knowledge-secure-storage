"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Check, X, KeyRound, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import {
  generateSalt,
  saltToBase64,
  base64ToSalt,
  deriveWrappingKey,
  rewrapPrivateKey,
} from "@/lib/keyWrapping";
import {
  checkPasswordStrength,
  isPasswordValid,
  PASSWORD_RULES,
} from "@/lib/passwordStrength";

export default function SettingsPage() {
  const { encryptedPrivateKey, keySalt, setEncryptedKey } = useAuthStore();

  const [currentPassword, setCurrentPassword]     = useState("");
  const [newPassword, setNewPassword]             = useState("");
  const [confirmPassword, setConfirmPassword]     = useState("");
  const [showCurrent, setShowCurrent]             = useState(false);
  const [showNew, setShowNew]                     = useState(false);
  const [showConfirm, setShowConfirm]             = useState(false);
  const [loading, setLoading]                     = useState(false);
  const [status, setStatus]                       = useState<{ type: "success" | "error"; message: string } | null>(null);

  const strength   = checkPasswordStrength(newPassword);
  const barWidth   = strength.score === 0 ? 0 : Math.round((strength.score / 6) * 100);
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit  =
    currentPassword.length > 0 &&
    isPasswordValid(newPassword) &&
    passwordsMatch &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!passwordsMatch) {
      setStatus({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setStatus({ type: "error", message: "New password does not meet the requirements." });
      return;
    }

    setLoading(true);
    try {
      if (!encryptedPrivateKey || !keySalt) {
        throw new Error("Encryption key not found in this session. Please log out and back in.");
      }

      // 1. Derive the old wrapping key from the current password
      const oldSalt       = base64ToSalt(keySalt);
      const oldKey        = await deriveWrappingKey(currentPassword, oldSalt);

      // 2. Try to re-wrap with the old key — this verifies the current password.
      //    rewrapPrivateKey will throw a DOMException if decryption fails (wrong password).
      const newSaltBytes  = generateSalt();
      const newKey        = await deriveWrappingKey(newPassword, newSaltBytes);
      let newEncryptedKey: string;
      try {
        newEncryptedKey = await rewrapPrivateKey(encryptedPrivateKey, oldKey, newKey);
      } catch {
        throw new Error("Current password is incorrect.");
      }

      const newSalt = saltToBase64(newSaltBytes);

      // 3. Send to server — server verifies current password via bcrypt, then persists
      await api.changePassword({ currentPassword, newPassword, newEncryptedKey, newSalt });

      // 4. Update the local auth store so subsequent password changes work without re-login
      setEncryptedKey(newEncryptedKey, newSalt);

      setStatus({ type: "success", message: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-navy-900 mb-2 flex items-center gap-3">
          <KeyRound className="w-8 h-8" />
          Account Settings
        </h1>
        <p className="text-navy-600">Manage your password and encryption keys.</p>
      </div>

      {/* Change Password card */}
      <div className="card p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-navy-100">
          <ShieldCheck className="w-5 h-5 text-navy-700" />
          <h2 className="text-lg font-bold text-navy-900">Change Password</h2>
        </div>

        <div className="px-4 py-3 rounded-xl bg-navy-50 border border-navy-200 text-navy-600 text-xs leading-relaxed">
          Your encryption keys are re-wrapped client-side with the new password before anything
          is sent to the server. The raw private key never leaves your browser.
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current password */}
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
              <input
                className="input pl-10 pr-10"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
              <input
                className="input pl-10 pr-10"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong new password"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {newPassword.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-navy-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${strength.color}`}>
                    {strength.label}
                  </span>
                </div>
                <ul className="space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const passed = strength.passedRules.includes(rule.id);
                    return (
                      <li key={rule.id} className="flex items-center gap-2 text-xs">
                        {passed
                          ? <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          : <X     className="w-3.5 h-3.5 text-red-400   flex-shrink-0" />}
                        <span className={passed ? "text-green-700" : "text-navy-500"}>
                          {rule.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
              <input
                className="input pl-10 pr-10"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Passwords do not match.
              </p>
            )}
          </div>

          {/* Status message */}
          {status && (
            <div
              className={`px-4 py-3 rounded-xl border text-sm flex items-start gap-2 ${
                status.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {status.type === "success"
                ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <X     className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 bg-navy-900 text-white rounded-xl font-semibold text-sm hover:bg-navy-700 transition-colors shadow-navy-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Re-wrapping keys…" : "Save New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
