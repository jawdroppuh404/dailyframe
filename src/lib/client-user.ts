const USER_ID_KEY = "dailyframe_user_id";

export function getLegacyUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID_KEY);
}

export function clearLegacyUserId() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(USER_ID_KEY);
  }
}
