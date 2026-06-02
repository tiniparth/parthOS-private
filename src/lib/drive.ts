/* Google Drive (read-only) + Docs read. Shares the Google refresh token. */
import { googleAccessToken } from "./google";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  link: string;
  modified: string;
}

export async function searchFiles(query: string, max = 10): Promise<DriveFile[]> {
  const token = await googleAccessToken();
  if (!token) return [];
  // Full-text + name search, newest first, skip trashed.
  const q = `(name contains '${query.replace(/'/g, "")}' or fullText contains '${query.replace(/'/g, "")}') and trashed = false`;
  const params = new URLSearchParams({
    q,
    pageSize: String(max),
    orderBy: "modifiedTime desc",
    fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.files ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    link: f.webViewLink,
    modified: f.modifiedTime,
  }));
}

/** Plain-text content of a Google Doc (or a text file), truncated. */
export async function readDocText(fileId: string, max = 12000): Promise<string> {
  const token = await googleAccessToken();
  if (!token) return "";
  // Google Docs → export as text/plain.
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return "";
  const text = await res.text();
  return text.slice(0, max);
}
