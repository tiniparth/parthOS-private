/* Google Sheets (read + write). Shares the Google refresh token.
   Wired and ready; surfaces (e.g. push expenses to a named sheet) get hooked up
   once Parth points us at a specific spreadsheet. */
import { googleAccessToken } from "./google";

export async function readRange(spreadsheetId: string, range: string): Promise<string[][]> {
  const token = await googleAccessToken();
  if (!token) return [];
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const j = await res.json();
  return j.values ?? [];
}

export async function appendRow(spreadsheetId: string, range: string, values: (string | number)[]): Promise<boolean> {
  const token = await googleAccessToken();
  if (!token) return false;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    }
  );
  return res.ok;
}
