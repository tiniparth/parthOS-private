/* Shared Google OAuth token helper (Gmail + Calendar share one refresh token). */
import { env } from "./env";
import { getSetting } from "./settings";

export async function googleConnected(): Promise<boolean> {
  return !!(await getSetting("gmail_refresh_token"));
}

export async function googleAccessToken(): Promise<string | null> {
  const refresh = await getSetting("gmail_refresh_token");
  if (!refresh) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json();
  return j.access_token ?? null;
}
