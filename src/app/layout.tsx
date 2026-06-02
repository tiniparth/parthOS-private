import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Parth OS",
  description: "Parth's personal assistant",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" as const, title: "Parth OS" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
