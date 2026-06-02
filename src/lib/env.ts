/* Centralized, validated access to environment variables.
   Throws early with a clear message if a required var is missing. */

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  telegramToken: () => req("TELEGRAM_BOT_TOKEN"),
  webhookSecret: () => req("TELEGRAM_WEBHOOK_SECRET"),
  allowedChatId: () => process.env.ALLOWED_CHAT_ID ?? "",
  groqKey: () => req("GROQ_API_KEY"),
  brainModel: () => process.env.BRAIN_MODEL || "openai/gpt-oss-120b",
  geminiKey: () => req("GEMINI_API_KEY"),
  geminiModel: () => process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
  supabaseUrl: () => req("SUPABASE_URL"),
  supabaseSecret: () => req("SUPABASE_SECRET_KEY"),
  cronSecret: () => req("CRON_SECRET"),
  dashboardPasscode: () => req("DASHBOARD_PASSCODE"),
  googleClientId: () => req("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => req("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: () => process.env.GOOGLE_REDIRECT_URI || "https://parth-os-liard.vercel.app/api/google/callback",
  tz: () => process.env.ASSISTANT_TZ || "Asia/Kolkata",
};
