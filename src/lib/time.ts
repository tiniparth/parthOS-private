import { env } from "./env";

/** Today's date in the assistant's timezone, as YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: env.tz() }).format(new Date());
}
