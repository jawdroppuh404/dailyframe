export const APP_BASE_PATH = "/dailyframe";

export function appPath(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? APP_BASE_PATH : `${APP_BASE_PATH}${normalized}`;
}

export function publicAppUrl(requestUrl: string) {
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return `${new URL(requestUrl).origin}${APP_BASE_PATH}`;
}
