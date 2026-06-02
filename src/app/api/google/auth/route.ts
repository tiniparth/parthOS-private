import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isAuthed } from "@/lib/auth";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kicks off Gmail OAuth (read-only). Only Parth (dashboard cookie) can start it. */
export async function GET(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.redirect(new URL("/login", req.url));

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: env.googleClientId(),
    redirect_uri: env.googleRedirectUri(),
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar.events", // read + create/move events
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file", // create Docs the app generates
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/spreadsheets", // read + write sheets
    ].join(" "),
    access_type: "offline",
    prompt: "consent", // force a refresh_token on every connect
    state,
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set("g_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
