/* Create a Google Doc from HTML (Drive converts it). Needs drive.file scope. */
import { googleAccessToken } from "./google";

export async function createDoc(title: string, html: string): Promise<string | null> {
  const token = await googleAccessToken();
  if (!token) return null;

  const boundary = "parthOSdocboundary";
  const meta = JSON.stringify({ name: title, mimeType: "application/vnd.google-apps.document" });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  if (!res.ok) {
    console.error("createDoc error:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const j = await res.json();
  return j.webViewLink ?? null;
}
