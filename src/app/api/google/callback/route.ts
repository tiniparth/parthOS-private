import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { setSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Google redirects here after consent. Exchanges the code for tokens and
    stores the refresh token so we can read Gmail going forward. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("g_state")?.value;

  const dash = new URL("/dashboard/mail", req.url);

  if (!code || !state || state !== cookieState) {
    dash.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(dash);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      redirect_uri: env.googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const tok = await tokenRes.json();

  if (tok.refresh_token) {
    await setSetting("gmail_refresh_token", tok.refresh_token);
    dash.searchParams.set("connected", "1");
  } else {
    // No refresh token (already-consented without prompt, or error)
    dash.searchParams.set("error", tok.error || "no_refresh_token");
  }
  return NextResponse.redirect(dash);
}
