/* Dead-simple single-user passcode auth for the dashboard.
   Login sets an httpOnly cookie = sha256(passcode); pages compare against the
   hash of the configured passcode. No raw passcode stored in the cookie. */
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { env } from "./env";

export const AUTH_COOKIE = "pos_auth";

export function token(passcode: string): string {
  return createHash("sha256").update(passcode).digest("hex");
}

export async function isAuthed(): Promise<boolean> {
  const c = (await cookies()).get(AUTH_COOKIE)?.value;
  return !!c && c === token(env.dashboardPasscode());
}
