const USER_ID_KEY = "dailyframe_user_id";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;

  const fresh = `user_${window.crypto.randomUUID()}`;
  window.localStorage.setItem(USER_ID_KEY, fresh);
  return fresh;
}
