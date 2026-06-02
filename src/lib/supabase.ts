/* Server-side Supabase client.

   Uses the SECRET (service_role) key, so it must NEVER be imported into a
   client component. All DB access in Parth OS happens inside API routes /
   server code, so a single admin client is the simplest correct choice
   (it bypasses RLS; the tables have RLS on with no anon policies). */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let _client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.supabaseUrl(), env.supabaseSecret(), {
      auth: { persistSession: false },
    });
  }
  return _client;
}
