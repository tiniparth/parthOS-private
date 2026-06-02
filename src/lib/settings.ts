/* Tiny key/value settings store (Supabase `settings` table). Used for the
   switchable brain (which Gemini model is active). Resilient: if the table
   doesn't exist yet, reads fall back to the env default. */
import { db } from "./supabase";
import { env } from "./env";

export const MODELS = {
  fast: "gemini-2.5-flash-lite", // ~1000/day free — daily driver
  smart: "gemini-2.5-flash", // ~20/day free — meaty tasks
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await db().from("settings").select("value").eq("key", key).limit(1);
  if (error) return null;
  return data?.[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<boolean> {
  const { error } = await db()
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  return !error;
}

export async function getActiveModel(): Promise<string> {
  return (await getSetting("model")) || env.geminiModel();
}
